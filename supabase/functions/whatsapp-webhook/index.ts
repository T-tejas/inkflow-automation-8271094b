import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatbotRule {
  id: string;
  keywords: string[];
  reply_text: string;
  is_active: boolean;
  priority: number;
}

/** Find the best matching chatbot rule for a message */
function findMatchingRule(messageText: string, rules: ChatbotRule[]): ChatbotRule | null {
  const lower = messageText.toLowerCase().trim();
  // Sort by priority desc
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (!rule.is_active) continue;
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return rule;
      }
    }
  }
  return null;
}

/** Send an auto-reply via the Meta API */
async function sendAutoReply(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  replyText: string
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "text",
    text: { body: replyText },
  };
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

/** Resolve phone number ID from WABA */
async function resolvePhoneNumberId(wabaId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result?.data?.[0]?.id || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Meta webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    let verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "lovable_webhook_verify";
    try {
      const { data } = await supabase
        .from("whatsapp_settings")
        .select("setting_value")
        .eq("setting_key", "webhook_verify_token")
        .single();
      if (data?.setting_value) verifyToken = data.setting_value;
    } catch { /* use fallback */ }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Process incoming webhook (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[webhook] Payload:", JSON.stringify(body).slice(0, 2000));

      const entries = body?.entry || [];

      // Pre-load chatbot rules and credentials for auto-reply
      const { data: rulesData } = await supabase
        .from("chatbot_rules")
        .select("*")
        .eq("is_active", true);
      const chatbotRules: ChatbotRule[] = rulesData || [];

      // Load WhatsApp credentials for auto-reply
      const { data: settingsData } = await supabase
        .from("whatsapp_settings")
        .select("setting_key, setting_value");
      const settingsMap: Record<string, string> = {};
      if (settingsData) {
        for (const row of settingsData) {
          if (row.setting_value) settingsMap[row.setting_key] = row.setting_value;
        }
      }

      const accessToken = settingsMap["access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const wabaId = settingsMap["whatsapp_business_account_id"];
      const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      const chatbotEnabled = settingsMap["chatbot_enabled"] !== "false"; // default on

      // Resolve phone number ID for auto-reply
      let phoneNumberId: string | null = null;
      if (wabaId && accessToken) {
        phoneNumberId = await resolvePhoneNumberId(wabaId, accessToken);
      }
      if (!phoneNumberId && envPhoneId) {
        phoneNumberId = envPhoneId;
      }

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          // Handle delivery status updates
          const statuses = value?.statuses || [];
          for (const statusUpdate of statuses) {
            const metaMessageId = statusUpdate.id;
            const status = statusUpdate.status;
            const timestamp = statusUpdate.timestamp;

            const updateData: Record<string, unknown> = { delivery_status: status };

            if (status === "delivered") {
              updateData.delivered_at = new Date(parseInt(timestamp) * 1000).toISOString();
            } else if (status === "read") {
              updateData.read_at = new Date(parseInt(timestamp) * 1000).toISOString();
            } else if (status === "failed") {
              const errorInfo = statusUpdate?.errors?.[0];
              updateData.error_message = errorInfo?.title || errorInfo?.message || "Delivery failed";
              updateData.status = "failed";
            }

            await supabase
              .from("whatsapp_messages")
              .update(updateData)
              .eq("meta_message_id", metaMessageId);

            console.log(`[webhook] Status: ${metaMessageId} → ${status}`);
          }

          // Handle incoming messages
          const messages = value?.messages || [];
          const contacts = value?.contacts || [];

          for (const message of messages) {
            const senderPhone = message.from;
            const messageText = message?.text?.body || message?.button?.text || "";
            const contactInfo = contacts.find((c: any) => c.wa_id === senderPhone);
            const senderName = contactInfo?.profile?.name || `WhatsApp ${senderPhone}`;

            console.log(`[webhook] Incoming from ${senderName} (${senderPhone}): ${messageText}`);

            // Upsert lead
            const { data: existingLeads } = await supabase
              .from("leads")
              .select("id, notes")
              .eq("phone", `+${senderPhone}`)
              .limit(1);

            let leadId: string | null = null;

            if (existingLeads && existingLeads.length > 0) {
              leadId = existingLeads[0].id;
              const lead = existingLeads[0];
              const updatedNotes = `${lead.notes ? lead.notes + "\n" : ""}[WA ${new Date().toLocaleDateString("en-IN")}] ${messageText}`.slice(0, 2000);
              await supabase
                .from("leads")
                .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
                .eq("id", lead.id);
            } else {
              const { data: newLead, error } = await supabase
                .from("leads")
                .insert({
                  full_name: senderName,
                  phone: `+${senderPhone}`,
                  source: "WhatsApp",
                  whatsapp_opt_in: true,
                  status: "New Lead",
                  tags: ["whatsapp_inquiry"],
                  notes: `[WA ${new Date().toLocaleDateString("en-IN")}] ${messageText}`,
                })
                .select()
                .single();
              if (!error && newLead) {
                leadId = newLead.id;
                console.log(`[webhook] Auto-created lead: ${newLead.id}`);
              }
            }

            // Check chatbot auto-reply
            let isEscalated = false;
            let autoReplied = false;

            if (chatbotEnabled && messageText && chatbotRules.length > 0) {
              const matchedRule = findMatchingRule(messageText, chatbotRules);

              if (matchedRule && phoneNumberId && accessToken) {
                console.log(`[webhook] Chatbot matched rule: ${matchedRule.keywords.join(",")} → sending auto-reply`);
                const replyMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, matchedRule.reply_text);

                // Log auto-reply message
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "chatbot_auto_reply",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: replyMsgId,
                  message_body: `🤖 ${matchedRule.reply_text}`,
                });
                autoReplied = true;
              } else if (!matchedRule) {
                // No rule matched — escalate to staff
                isEscalated = true;
                console.log(`[webhook] No chatbot rule matched, escalating to staff`);
              }
            }

            // Log incoming message
            await supabase.from("whatsapp_messages").insert({
              lead_phone: `+${senderPhone}`,
              lead_name: senderName,
              lead_id: leadId,
              template_name: "incoming",
              template_type: "incoming",
              status: "received",
              meta_message_id: message.id,
              message_body: messageText || null,
              is_escalated: isEscalated,
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[webhook] Error:", err instanceof Error ? err.message : err);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
