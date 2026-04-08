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

function calculateLeadScore(data: Record<string, string>): string {
  const budget = (data.budget || "").toLowerCase();
  const hasHighBudget = budget.includes("25k") || budget.includes("25,000") || budget.includes("10k") || budget.includes("10,000");
  if (hasHighBudget && data.tattoo_idea && data.placement) return "HOT";
  const filled = Object.values(data).filter(v => v && v.trim()).length;
  if (filled >= 3) return "WARM";
  return "COLD";
}

// ─── Resolve display name: name → username → fallback ───────────────
function resolveDisplayName(name?: string, username?: string): string {
  if (name && name.trim() && name !== "Instagram User") return name.trim();
  if (username && username.trim()) return `@${username.trim()}`;
  return "Instagram User";
}

async function sendInstagramMessage(pageAccessToken: string, recipientId: string, text: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
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
      if (response.ok) {
        return result?.message_id || null;
      }
      const errorCode = result?.error?.code;
      // Don't retry auth/permission errors
      if (errorCode === 190 || errorCode === 10 || errorCode === 200) {
        console.error("[ig-webhook] Auth error, not retrying:", JSON.stringify(result?.error));
        return null;
      }
      console.error(`[ig-webhook] Send failed attempt ${attempt + 1}:`, JSON.stringify(result?.error));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
      }
    } catch (err) {
      console.error(`[ig-webhook] Send error attempt ${attempt + 1}:`, err);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
      }
    }
  }
  return null;
}

async function getUserProfile(pageAccessToken: string, userId: string): Promise<{ name: string; username: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${userId}?fields=name,username`, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
    });
    if (!response.ok) {
      const body = await response.text();
      console.warn(`[ig-webhook] Profile fetch failed for ${userId}: ${body.slice(0, 200)}`);
      return { name: "", username: "" };
    }
    const data = await response.json();
    return { name: data.name || "", username: data.username || "" };
  } catch {
    return { name: "", username: "" };
  }
}

async function matchFAQ(supabase: any, messageText: string): Promise<string | null> {
  if (!messageText.trim()) return null;
  const { data: faqs } = await supabase
    .from("instagram_faq")
    .select("question, answer")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (!faqs || faqs.length === 0) return null;
  const normalizedInput = messageText.trim().toLowerCase();
  for (const faq of faqs) {
    if (faq.question.trim().toLowerCase() === normalizedInput && faq.answer) return faq.answer;
  }
  for (const faq of faqs) {
    const q = faq.question.trim().toLowerCase();
    if ((normalizedInput.includes(q) || q.includes(normalizedInput)) && faq.answer && normalizedInput.length >= 3) return faq.answer;
  }
  return null;
}

async function buildFAQMenu(supabase: any): Promise<string> {
  const { data: faqs } = await supabase
    .from("instagram_faq")
    .select("question")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (!faqs || faqs.length === 0) return "";
  const lines = faqs.map((f: any, i: number) => `${i + 1}. ${f.question}`);
  return "\n\n📋 Quick Questions:\n" + lines.join("\n") + "\n\nJust type the question number or ask directly!";
}

// ─── Check if message was already processed (dedup by meta_message_id) ──
async function isMessageAlreadyProcessed(supabase: any, metaMessageId: string | null): Promise<boolean> {
  if (!metaMessageId) return false;
  const { data } = await supabase
    .from("instagram_messages")
    .select("id")
    .eq("meta_message_id", metaMessageId)
    .limit(1);
  return !!(data && data.length > 0);
}

// ─── Find existing lead by instagram_sender_id or username ──────────
async function findExistingLead(supabase: any, senderId: string, username: string): Promise<any | null> {
  // First try phone field (ig_<senderId>) — most reliable unique identifier
  const { data: bySenderId } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", `ig_${senderId}`)
    .limit(1);
  if (bySenderId && bySenderId.length > 0) return bySenderId[0];

  // Fallback: try by instagram_username
  if (username) {
    const { data: byUsername } = await supabase
      .from("leads")
      .select("*")
      .eq("instagram_username", username)
      .limit(1);
    if (byUsername && byUsername.length > 0) return byUsername[0];
  }

  return null;
}

Deno.serve(async (req) => {
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

    // Log all incoming webhook events
    console.log("[ig-webhook] Payload:", JSON.stringify(payload).slice(0, 1500));
    await supabase.from("system_logs").insert({
      message: "Instagram webhook event received",
      log_type: "info",
      category: "general",
      details: { payload_summary: JSON.stringify(payload).slice(0, 500) },
    });

    const entries = payload?.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry?.messaging || [];
      for (const event of messagingEvents) {
        const senderId = event?.sender?.id;
        const recipientId = event?.recipient?.id;
        const message = event?.message;

        if (!senderId || !message || senderId === recipientId) continue;
        if (message.is_echo) continue;

        const messageText = message?.text || "";
        const messageType = message?.attachments?.[0]?.type || "text";
        const mediaUrl = message?.attachments?.[0]?.payload?.url || null;
        const metaMessageId = message?.mid || null;

        // ─── DEDUP: Skip if this message was already processed ──────
        const alreadyProcessed = await isMessageAlreadyProcessed(supabase, metaMessageId);
        if (alreadyProcessed) {
          console.log(`[ig-webhook] Skipping duplicate message: ${metaMessageId}`);
          await supabase.from("system_logs").insert({
            message: `Duplicate Instagram message skipped: ${metaMessageId}`,
            log_type: "info",
            category: "general",
            details: { meta_message_id: metaMessageId, sender_id: senderId },
          });
          continue;
        }

        // ─── Get user profile with name fallback ────────────────────
        const profile = await getUserProfile(pageAccessToken, senderId);
        const senderName = resolveDisplayName(profile.name, profile.username);
        const senderUsername = profile.username || "";

        console.log(`[ig-webhook] Message from ${senderName} (@${senderUsername}): ${messageText.slice(0, 100)}`);

        // ─── Find or Create Lead (DEDUP by senderId + username) ─────
        let lead = await findExistingLead(supabase, senderId, senderUsername);
        let leadId: string | null = lead?.id || null;

        if (lead) {
          // Update existing lead if name was missing or is generic
          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if ((!lead.full_name || lead.full_name === "Instagram User" || lead.full_name.startsWith("@")) && profile.name && profile.name.trim()) {
            updates.full_name = profile.name.trim();
          }
          if (senderUsername && (!lead.instagram_username || lead.instagram_username === senderId)) {
            updates.instagram_username = senderUsername;
          }
          await supabase.from("leads").update(updates).eq("id", leadId);
          console.log(`[ig-webhook] Existing lead found: ${leadId} (${lead.full_name})`);
        } else {
          // Create new lead
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
            await supabase.from("system_logs").insert({
              message: `Failed to create Instagram lead: ${senderName} (@${senderUsername})`,
              log_type: "error",
              category: "general",
              details: { senderId, error: leadError.message },
            });
          } else {
            lead = newLead;
            leadId = newLead?.id || null;

            if (leadId) {
              await supabase.from("lead_interactions").insert({
                lead_id: leadId,
                action_type: "lead_created",
                new_value: "Instagram DM",
                note: `Auto-created from Instagram DM. Username: @${senderUsername || senderId}`,
              });
              console.log(`[ig-webhook] New lead created: ${leadId}`);
            }
          }
        }

        // ─── Store Incoming Message ─────────────────────────────────
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

        // ─── Bot Logic ──────────────────────────────────────────────
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

        if (!currentState?.bot_enabled) {
          console.log(`[ig-webhook] Bot disabled for ${senderId}, skipping auto-reply`);
          await supabase.from("instagram_messages")
            .update({ is_escalated: true })
            .eq("meta_message_id", metaMessageId);
          continue;
        }

        if (lead && lead.bot_enabled === false) {
          console.log(`[ig-webhook] Lead bot disabled for ${senderName}, skipping`);
          continue;
        }

        // ─── FAQ Check (BEFORE qualification flow) ──────────────────
        const faqAnswer = await matchFAQ(supabase, messageText);
        if (faqAnswer) {
          console.log(`[ig-webhook] FAQ match for: ${messageText.slice(0, 50)}`);
          const metaMsgId = await sendInstagramMessage(pageAccessToken, senderId, faqAnswer);
          await supabase.from("instagram_messages").insert({
            lead_id: leadId,
            lead_name: "F19 Bot",
            instagram_username: senderUsername || senderId,
            instagram_sender_id: senderId,
            message_body: faqAnswer,
            message_type: "text",
            direction: "outgoing",
            status: metaMsgId ? "sent" : "failed",
            meta_message_id: metaMsgId,
            error_message: metaMsgId ? null : "Failed to send FAQ reply",
          });
          continue;
        }

        // ─── Process Bot Steps ──────────────────────────────────────
        const step = currentState?.current_step || "greeting";
        const collectedData: Record<string, string> = (currentState?.collected_data as Record<string, string>) || {};
        let replyText = "";
        let nextStep = step;

        if (step === "greeting") {
          const faqMenu = await buildFAQMenu(supabase);
          replyText = GREETING_MESSAGE + faqMenu;
          nextStep = "tattoo_idea";
        } else if (QUALIFICATION_STEPS.includes(step as any)) {
          if (messageText.trim()) {
            collectedData[step] = messageText.trim();
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
            replyText = COMPLETION_MESSAGE;
            nextStep = "completed";

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
          replyText = "";
        }

        if (step === "greeting" || (step === "tattoo_idea" && !collectedData.tattoo_idea && !messageText.trim())) {
          // Already set replyText above
        } else if (step !== "greeting" && step !== "completed" && !replyText) {
          replyText = STEP_QUESTIONS[step] || "";
        }

        // Send auto-reply with retry
        if (replyText) {
          const metaMsgId = await sendInstagramMessage(pageAccessToken, senderId, replyText);

          await supabase.from("instagram_messages").insert({
            lead_id: leadId,
            lead_name: "F19 Bot",
            instagram_username: senderUsername || senderId,
            instagram_sender_id: senderId,
            message_body: replyText,
            message_type: "text",
            direction: "outgoing",
            status: metaMsgId ? "sent" : "failed",
            meta_message_id: metaMsgId,
            error_message: metaMsgId ? null : "Failed to send via Instagram API",
          });

          if (!metaMsgId) {
            await supabase.from("system_logs").insert({
              message: `Instagram bot reply failed for ${senderName} (@${senderUsername})`,
              log_type: "error",
              category: "general",
              lead_id: leadId,
              details: { senderId, step: nextStep, replyText: replyText.slice(0, 200) },
            });
          }
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
