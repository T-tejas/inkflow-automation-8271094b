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

function findMatchingRule(messageText: string, rules: ChatbotRule[]): ChatbotRule | null {
  const lower = messageText.toLowerCase().trim();
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

/** Detect positive intent for booking flow */
function detectPositiveIntent(text: string): boolean {
  const patterns = [
    /\b(haan|haa|ha)\b/i,
    /\b(ho chalel|chalel|chalo)\b/i,
    /\b(i want|want tattoo|want a tattoo|need tattoo)\b/i,
    /\b(kitna charge|kitna hoga|price kya|rate kya|cost)\b/i,
    /\b(karwana hai|karna hai|karana hai|krna hai)\b/i,
    /\b(interested|yes please|sure|ok let's|lets do|book)\b/i,
    /\b(mujhe chahiye|chahiye|lagwana|lagana)\b/i,
    /\b(tattoo banwana|tattoo krwana)\b/i,
  ];
  return patterns.some(p => p.test(text));
}

/** Send interactive button message via Meta API */
async function sendInteractiveButtons(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
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
  if (!response.ok) {
    console.error(`[webhook] Interactive send failed:`, JSON.stringify(result));
  }
  return result?.messages?.[0]?.id || null;
}

/** Send a text auto-reply via the Meta API */
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

/** Fetch media URL from WhatsApp Graph API using media ID */
async function fetchMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mimeType: string; fileName: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      url: data.url || "",
      mimeType: data.mime_type || "",
      fileName: data.sha256 ? `media_${mediaId.slice(-8)}` : `media_${mediaId.slice(-8)}`,
    };
  } catch {
    return null;
  }
}

/** Download media from WhatsApp and upload to Supabase storage */
async function downloadAndStoreMedia(
  mediaUrl: string,
  mimeType: string,
  accessToken: string,
  supabase: any
): Promise<{ publicUrl: string; fileName: string } | null> {
  try {
    const mediaResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaResponse.ok) return null;

    const blob = await mediaResponse.blob();
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const fileName = `wa_media_${Date.now()}.${ext}`;
    const path = `chat/${fileName}`;

    const { error } = await supabase.storage.from("f19").upload(path, blob, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      console.error("[webhook] Storage upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("f19").getPublicUrl(path);
    return { publicUrl: urlData.publicUrl, fileName };
  } catch (err) {
    console.error("[webhook] Media download/store error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
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

      const { data: rulesData } = await supabase
        .from("chatbot_rules")
        .select("*")
        .eq("is_active", true);
      const chatbotRules: ChatbotRule[] = rulesData || [];

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
      const chatbotEnabled = settingsMap["chatbot_enabled"] !== "false";

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
            const msgType = message.type || "text";

            // Extract message text and media info
            let messageText = "";
            let mediaId: string | null = null;
            let messageType = msgType;
            let mediaUrl: string | null = null;
            let fileName: string | null = null;

            if (msgType === "text") {
              messageText = message?.text?.body || "";
              messageType = "text";
            } else if (msgType === "button") {
              messageText = message?.button?.text || "";
              messageType = "text";
            } else if (msgType === "interactive") {
              const btnReply = message?.interactive?.button_reply;
              const listReply = message?.interactive?.list_reply;
              messageText = btnReply?.title || listReply?.title || "";
              messageType = "text";
            } else if (msgType === "image") {
              mediaId = message?.image?.id || null;
              messageText = message?.image?.caption || "📷 Image";
              messageType = "image";
              fileName = `image_${Date.now()}.jpg`;
            } else if (msgType === "video") {
              mediaId = message?.video?.id || null;
              messageText = message?.video?.caption || "🎥 Video";
              messageType = "video";
              fileName = `video_${Date.now()}.mp4`;
            } else if (msgType === "audio" || msgType === "voice") {
              mediaId = message?.audio?.id || message?.voice?.id || null;
              messageText = "🎵 Voice message";
              messageType = "audio";
              fileName = `audio_${Date.now()}.ogg`;
            } else if (msgType === "document") {
              mediaId = message?.document?.id || null;
              messageText = message?.document?.filename || "📄 Document";
              messageType = "document";
              fileName = message?.document?.filename || `document_${Date.now()}`;
            } else if (msgType === "sticker") {
              mediaId = message?.sticker?.id || null;
              messageText = "🏷️ Sticker";
              messageType = "sticker";
              fileName = `sticker_${Date.now()}.webp`;
            } else if (msgType === "location") {
              const loc = message?.location;
              messageText = loc ? `📍 Location: ${loc.latitude}, ${loc.longitude}${loc.name ? ` — ${loc.name}` : ""}` : "📍 Location";
              messageType = "location";
            } else if (msgType === "contacts") {
              const contactName = message?.contacts?.[0]?.name?.formatted_name || "Contact";
              messageText = `👤 Contact: ${contactName}`;
              messageType = "contacts";
            } else if (msgType === "reaction") {
              messageText = `${message?.reaction?.emoji || "👍"} Reaction`;
              messageType = "reaction";
            } else {
              messageText = `[${msgType}]`;
            }

            // Fetch and store media if present
            if (mediaId && accessToken) {
              const mediaInfo = await fetchMediaUrl(mediaId, accessToken);
              if (mediaInfo && mediaInfo.url) {
                const stored = await downloadAndStoreMedia(mediaInfo.url, mediaInfo.mimeType, accessToken, supabase);
                if (stored) {
                  mediaUrl = stored.publicUrl;
                  fileName = stored.fileName;
                }
              }
            }

            const buttonPayloadId = message?.button?.payload || message?.interactive?.button_reply?.id || "";
            const contactInfo = contacts.find((c: any) => c.wa_id === senderPhone);
            const senderName = contactInfo?.profile?.name || `WhatsApp ${senderPhone}`;

            console.log(`[webhook] Incoming from ${senderName} (${senderPhone}): ${messageText} [type: ${messageType}]`);

            // Upsert lead
            const { data: existingLeads } = await supabase
              .from("leads")
              .select("id, notes, bot_enabled")
              .eq("phone", `+${senderPhone}`)
              .limit(1);

            let leadId: string | null = null;
            let botEnabled = true;

            if (existingLeads && existingLeads.length > 0) {
              leadId = existingLeads[0].id;
              botEnabled = existingLeads[0].bot_enabled !== false;
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
                  bot_enabled: true,
                })
                .select()
                .single();
              if (!error && newLead) {
                leadId = newLead.id;
                console.log(`[webhook] Auto-created lead: ${newLead.id}`);
              }
            }

            // Handle "Talk to Human" button click
            if (buttonPayloadId === "talk_to_human" || messageText.toLowerCase().includes("talk to human")) {
              console.log(`[webhook] "Talk to Human" triggered for ${senderPhone}`);
              if (leadId) {
                await supabase
                  .from("leads")
                  .update({ bot_enabled: false, status: "Contacted" })
                  .eq("id", leadId);
              }
              botEnabled = false;

              if (phoneNumberId && accessToken) {
                const confirmMsgId = await sendAutoReply(
                  phoneNumberId, accessToken, senderPhone,
                  "You're now connected to our team! 👨‍💻 One of our artists will get back to you shortly. Hang tight! 🎨"
                );
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "human_handoff",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: confirmMsgId,
                  message_body: "You're now connected to our team! 👨‍💻 One of our artists will get back to you shortly. Hang tight! 🎨",
                  message_type: "text",
                });
              }
            }

            // Chatbot auto-reply
            let isEscalated = false;

            if (chatbotEnabled && botEnabled && messageText && messageType === "text" && buttonPayloadId !== "talk_to_human") {
              // Check for positive intent first
              const hasPositiveIntent = detectPositiveIntent(messageText);
              const matchedRule = findMatchingRule(messageText, chatbotRules);

              if (hasPositiveIntent && phoneNumberId && accessToken) {
                // Warm booking nudge
                const replyText = "That sounds like a great tattoo idea! 🔥 Would you like one of our artists to reach out and help plan it with you?";
                const replyMsgId = await sendInteractiveButtons(
                  phoneNumberId, accessToken, senderPhone,
                  replyText,
                  [
                    { id: "talk_to_human", title: "Yes, connect me! 🙌" },
                    { id: "book_appointment", title: "Book Appointment 📅" },
                    { id: "tattoo_price", title: "Check Prices 💰" },
                  ]
                );
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "chatbot_auto_reply",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: replyMsgId,
                  message_body: replyText,
                  message_type: "text",
                });
              } else if (matchedRule && phoneNumberId && accessToken) {
                console.log(`[webhook] Chatbot matched rule: ${matchedRule.keywords.join(",")}`);
                const replyMsgId = await sendInteractiveButtons(
                  phoneNumberId, accessToken, senderPhone,
                  matchedRule.reply_text,
                  [
                    { id: "talk_to_human", title: "Talk to Human 👨‍💻" },
                    { id: "book_appointment", title: "Book Appointment 📅" },
                    { id: "tattoo_price", title: "Tattoo Price 💰" },
                  ]
                );
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "chatbot_auto_reply",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: replyMsgId,
                  message_body: matchedRule.reply_text,
                  message_type: "text",
                });
              } else if (!matchedRule && !hasPositiveIntent) {
                // No rule matched — send friendly default + escalate
                isEscalated = true;
                if (phoneNumberId && accessToken && chatbotRules.length > 0) {
                  const defaultReply = "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! In the meantime, feel free to ask about pricing, booking, or share your tattoo idea 🎨";
                  const defMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, defaultReply);
                  await supabase.from("whatsapp_messages").insert({
                    lead_phone: `+${senderPhone}`,
                    lead_name: senderName,
                    lead_id: leadId,
                    template_name: "chatbot_auto_reply",
                    template_type: "confirmation",
                    status: "sent",
                    meta_message_id: defMsgId,
                    message_body: defaultReply,
                    message_type: "text",
                  });
                }
                console.log(`[webhook] No chatbot rule matched, escalating to staff`);
              }
            } else if (chatbotEnabled && botEnabled && messageType !== "text" && phoneNumberId && accessToken) {
              // Media message — acknowledge and escalate
              const mediaAck = "Got it! 👍 Our team will check this out and get back to you soon.";
              const ackMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, mediaAck);
              await supabase.from("whatsapp_messages").insert({
                lead_phone: `+${senderPhone}`,
                lead_name: senderName,
                lead_id: leadId,
                template_name: "chatbot_auto_reply",
                template_type: "confirmation",
                status: "sent",
                meta_message_id: ackMsgId,
                message_body: mediaAck,
                message_type: "text",
              });
              isEscalated = true;
            } else if (chatbotEnabled && !botEnabled) {
              console.log(`[webhook] Bot disabled for contact ${senderPhone}, skipping auto-reply`);
              isEscalated = true;
            }

            // Handle "Book Appointment" and "Tattoo Price" button clicks
            if (buttonPayloadId === "book_appointment" && phoneNumberId && accessToken) {
              const bookReply = "Awesome! 📅 To book your session, just share:\n\n1️⃣ Your preferred date\n2️⃣ Tattoo style (Traditional, Realism, Geometric, etc.)\n3️⃣ Size & placement\n\nWe'll lock in your slot! 💪";
              const bookMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, bookReply);
              await supabase.from("whatsapp_messages").insert({
                lead_phone: `+${senderPhone}`,
                lead_name: senderName,
                lead_id: leadId,
                template_name: "chatbot_auto_reply",
                template_type: "confirmation",
                status: "sent",
                meta_message_id: bookMsgId,
                message_body: bookReply,
                message_type: "text",
              });
            }

            if (buttonPayloadId === "tattoo_price" && phoneNumberId && accessToken) {
              const priceReply = "Our pricing depends on the design! 🎨\n\n• Small tattoos start from ₹2,000\n• Medium pieces from ₹5,000\n• Custom large work — let's chat!\n\nShare your design idea or reference pic and we'll give you an exact quote 💰";
              const priceMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, priceReply);
              await supabase.from("whatsapp_messages").insert({
                lead_phone: `+${senderPhone}`,
                lead_name: senderName,
                lead_id: leadId,
                template_name: "chatbot_auto_reply",
                template_type: "confirmation",
                status: "sent",
                meta_message_id: priceMsgId,
                message_body: priceReply,
                message_type: "text",
              });
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
              message_type: messageType,
              media_url: mediaUrl,
              file_name: fileName,
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
