import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUALIFICATION_STEPS = ["tattoo_idea", "placement", "size", "budget"] as const;

const GREETING_MESSAGE = `Hey 👋 Welcome to F19 Tattoo Studio!

We'd love to help you with your tattoo.

Please share:
1. Tattoo idea 🎨
2. Placement
3. Size
4. Budget`;

const STEP_QUESTIONS: Record<string, string> = {
  tattoo_idea: "What tattoo design are you thinking about? 🎨 For example: Name tattoo, Minimal, Portrait, Sleeve, Custom design...",
  placement: "Where would you like the tattoo? For example: Forearm, Wrist, Neck, Back, Chest, Leg...",
  size: "What size are you thinking?\n• Small (1-3 in)\n• Medium (4-6 in)\n• Large (7+ in)\n• Full Sleeve",
  budget: "What's your approximate budget?\n• Under ₹5,000\n• ₹5,000 - ₹10,000\n• ₹10,000 - ₹25,000\n• ₹25,000+",
};

const COMPLETION_MESSAGE = "Thanks! 🎉 Our team will contact you shortly to discuss your tattoo and schedule a consultation. Stay tuned! ✨";

const FOLLOWUP_MESSAGE = "Hey, just checking 😊 Are you still interested in getting a tattoo?";

function calculateLeadScore(data: Record<string, string>): string {
  const budget = (data.budget || "").toLowerCase();
  const hasHighBudget = budget.includes("25k") || budget.includes("25,000") || budget.includes("10k") || budget.includes("10,000");
  if (hasHighBudget && data.tattoo_idea && data.placement) return "HOT";
  const filled = Object.values(data).filter(v => v && v.trim()).length;
  if (filled >= 3) return "WARM";
  return "COLD";
}

async function sendInstagramMessage(pageAccessToken: string, recipientId: string, text: string): Promise<string | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("[ig-webhook] Send message failed:", JSON.stringify(result));
      return null;
    }
    return result?.message_id || null;
  } catch (err) {
    console.error("[ig-webhook] Send message error:", err);
    return null;
  }
}

async function getUserProfile(pageAccessToken: string, userId: string): Promise<{ name: string; username: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${userId}?fields=name,username`, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
    });
    if (!response.ok) return { name: "Instagram User", username: "" };
    const data = await response.json();
    return { name: data.name || "Instagram User", username: data.username || "" };
  } catch {
    return { name: "Instagram User", username: "" };
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── Webhook Verification (GET) ───────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read verify token from DB or use env
    const { data: vtData } = await supabase
      .from("whatsapp_settings")
      .select("setting_value")
      .eq("setting_key", "instagram_webhook_verify_token")
      .single();

    const verifyToken = vtData?.setting_value || Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN") || "f19_instagram_verify";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[ig-webhook] Verification successful");
      return new Response(challenge || "", { status: 200, headers: corsHeaders });
    }
    return new Response("Verification failed", { status: 403, headers: corsHeaders });
  }

  // ─── Incoming Messages (POST) ─────────────────────────────────────────
  if (req.method === "POST") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pageAccessToken = Deno.env.get("INSTAGRAM_PAGE_ACCESS_TOKEN");
    if (!pageAccessToken) {
      console.error("[ig-webhook] INSTAGRAM_PAGE_ACCESS_TOKEN not set");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("[ig-webhook] Payload:", JSON.stringify(payload).slice(0, 1000));

    // Process Instagram messaging events
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry?.messaging || [];
      for (const event of messagingEvents) {
        const senderId = event?.sender?.id;
        const recipientId = event?.recipient?.id;
        const message = event?.message;
        const timestamp = event?.timestamp;

        if (!senderId || !message || senderId === recipientId) continue;

        // Ignore echo messages (messages sent by the page itself)
        if (message.is_echo) continue;

        const messageText = message?.text || "";
        const messageType = message?.attachments?.[0]?.type || "text";
        const mediaUrl = message?.attachments?.[0]?.payload?.url || null;
        const metaMessageId = message?.mid || null;

        // Get user profile
        const profile = await getUserProfile(pageAccessToken, senderId);
        const senderName = profile.name;
        const senderUsername = profile.username;

        console.log(`[ig-webhook] Message from ${senderName} (@${senderUsername}): ${messageText.slice(0, 100)}`);

        // ─── Find or Create Lead ────────────────────────────────────────
        let leadId: string | null = null;
        let lead: any = null;

        // Try to find by instagram_username first
        if (senderUsername) {
          const { data: existingLead } = await supabase
            .from("leads")
            .select("*")
            .eq("instagram_username", senderUsername)
            .limit(1)
            .single();
          if (existingLead) {
            lead = existingLead;
            leadId = existingLead.id;
          }
        }

        // If not found, create new lead
        if (!leadId) {
          const { data: newLead, error: leadError } = await supabase
            .from("leads")
            .insert({
              full_name: senderName,
              phone: `ig_${senderId}`,
              source: "Instagram",
              status: "New Lead",
              instagram_username: senderUsername || senderId,
              whatsapp_opt_in: false,
              tags: ["instagram_inquiry"],
            } as any)
            .select()
            .single();

          if (leadError) {
            console.error("[ig-webhook] Lead creation error:", leadError);
          } else {
            lead = newLead;
            leadId = newLead?.id || null;

            // Log interaction
            if (leadId) {
              await supabase.from("lead_interactions").insert({
                lead_id: leadId,
                action_type: "lead_created",
                new_value: "Instagram DM",
                note: `Auto-created from Instagram DM. Username: @${senderUsername}`,
              });
            }
          }
        }

        // ─── Store Incoming Message ─────────────────────────────────────
        await supabase.from("instagram_messages").insert({
          lead_id: leadId,
          lead_name: senderName,
          instagram_username: senderUsername || senderId,
          instagram_sender_id: senderId,
          message_body: messageText || (mediaUrl ? `[${messageType}]` : "💬 Message"),
          message_type: messageType,
          media_url: mediaUrl,
          direction: "incoming",
          status: "received",
          meta_message_id: metaMessageId,
        });

        // ─── Bot Logic ──────────────────────────────────────────────────
        // Get or create bot state
        const { data: botState } = await supabase
          .from("instagram_bot_state")
          .select("*")
          .eq("instagram_sender_id", senderId)
          .single();

        let currentState = botState;

        if (!currentState) {
          const { data: newState } = await supabase
            .from("instagram_bot_state")
            .insert({
              instagram_sender_id: senderId,
              lead_id: leadId,
              bot_enabled: true,
              current_step: "greeting",
              collected_data: {},
            })
            .select()
            .single();
          currentState = newState;
        }

        // Check if bot is disabled
        if (!currentState?.bot_enabled) {
          console.log(`[ig-webhook] Bot disabled for ${senderId}, skipping auto-reply`);
          // Mark as escalated
          await supabase.from("instagram_messages")
            .update({ is_escalated: true })
            .eq("meta_message_id", metaMessageId);
          continue;
        }

        // Check lead-level bot_enabled
        if (lead && lead.bot_enabled === false) {
          console.log(`[ig-webhook] Lead bot disabled for ${senderName}, skipping`);
          continue;
        }

        // ─── Process Bot Steps ──────────────────────────────────────────
        const step = currentState?.current_step || "greeting";
        const collectedData: Record<string, string> = (currentState?.collected_data as Record<string, string>) || {};
        let replyText = "";
        let nextStep = step;

        if (step === "greeting") {
          replyText = GREETING_MESSAGE;
          nextStep = "tattoo_idea";
        } else if (QUALIFICATION_STEPS.includes(step as any)) {
          // Save the user's answer to the current step
          if (messageText.trim()) {
            collectedData[step] = messageText.trim();

            // Update lead with collected data
            const updateData: Record<string, string> = {};
            if (step === "tattoo_idea") updateData.tattoo_style = messageText.trim();
            if (step === "placement") updateData.placement = messageText.trim();
            if (step === "size") updateData.size = messageText.trim();
            if (step === "budget") updateData.budget = messageText.trim();

            if (leadId && Object.keys(updateData).length > 0) {
              await supabase.from("leads").update({
                ...updateData,
                updated_at: new Date().toISOString(),
              } as any).eq("id", leadId);
            }
          }

          // Find next unfilled step
          const currentIdx = QUALIFICATION_STEPS.indexOf(step as any);
          let foundNext = false;
          for (let i = currentIdx + 1; i < QUALIFICATION_STEPS.length; i++) {
            const s = QUALIFICATION_STEPS[i];
            if (!collectedData[s]) {
              nextStep = s;
              replyText = STEP_QUESTIONS[s];
              foundNext = true;
              break;
            }
          }

          if (!foundNext) {
            // All data collected!
            replyText = COMPLETION_MESSAGE;
            nextStep = "completed";

            // Update lead status and score
            if (leadId) {
              const score = calculateLeadScore(collectedData);
              const tags = ["instagram_inquiry"];
              if (score === "HOT") tags.push("hot_lead");
              if (collectedData.budget) tags.push("budget_mentioned");

              await supabase.from("leads").update({
                status: "Interested",
                lead_score: score,
                tags,
                updated_at: new Date().toISOString(),
              } as any).eq("id", leadId);

              // Create notification
              await supabase.from("crm_notifications").insert({
                lead_id: leadId,
                lead_name: senderName,
                lead_phone: `ig_${senderId}`,
                notification_type: "lead_qualified",
                tattoo_idea: collectedData.tattoo_idea || null,
                placement: collectedData.placement || null,
                size: collectedData.size || null,
                budget: collectedData.budget || null,
                lead_source: "Instagram",
                lead_score: score,
                chat_summary: Object.entries(collectedData).map(([k, v]) => `${k}: ${v}`).join(" | "),
              });
            }
          }
        } else if (step === "completed") {
          // Lead already qualified, don't repeat bot flow
          replyText = "";
        }

        // If there's a reply but we're between greeting and first question
        if (step === "greeting" || (step === "tattoo_idea" && !collectedData.tattoo_idea && !messageText.trim())) {
          // Already set replyText above
        } else if (step !== "greeting" && step !== "completed" && !replyText) {
          replyText = STEP_QUESTIONS[step] || "";
        }

        // Send auto-reply
        if (replyText) {
          const metaMsgId = await sendInstagramMessage(pageAccessToken, senderId, replyText);

          // Log outgoing message
          await supabase.from("instagram_messages").insert({
            lead_id: leadId,
            lead_name: "F19 Bot",
            instagram_username: "f19tattoostudio",
            instagram_sender_id: recipientId || "page",
            message_body: replyText,
            message_type: "text",
            direction: "outgoing",
            status: metaMsgId ? "sent" : "failed",
            meta_message_id: metaMsgId,
            error_message: metaMsgId ? null : "Failed to send via Instagram API",
          });
        }

        // Update bot state
        await supabase.from("instagram_bot_state").update({
          current_step: nextStep,
          collected_data: collectedData,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("instagram_sender_id", senderId);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
