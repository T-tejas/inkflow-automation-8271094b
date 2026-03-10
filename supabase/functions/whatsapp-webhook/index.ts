import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const F19_SYSTEM_PROMPT = `# ROLE
You are **F19 Assistant** — the friendly AI concierge for **F19 Tattoo Studio, Pune**.

Your job is to:
• Talk to potential tattoo clients in a friendly way
• Understand their tattoo idea
• Guide them through simple questions
• Connect interested clients with our tattoo artists

Your goal is to **make clients comfortable and convert them into consultations.**

# LANGUAGE RULE (VERY IMPORTANT)
You must **UNDERSTAND**: Hindi, Marathi, Hinglish, English.
Clients may write in Devanagari, Roman Hindi, or Marathi.
BUT you must **ALWAYS reply in English only.** Never reply in Hindi or Marathi.

# PERSONALITY
You are: Friendly, Helpful, Professional, Short and clear, Easy to talk with.
Avoid robotic responses.
Messages should feel like **a real studio assistant chatting on WhatsApp.**
Use emojis occasionally (🎨🔥✨) but not too many.
Keep replies **under 3 sentences whenever possible.**

# CONVERSATION FLOW
Follow this natural order, asking one question at a time. Never ask multiple questions together.

## STEP 1 — GREETING
Start with a warm welcome.
Example: "Hey! 👋 Thanks for contacting F19 Tattoo Studio. What tattoo idea are you thinking about?"

## STEP 2 — UNDERSTAND THE IDEA (one by one)
1️⃣ Design idea: "What design are you thinking about?"
2️⃣ Style: "Do you have a style in mind — realistic, minimal, geometric, or something else?"
3️⃣ Size: "Are you thinking small, medium, or a larger piece?"
4️⃣ Placement: "Where would you like the tattoo?"
5️⃣ Timeline: "When are you planning to get it done?"
Skip questions if user already answered them.

# CRITICAL: ANTI-REPETITION RULES
1. **NEVER repeat pricing info** if it already appears in the conversation history. If you already said pricing, just say "As I mentioned, our artist can give you an exact quote. Want me to connect you?"
2. **NEVER re-ask a question** the user already answered. Check the conversation history carefully.
3. **NEVER repeat the consultation offer** if you already offered it. If user said yes, move to collecting details.
4. **Track what you've already said.** Read the full conversation before replying.

# POSITIVE INTENT DETECTION (VERY IMPORTANT)
If user says ANY of these (or similar):
"Yes", "Yep", "Sure", "Ok", "Done", "Book appointment", "I want to get the tattoo", "Mujhe karwana hai", "Haan done", "Ho chalel", "Kab aa sakta hoon", "Book karna hai", "Karwana hai", "Haan bro", "Yes please", "Let's do it", "I am interested", "Pakka", "Confirm karo", "Schedule appointment"

Then they are showing **STRONG BOOKING INTENT**. When this happens:
- **STOP asking more tattoo questions** (design, size, placement etc.)
- **Move forward immediately** to connecting them with an artist
- Say something like: "Great! Let me connect you with one of our artists. 🎨"
- The system will automatically show a "Talk to Artist" button — you don't need to handle that.

# IF CLIENT HAS ALREADY AGREED TO ARTIST CONTACT
If the conversation history shows the client already agreed to talk to an artist:
- Do NOT offer consultation again
- Do NOT ask design/size/placement questions again
- Simply confirm: "Our artist will be reaching out to you soon! 🎨 Is there anything else I can help with?"

# DETAIL COLLECTION (after consultation accepted)
If the system needs details and the user has agreed, ask ONE at a time:
1️⃣ "Could I get your full name?"
2️⃣ "Thanks! What phone number should our artist contact you on?"
3️⃣ "Great! Lastly, your email address for confirmation."

# IF CLIENT IS NOT READY
Reply politely: "No worries at all! 😊 You can check our tattoo portfolio here: https://f19tattoo.in/portfolio/ Whenever you're ready, feel free to message us."

# PRICING (ONLY IF ASKED AND NOT ALREADY GIVEN)
If pricing has NOT been mentioned in conversation yet:
• ₹800 per square inch
• ₹4,000 per hour
• ₹25,000 full day session
Reply: "Pricing depends on size and detail. We usually charge ₹800 per sq inch or ₹4,000 per hour. Our artist can give you an exact quote after seeing your idea. Would you like them to contact you?"

If pricing was ALREADY mentioned, say: "Our artist can give you an exact quote based on your design. Want me to connect you? 🎨"

# STUDIO DETAILS
Studio Name: F19 Tattoo Studio
Address: Sangam Chowk, Shop No 5, Vijay Complex, Shastri Nagar, Kothrud, Pune, Maharashtra 411038
Website: https://f19tattoo.in/
Portfolio: https://f19tattoo.in/portfolio/
Phone: +91 7517050600
Email: f19tattoo@gmail.com

# RULES
DO: Be friendly, Keep replies short, Ask one question at a time, Move forward when user shows interest.
DO NOT: Reply in Hindi/Marathi, Ask multiple questions together, Repeat information already given, Loop on the same question, Ask phone/email before consultation is accepted, Sound robotic.`;

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
      fileName: `media_${mediaId.slice(-8)}`,
    };
  } catch {
    return null;
  }
}

async function downloadAndStoreMedia(
  mediaUrl: string, mimeType: string, accessToken: string, supabase: any
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
      contentType: mimeType, upsert: false,
    });
    if (error) { console.error("[webhook] Storage upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("f19").getPublicUrl(path);
    return { publicUrl: urlData.publicUrl, fileName };
  } catch (err) {
    console.error("[webhook] Media download/store error:", err);
    return null;
  }
}

async function sendAutoReply(
  phoneNumberId: string, accessToken: string, recipientPhone: string, replyText: string
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp", to: recipientPhone,
    type: "text", text: { body: replyText },
  };
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

/** Send interactive button message via WhatsApp */
async function sendInteractiveButtons(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  bodyText: string, buttons: { id: string; title: string }[]
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map(b => ({
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
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

/** Detect strong positive intent for artist consultation */
function detectStrongIntent(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const intentPhrases = [
    'i want to book', 'i want to get this tattoo', 'when can i come',
    'book appointment', 'mujhe karwana hai', 'haan done', 'ho chalel',
    'artist se baat karni hai', 'price kitna hai', 'kab aa sakta hoon',
    'book karna hai', 'karwana hai', 'tattoo karwana', 'haan bro',
    'yes i want', 'yes please', 'lets do it', 'i am interested',
    'i want tattoo', 'main karwaunga', 'main karwaungi', 'pakka',
    'confirm karo', 'book karo', 'appointment chahiye', 'slot chahiye',
    'schedule appointment', 'done', 'haan', 'sure',
  ];
  // Also match simple affirmatives
  const exactMatches = ['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'done', 'haan', 'ha', 'ho'];
  const trimmed = lower.trim();
  if (exactMatches.includes(trimmed)) return true;
  return intentPhrases.some(phrase => lower.includes(phrase));
}

/** Check if lead has shared enough details for consultation */
function hasSharedEnoughDetails(notes: string): boolean {
  const lower = (notes || '').toLowerCase();
  let detailCount = 0;
  if (/design|tattoo idea|drawing|image|photo|reference/i.test(lower)) detailCount++;
  if (/small|medium|large|sleeve|inch/i.test(lower)) detailCount++;
  if (/arm|leg|back|chest|wrist|shoulder|neck|ankle|forearm|hand/i.test(lower)) detailCount++;
  if (/week|month|tomorrow|today|asap|jaldi|soon/i.test(lower)) detailCount++;
  return detailCount >= 3;
}

/** Check if "Talk to Artist" button was already sent in conversation */
async function wasArtistButtonAlreadySent(supabase: any, phone: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("lead_phone", phone)
    .eq("template_name", "artist_consultation_button")
    .limit(1);
  return data && data.length > 0;
}

/** Create artist consultation notification and update lead */
async function triggerArtistConsultation(
  supabase: any, leadId: string, leadName: string, leadPhone: string,
  notes: string, lead: any
) {
  // Check if already in Artist Consultation to avoid duplicates
  if (lead?.status === 'Artist Consultation' || lead?.status === 'Booked' || lead?.status === 'Completed') return;

  // Update lead status
  await supabase
    .from('leads')
    .update({ status: 'Artist Consultation', updated_at: new Date().toISOString() })
    .eq('id', leadId);

  // Extract details from notes for notification
  const tattooIdea = notes?.slice(0, 100) || null;

  // Check for existing notification to prevent duplicates
  const { data: existingNotif } = await supabase
    .from('crm_notifications')
    .select('id')
    .eq('lead_id', leadId)
    .eq('notification_type', 'artist_consultation')
    .limit(1);

  if (!existingNotif || existingNotif.length === 0) {
    await supabase.from('crm_notifications').insert({
      lead_id: leadId,
      lead_name: leadName,
      lead_phone: leadPhone,
      notification_type: 'artist_consultation',
      tattoo_idea: tattooIdea,
      placement: lead?.placement || null,
      size: lead?.size || null,
      budget: lead?.budget || null,
      lead_source: lead?.source || 'WhatsApp',
    });
  }

  // Log interaction
  await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    action_type: 'artist_consultation_triggered',
    new_value: 'Artist Consultation',
    note: 'Auto-triggered by positive intent detection',
  });

  console.log(`[webhook] 🔥 Artist Consultation triggered for ${leadName} (${leadPhone})`);
}

/** Call Lovable AI with conversation history for contextual replies */
async function getAIReply(
  conversationHistory: { role: string; content: string }[],
  currentMessage: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[webhook] LOVABLE_API_KEY not configured");
    return "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! 🎨";
  }

  try {
    const messages = [
      { role: "system", content: F19_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user", content: currentMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("[webhook] AI gateway error:", response.status, await response.text());
      return "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! 🎨";
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! 🎨";
    }
    return reply.trim();
  } catch (err) {
    console.error("[webhook] AI call error:", err);
    return "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! 🎨";
  }
}

/** Fetch recent conversation history for a phone number */
async function getConversationHistory(supabase: any, phone: string, limit = 30): Promise<{ role: string; content: string }[]> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("template_type, message_body, message_type, template_name")
    .eq("lead_phone", phone)
    .not("message_body", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  return data
    .filter((m: any) => m.message_body && !m.template_name?.includes('button'))
    .map((m: any) => ({
      role: m.template_type === "incoming" ? "user" : "assistant",
      content: m.message_body,
    }));
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
              .select("id, notes, bot_enabled, status")
              .eq("phone", `+${senderPhone}`)
              .limit(1);

            let leadId: string | null = null;
            let botEnabled = true;
            let leadStatus = "New Lead";

            if (existingLeads && existingLeads.length > 0) {
              leadId = existingLeads[0].id;
              botEnabled = existingLeads[0].bot_enabled !== false;
              leadStatus = existingLeads[0].status;
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
              is_escalated: false,
              message_type: messageType,
              media_url: mediaUrl,
              file_name: fileName,
            });

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
                const confirmReply = "You're now connected to our team! 👨‍💻 One of our artists will get back to you shortly. Hang tight! 🎨";
                const confirmMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, confirmReply);
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "human_handoff",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: confirmMsgId,
                  message_body: confirmReply,
                  message_type: "text",
                });
              }
              continue;
            }

            // Handle "Talk to Artist" button click
            if (buttonPayloadId === "talk_to_artist") {
              console.log(`[webhook] "Talk to Artist" clicked by ${senderPhone}`);
              if (leadId) {
                const { data: freshLead } = await supabase
                  .from("leads")
                  .select("status, notes, placement, size, budget, source")
                  .eq("id", leadId)
                  .single();

                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, freshLead?.notes, freshLead);
              }

              if (phoneNumberId && accessToken) {
                const confirmReply = "Awesome! 🎨 Our artist will reach out to you very soon to discuss your tattoo idea and plan your session. We're excited to create something amazing for you! ✨";
                const confirmMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, confirmReply);
                await supabase.from("whatsapp_messages").insert({
                  lead_phone: `+${senderPhone}`,
                  lead_name: senderName,
                  lead_id: leadId,
                  template_name: "artist_consultation_confirm",
                  template_type: "confirmation",
                  status: "sent",
                  meta_message_id: confirmMsgId,
                  message_body: confirmReply,
                  message_type: "text",
                });
              }
              continue;
            }

            // ---- Artist Consultation Trigger ----
            let intentDetected = false;
            if (leadId && messageText) {
              const { data: freshLead } = await supabase
                .from("leads")
                .select("status, notes, placement, size, budget, source")
                .eq("id", leadId)
                .single();

              const strongIntent = detectStrongIntent(messageText);
              const enoughDetails = hasSharedEnoughDetails(freshLead?.notes || "");
              intentDetected = strongIntent || enoughDetails;

              if (intentDetected && freshLead && freshLead.status !== "Artist Consultation" && freshLead.status !== "Booked" && freshLead.status !== "Completed") {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, freshLead.notes, freshLead);
              }
            }

            // AI-powered auto-reply
            if (chatbotEnabled && botEnabled && messageText && phoneNumberId && accessToken) {
              // Skip AI for reactions
              if (messageType === "reaction") continue;

              // For media messages, acknowledge with context
              let userContent = messageText;
              if (messageType !== "text") {
                userContent = `[Client sent a ${messageType}: ${messageText}]`;
              }

              // Fetch conversation history for context (includes the just-inserted message)
              const history = await getConversationHistory(supabase, `+${senderPhone}`);

              // Remove the last entry since it's the current message we're about to pass separately
              const historyWithoutCurrent = history.slice(0, -1);

              // Get AI reply
              const aiReply = await getAIReply(historyWithoutCurrent, userContent);
              console.log(`[webhook] AI reply to ${senderPhone}: ${aiReply.slice(0, 100)}`);

              // Send AI text reply
              const replyMsgId = await sendAutoReply(phoneNumberId, accessToken, senderPhone, aiReply);
              await supabase.from("whatsapp_messages").insert({
                lead_phone: `+${senderPhone}`,
                lead_name: senderName,
                lead_id: leadId,
                template_name: "chatbot_auto_reply",
                template_type: "confirmation",
                status: "sent",
                meta_message_id: replyMsgId,
                message_body: aiReply,
                message_type: "text",
              });

              // Send "Talk to Artist" button when intent is detected and not already sent
              if (intentDetected && leadStatus !== "Artist Consultation" && leadStatus !== "Booked" && leadStatus !== "Completed") {
                const alreadySent = await wasArtistButtonAlreadySent(supabase, `+${senderPhone}`);
                if (!alreadySent) {
                  const buttonMsgId = await sendInteractiveButtons(
                    phoneNumberId, accessToken, senderPhone,
                    "Would you like one of our artists to contact you? Tap below! 👇",
                    [
                      { id: "talk_to_artist", title: "Talk to Artist 🎨" },
                      { id: "talk_to_human", title: "Talk to Human 👨‍💻" },
                    ]
                  );
                  await supabase.from("whatsapp_messages").insert({
                    lead_phone: `+${senderPhone}`,
                    lead_name: senderName,
                    lead_id: leadId,
                    template_name: "artist_consultation_button",
                    template_type: "confirmation",
                    status: "sent",
                    meta_message_id: buttonMsgId,
                    message_body: "Would you like one of our artists to contact you? Tap below! 👇\n[Talk to Artist 🎨] [Talk to Human 👨‍💻]",
                    message_type: "text",
                  });
                  console.log(`[webhook] 🎨 Sent "Talk to Artist" button to ${senderPhone}`);
                }
              }
            } else if (chatbotEnabled && !botEnabled) {
              console.log(`[webhook] Bot disabled for ${senderPhone}, skipping auto-reply`);
              await supabase
                .from("whatsapp_messages")
                .update({ is_escalated: true })
                .eq("meta_message_id", message.id);
            }
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
