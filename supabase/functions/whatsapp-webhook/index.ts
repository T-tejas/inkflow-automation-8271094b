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
• Guide them through simple questions ONE AT A TIME
• Connect interested clients with our tattoo artists

# LANGUAGE RULE
You UNDERSTAND: Hindi, Marathi, Hinglish, English.
You ALWAYS reply in English only.

# PERSONALITY
Friendly, Helpful, Professional. Keep replies under 3 sentences. Use emojis sparingly (🎨🔥✨).
Messages should feel like a real studio assistant chatting on WhatsApp.

# CRITICAL: QUALIFICATION FLOW
You are guiding the user through a structured qualification. The system tracks which fields are collected.
The system will tell you (via a [SYSTEM NOTE]) which field to ask for next.
Ask ONLY the question the system tells you. Do NOT skip ahead or ask multiple questions.

When told to ask for:
- tattoo_style: "What tattoo design are you thinking about? 🎨 For example: Name tattoo, Minimal, Portrait, Sleeve, Custom design..."
- tattoo_size: (system sends buttons — just add a friendly intro like "Nice choice!")
- tattoo_placement: "Where would you like the tattoo? For example: Forearm, Wrist, Neck, Back, Chest, Leg..."
- timeline: (system sends buttons — just add a friendly lead-in)
- budget: (system sends buttons — just add a friendly lead-in)

When all fields are collected, congratulate them and say our artist will reach out.

# ANTI-REPETITION RULES
1. NEVER repeat pricing info already in conversation history.
2. NEVER re-ask a question the user already answered.
3. NEVER repeat the consultation offer if already offered.
4. Read the full conversation before replying.

# INTERACTIVE BUTTONS CONTEXT
The system automatically sends interactive buttons after your text reply.
Keep your text SHORT and complementary to the buttons, not redundant.

# POSITIVE INTENT DETECTION
If user says: "Yes", "Sure", "Book appointment", "Mujhe karwana hai", "Done", etc.
Move forward — don't ask more qualification questions. System will handle the transition.

# IF CLIENT NOT READY
Reply: "No worries! 😊 Check our portfolio: https://f19tattoo.in/portfolio/ Message us anytime!"

# PRICING (ONLY IF ASKED AND NOT ALREADY GIVEN)
• ₹800/sq inch • ₹4,000/hour • ₹25,000 full day
Then: "Our artist can give you an exact quote. Want me to connect you?"

# STUDIO DETAILS
F19 Tattoo Studio | Sangam Chowk, Kothrud, Pune 411038
Website: https://f19tattoo.in/ | Phone: +91 7517050600

# RULES
DO: Be friendly, Keep replies short, Ask ONE question at a time, Move forward on interest.
DO NOT: Reply in Hindi/Marathi, Ask multiple questions, Repeat info, Loop on same question, Sound robotic.`;

// ─── WhatsApp API Helpers ─────────────────────────────────────────────

async function resolvePhoneNumberId(wabaId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result?.data?.[0]?.id || null;
  } catch { return null; }
}

async function fetchMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mimeType: string; fileName: string } | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    const data = await response.json();
    return { url: data.url || "", mimeType: data.mime_type || "", fileName: `media_${mediaId.slice(-8)}` };
  } catch { return null; }
}

async function downloadAndStoreMedia(mediaUrl: string, mimeType: string, accessToken: string, supabase: any): Promise<{ publicUrl: string; fileName: string } | null> {
  try {
    const mediaResponse = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!mediaResponse.ok) return null;
    const blob = await mediaResponse.blob();
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const fileName = `wa_media_${Date.now()}.${ext}`;
    const path = `chat/${fileName}`;
    const { error } = await supabase.storage.from("f19").upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) { console.error("[webhook] Storage upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("f19").getPublicUrl(path);
    return { publicUrl: urlData.publicUrl, fileName };
  } catch (err) { console.error("[webhook] Media download/store error:", err); return null; }
}

// ─── Message Senders ──────────────────────────────────────────────────

async function sendTextMessage(phoneNumberId: string, accessToken: string, recipientPhone: string, text: string): Promise<string | null> {
  const payload = { messaging_product: "whatsapp", to: recipientPhone, type: "text", text: { body: text } };
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

async function sendInteractiveButtons(phoneNumberId: string, accessToken: string, recipientPhone: string, bodyText: string, buttons: { id: string; title: string }[]): Promise<string | null> {
  const safeButtons = buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } }));
  const payload = { messaging_product: "whatsapp", to: recipientPhone, type: "interactive", interactive: { type: "button", body: { text: bodyText }, action: { buttons: safeButtons } } };
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

async function sendInteractiveList(phoneNumberId: string, accessToken: string, recipientPhone: string, bodyText: string, buttonLabel: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]): Promise<string | null> {
  const payload = { messaging_product: "whatsapp", to: recipientPhone, type: "interactive", interactive: { type: "list", body: { text: bodyText }, action: { button: buttonLabel.slice(0, 20), sections } } };
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result: any = null;
  try { result = await response.json(); } catch { /* ignore */ }
  return result?.messages?.[0]?.id || null;
}

async function logOutgoingMessage(supabase: any, phone: string, name: string, leadId: string | null, templateName: string, body: string, metaMsgId: string | null) {
  await supabase.from("whatsapp_messages").insert({
    lead_phone: phone, lead_name: name, lead_id: leadId,
    template_name: templateName, template_type: "confirmation",
    status: "sent", meta_message_id: metaMsgId, message_body: body, message_type: "text",
  });
}

// ─── Lead Scoring ─────────────────────────────────────────────────────

function calculateLeadScore(lead: any): "HOT" | "WARM" | "COLD" {
  const timeline = (lead?.timeline || "").toLowerCase();
  const budget = (lead?.budget || "").toLowerCase();

  const isHighBudget = budget.includes("10k") || budget.includes("₹10") || budget.includes("5k") || budget.includes("₹5");
  const isThisWeek = timeline.includes("this week") || timeline.includes("week");
  const isThisMonth = timeline.includes("this month") || timeline.includes("month");
  const isExploring = timeline.includes("exploring") || timeline.includes("just");

  if ((isThisWeek || lead?.status === "Booked") && isHighBudget) return "HOT";
  if (isThisWeek) return "HOT";
  if (isThisMonth) return "WARM";
  if (isExploring) return "COLD";

  // Default based on how many details collected
  const fields = [lead?.tattoo_style, lead?.size, lead?.placement, lead?.timeline, lead?.budget];
  const filled = fields.filter(f => f && f !== "" && f !== "Other" && f !== "Medium (4-6 in)").length;
  if (filled >= 4) return "WARM";
  return "COLD";
}

function generateChatSummary(lead: any): string {
  const parts: string[] = [];
  if (lead?.tattoo_style) parts.push(`Style: ${lead.tattoo_style}`);
  if (lead?.size) parts.push(`Size: ${lead.size}`);
  if (lead?.placement) parts.push(`Placement: ${lead.placement}`);
  if (lead?.timeline) parts.push(`Timeline: ${lead.timeline}`);
  if (lead?.budget) parts.push(`Budget: ${lead.budget}`);
  return parts.join(" | ") || "New inquiry";
}

// ─── Qualification State Machine ──────────────────────────────────────

interface QualificationState {
  tattoo_style: string | null;
  size: string | null;
  placement: string | null;
  timeline: string | null;
  budget: string | null;
}

function getQualificationState(lead: any): QualificationState {
  return {
    tattoo_style: lead?.tattoo_style && lead.tattoo_style !== "Other" ? lead.tattoo_style : null,
    size: lead?.size && lead.size !== "Medium (4-6 in)" ? lead.size : null,
    placement: lead?.placement && lead.placement !== "" ? lead.placement : null,
    timeline: lead?.timeline && lead.timeline !== "" ? lead.timeline : null,
    budget: lead?.budget && lead.budget !== "" ? lead.budget : null,
  };
}

function getNextQualificationField(state: QualificationState): keyof QualificationState | null {
  if (!state.tattoo_style) return "tattoo_style";
  if (!state.size) return "size";
  if (!state.placement) return "placement";
  if (!state.timeline) return "timeline";
  if (!state.budget) return "budget";
  return null; // fully qualified
}

function isFullyQualified(state: QualificationState): boolean {
  return getNextQualificationField(state) === null;
}

// ─── Intent Detection ────────────────────────────────────────────────

function detectStrongIntent(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const intentPhrases = [
    'i want to book', 'book appointment', 'mujhe karwana hai', 'haan done', 'ho chalel',
    'artist se baat karni hai', 'kab aa sakta hoon', 'book karna hai', 'karwana hai',
    'tattoo karwana', 'haan bro', 'yes i want', 'yes please', 'lets do it', 'i am interested',
    'main karwaunga', 'main karwaungi', 'pakka', 'confirm karo', 'book karo',
    'appointment chahiye', 'slot chahiye', 'schedule appointment',
  ];
  const exactMatches = ['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'done', 'haan', 'ha', 'ho'];
  const trimmed = lower.trim();
  if (exactMatches.includes(trimmed)) return true;
  return intentPhrases.some(phrase => lower.includes(phrase));
}

function getButtonPayloadId(message: any): string {
  return message?.button?.payload || message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id || "";
}

async function wasTemplateSent(supabase: any, phone: string, templateName: string): Promise<boolean> {
  const { data } = await supabase.from("whatsapp_messages").select("id").eq("lead_phone", phone).eq("template_name", templateName).limit(1);
  return data && data.length > 0;
}

// ─── CRM Actions ─────────────────────────────────────────────────────

async function triggerArtistConsultation(supabase: any, leadId: string, leadName: string, leadPhone: string, lead: any) {
  if (lead?.status === 'Artist Consultation' || lead?.status === 'Booked' || lead?.status === 'Completed') return;

  const leadScore = calculateLeadScore(lead);
  const chatSummary = generateChatSummary(lead);

  await supabase.from('leads').update({
    status: 'Artist Consultation',
    lead_score: leadScore,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId);

  const { data: existingNotif } = await supabase.from('crm_notifications').select('id').eq('lead_id', leadId).eq('notification_type', 'artist_consultation').limit(1);

  if (!existingNotif || existingNotif.length === 0) {
    await supabase.from('crm_notifications').insert({
      lead_id: leadId,
      lead_name: leadName,
      lead_phone: leadPhone,
      notification_type: 'artist_consultation',
      tattoo_idea: lead?.tattoo_style || null,
      placement: lead?.placement || null,
      size: lead?.size || null,
      budget: lead?.budget || null,
      lead_source: lead?.source || 'WhatsApp',
      lead_score: leadScore,
      timeline: lead?.timeline || null,
      chat_summary: chatSummary,
    });
  }

  await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    action_type: 'artist_consultation_triggered',
    new_value: 'Artist Consultation',
    note: `Lead Score: ${leadScore} | ${chatSummary}`,
  });

  console.log(`[webhook] 🔥 Artist Consultation triggered for ${leadName} — Score: ${leadScore}`);
}

async function sendQualifiedLeadNotification(supabase: any, leadId: string, leadName: string, leadPhone: string, lead: any) {
  const leadScore = calculateLeadScore(lead);
  const chatSummary = generateChatSummary(lead);

  await supabase.from('leads').update({ lead_score: leadScore, updated_at: new Date().toISOString() }).eq('id', leadId);

  // Only notify for WARM/HOT
  if (leadScore === "COLD") return;

  const { data: existingNotif } = await supabase.from('crm_notifications').select('id').eq('lead_id', leadId).eq('notification_type', 'lead_qualified').limit(1);
  if (existingNotif && existingNotif.length > 0) return;

  await supabase.from('crm_notifications').insert({
    lead_id: leadId,
    lead_name: leadName,
    lead_phone: leadPhone,
    notification_type: 'lead_qualified',
    tattoo_idea: lead?.tattoo_style || null,
    placement: lead?.placement || null,
    size: lead?.size || null,
    budget: lead?.budget || null,
    lead_source: lead?.source || 'WhatsApp',
    lead_score: leadScore,
    timeline: lead?.timeline || null,
    chat_summary: chatSummary,
  });

  console.log(`[webhook] 📊 Qualified lead notification: ${leadName} — ${leadScore}`);
}

// ─── AI Reply ─────────────────────────────────────────────────────────

async function getConversationHistory(supabase: any, phone: string, limit = 30): Promise<{ role: string; content: string }[]> {
  const { data } = await supabase.from("whatsapp_messages")
    .select("template_type, message_body, message_type, template_name")
    .eq("lead_phone", phone).not("message_body", "is", null)
    .order("created_at", { ascending: true }).limit(limit);
  if (!data) return [];
  return data
    .filter((m: any) => m.message_body && !m.template_name?.startsWith('flow_') && !m.template_name?.startsWith('welcome') && !m.template_name?.startsWith('qual_'))
    .map((m: any) => ({ role: m.template_type === "incoming" ? "user" : "assistant", content: m.message_body }));
}

async function getAIReply(conversationHistory: { role: string; content: string }[], currentMessage: string, systemNote?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "Hey! 👋 Thanks for reaching out to F19 Tattoo Studio. Our team will get back to you soon! 🎨";

  try {
    const messages: any[] = [{ role: "system", content: F19_SYSTEM_PROMPT }];
    if (systemNote) messages.push({ role: "system", content: `[SYSTEM NOTE] ${systemNote}` });
    messages.push(...conversationHistory, { role: "user", content: currentMessage });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, max_tokens: 200 }),
    });

    if (!response.ok) { console.error("[webhook] AI error:", response.status); return "Hey! 👋 Thanks for reaching out. Our team will get back to you soon! 🎨"; }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || "Hey! 👋 Thanks for reaching out. Our team will get back to you soon! 🎨";
  } catch (err) { console.error("[webhook] AI call error:", err); return "Hey! 👋 Thanks for reaching out. Our team will get back to you soon! 🎨"; }
}

// ─── Interactive Flow Handlers ────────────────────────────────────────

async function sendWelcomeMenu(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const bodyText = `Welcome to F19 Tattoo Studio 🔥\nHey ${leadName}! We'd love to help you plan your tattoo.`;
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, bodyText, [
    { id: "menu_price", title: "Get Tattoo Price 💰" },
    { id: "menu_designs", title: "See Tattoo Designs" },
    { id: "menu_artist", title: "Talk to Artist 🎨" },
  ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "welcome_menu", bodyText, msgId);

  const msgId2 = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, "Or jump straight to booking! 📅", [{ id: "menu_book", title: "Book Appointment 📅" }]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "welcome_menu_2", "Or jump straight to booking! 📅", msgId2);
}

async function sendStyleList(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const msgId = await sendInteractiveList(phoneNumberId, accessToken, recipientPhone,
    "Check out our popular tattoo styles! 🎨 Tap below to explore:", "View Styles",
    [{ title: "Tattoo Styles", rows: [
      { id: "style_minimal", title: "Minimal Tattoo", description: "Small, clean & elegant designs" },
      { id: "style_name", title: "Name Tattoo", description: "Stylish lettering & calligraphy" },
      { id: "style_sleeve", title: "Sleeve Tattoo", description: "Full arm tattoo concepts" },
      { id: "style_portrait", title: "Portrait Tattoo", description: "Realistic face & figure art" },
      { id: "style_geometric", title: "Geometric Tattoo", description: "Sharp lines & sacred geometry" },
      { id: "style_traditional", title: "Traditional Tattoo", description: "Bold colors, classic motifs" },
      { id: "style_custom", title: "Custom Design", description: "Unique art made just for you" },
    ]}]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "flow_style_list", "Check out our popular tattoo styles! 🎨", msgId);
}

// Qualification step senders
async function sendSizeButtons(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone,
    "What size tattoo are you thinking? 📐", [
      { id: "qual_size_small", title: "Small" },
      { id: "qual_size_medium", title: "Medium" },
      { id: "qual_size_large", title: "Large" },
    ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "qual_size", "What size tattoo? [Small] [Medium] [Large]", msgId);
}

async function sendTimelineButtons(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone,
    "When are you planning to get it done? 📅", [
      { id: "qual_time_week", title: "This Week" },
      { id: "qual_time_month", title: "This Month" },
      { id: "qual_time_exploring", title: "Just Exploring" },
    ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "qual_timeline", "When are you planning? [This Week] [This Month] [Just Exploring]", msgId);
}

async function sendBudgetButtons(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone,
    "What's your budget range? 💰", [
      { id: "qual_budget_low", title: "₹2k – ₹5k" },
      { id: "qual_budget_mid", title: "₹5k – ₹10k" },
      { id: "qual_budget_high", title: "₹10k+" },
    ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "qual_budget", "Budget range? [₹2k–₹5k] [₹5k–₹10k] [₹10k+]", msgId);
}

async function sendHotLeadButtons(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const alreadySent = await wasTemplateSent(supabase, `+${recipientPhone}`, "qual_hot_cta");
  if (alreadySent) return;
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone,
    "🔥 You're all set! Our artist would love to connect with you. What would you prefer?", [
      { id: "talk_to_artist", title: "Talk to Artist 🎨" },
      { id: "menu_book", title: "Book Appointment 📅" },
    ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "qual_hot_cta", "🔥 All set! [Talk to Artist 🎨] [Book Appointment 📅]", msgId);
}

async function sendQualificationComplete(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null, lead: any) {
  const score = calculateLeadScore(lead);
  if (score === "HOT" || score === "WARM") {
    await sendHotLeadButtons(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId);
  } else {
    const text = "Thanks for sharing those details! 😊 Our team will review and get back to you. Meanwhile, check our portfolio: https://f19tattoo.in/portfolio/";
    const msgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone, text);
    await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "qual_complete_cold", text, msgId);
  }
}

/** Process the next qualification step after updating a field */
async function advanceQualification(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null, lead: any) {
  const state = getQualificationState(lead);
  const nextField = getNextQualificationField(state);

  if (!nextField) {
    // Fully qualified — send notification + CTA
    if (leadId) await sendQualifiedLeadNotification(supabase, leadId, leadName, `+${recipientPhone}`, lead);
    await sendQualificationComplete(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId, lead);
    return;
  }

  // For button-based fields, send buttons; for text-based fields, AI will ask
  if (nextField === "size") {
    await sendSizeButtons(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId);
  } else if (nextField === "timeline") {
    await sendTimelineButtons(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId);
  } else if (nextField === "budget") {
    await sendBudgetButtons(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId);
  }
  // tattoo_style and placement are collected via AI free-text (no buttons needed)
}

async function sendArtistContactFlow(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const bodyText = "Our artist will help you finalize the design and give you the exact price. 🎨✨\n\nWhat would you like to do next?";
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, bodyText, [
    { id: "send_tattoo_idea", title: "Send Tattoo Idea 📷" },
    { id: "menu_book", title: "Book Appointment 📅" },
  ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "flow_artist_contact", bodyText, msgId);
}

async function sendBookingSlots(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null) {
  const today = new Date();
  const slots: { label: string; id: string }[] = [];

  for (let dayOffset = 0; dayOffset < 7 && slots.length < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dow = date.getDay();
    if (dow === 0) continue;

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const { data: avail } = await supabase.from("studio_availability").select("is_available").or(`day_of_week.eq.${dow},specific_date.eq.${dateStr}`).limit(1);
    if (avail && avail.length > 0 && !avail[0].is_available) continue;

    const { data: existing } = await supabase.from("appointments").select("time_slot").eq("appointment_date", dateStr).neq("status", "cancelled");
    const bookedSlots = new Set((existing || []).map((a: any) => a.time_slot));
    const freeSlot = ["11:00 AM", "2:00 PM", "5:00 PM"].find(t => !bookedSlots.has(t));

    if (freeSlot) {
      const dayName = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      slots.push({ label: `${dayName} ${freeSlot}`, id: `book_${dateStr}_${freeSlot.replace(/[:\s]/g, '')}` });
    }
  }

  if (slots.length === 0) {
    const msgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone, "All our slots are currently booked! 😅 Our team will reach out to find the best time for you.");
    await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "flow_no_slots", "All slots booked", msgId);
    return;
  }

  const bodyText = "Great! Here are our available slots 📅\nPick one that works for you:";
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, bodyText, slots.slice(0, 3).map(s => ({ id: s.id, title: s.label })));
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "flow_booking_slots", bodyText, msgId);
}

async function handleBookingConfirm(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null, slotId: string) {
  const parts = slotId.replace("book_", "").split("_");
  const date = parts[0];
  const rawTime = parts[1];
  const hour = rawTime.slice(0, 2);
  const min = rawTime.slice(2, 4);
  const ampm = rawTime.slice(4);
  const timeSlot = `${parseInt(hour)}:${min} ${ampm}`;

  // Create appointment with PENDING status — studio must approve
  const { data: lead } = leadId ? await supabase.from("leads").select("*").eq("id", leadId).single() : { data: null };

  const { error } = await supabase.from("appointments").insert({
    lead_name: leadName, lead_phone: `+${recipientPhone}`, lead_id: leadId,
    appointment_date: date, time_slot: timeSlot, status: "pending",
    tattoo_style: lead?.tattoo_style || null,
  });

  if (error) {
    await sendTextMessage(phoneNumberId, accessToken, recipientPhone, "Sorry, there was an issue booking. Our team will contact you! 📞");
    return;
  }

  if (leadId) {
    await supabase.from("leads").update({ preferred_date: date, updated_at: new Date().toISOString() }).eq("id", leadId);
    await supabase.from("lead_interactions").insert({ lead_id: leadId, action_type: "appointment_requested", new_value: `${date} ${timeSlot}`, note: "Appointment request via WhatsApp (pending approval)" });
  }

  // Send "request received" message — NOT a confirmation
  const requestText = `📩 Appointment Request Received\n\nYour request has been sent to our studio team.\nWe will confirm your slot shortly.`;
  const msgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone, requestText);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "booking_request_received", requestText, msgId);

  // Trigger CRM notification for studio to approve/reject
  await supabase.from("crm_notifications").insert({
    lead_id: leadId,
    lead_name: leadName,
    lead_phone: `+${recipientPhone}`,
    notification_type: "appointment_request",
    tattoo_idea: lead?.tattoo_style || null,
    placement: lead?.placement || null,
    size: lead?.size || null,
    budget: lead?.budget || null,
    lead_source: lead?.source || "WhatsApp",
    lead_score: lead?.lead_score || null,
    timeline: `${date} at ${timeSlot}`,
    chat_summary: `Appointment request: ${date} ${timeSlot}`,
  });
}

async function handleStyleSelection(phoneNumberId: string, accessToken: string, recipientPhone: string, supabase: any, leadName: string, leadId: string | null, styleId: string) {
  const styleNames: Record<string, string> = {
    style_minimal: "Minimal", style_name: "Name/Lettering", style_sleeve: "Sleeve",
    style_portrait: "Portrait", style_geometric: "Geometric", style_traditional: "Traditional", style_custom: "Custom",
  };
  const styleName = styleNames[styleId] || "Custom";

  if (leadId) {
    await supabase.from("leads").update({ tattoo_style: styleName, updated_at: new Date().toISOString() }).eq("id", leadId);
    // Refresh lead and advance qualification
    const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (freshLead) {
      // Send a brief AI comment then advance
      const history = await getConversationHistory(supabase, `+${recipientPhone}`);
      const aiReply = await getAIReply(history, styleName, `The user selected "${styleName}" tattoo style. Acknowledge briefly and say you have a couple more quick questions.`);
      const replyMsgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone, aiReply);
      await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "chatbot_auto_reply", aiReply, replyMsgId);
      await advanceQualification(phoneNumberId, accessToken, recipientPhone, supabase, leadName, leadId, freshLead);
      return;
    }
  }

  // Fallback: show options
  const bodyText = `Great choice! ${styleName} tattoos are 🔥\n\nWant to see pricing or talk to our artist?`;
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, bodyText, [
    { id: "menu_price", title: "Get Price 💰" },
    { id: "talk_to_artist", title: "Talk to Artist 🎨" },
    { id: "menu_book", title: "Book Appointment 📅" },
  ]);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId, "flow_style_selected", bodyText, msgId);
}

// ─── Extract field values from free-text ──────────────────────────────

function extractPlacement(text: string): string | null {
  const placements = [
    "forearm", "wrist", "neck", "back", "chest", "leg", "shoulder",
    "ankle", "arm", "hand", "finger", "thigh", "calf", "ribcage",
    "spine", "hip", "collarbone", "bicep", "tricep", "elbow",
  ];
  const lower = text.toLowerCase();
  for (const p of placements) {
    if (lower.includes(p)) return p.charAt(0).toUpperCase() + p.slice(1);
  }
  return null;
}

function extractTattooStyle(text: string): string | null {
  const styles: Record<string, string[]> = {
    "Minimal": ["minimal", "minimalist", "simple", "small design"],
    "Name/Lettering": ["name", "lettering", "letters", "naam", "calligraphy", "text tattoo", "word"],
    "Portrait": ["portrait", "face", "realistic", "realism", "photo"],
    "Sleeve": ["sleeve", "full arm", "half sleeve", "full sleeve"],
    "Geometric": ["geometric", "geometry", "sacred geometry", "mandala"],
    "Traditional": ["traditional", "old school", "classic", "bold"],
    "Custom": ["custom", "unique", "original"],
    "Blackwork": ["blackwork", "black work", "solid black"],
    "Watercolor": ["watercolor", "water color"],
    "Tribal": ["tribal"],
    "Japanese": ["japanese", "irezumi"],
    "Dotwork": ["dotwork", "dot work"],
  };
  const lower = text.toLowerCase();
  for (const [styleName, keywords] of Object.entries(styles)) {
    if (keywords.some(k => lower.includes(k))) return styleName;
  }
  // If they mention a specific design concept, treat as custom
  const designKeywords = ["lion", "rose", "skull", "dragon", "butterfly", "eagle", "wolf", "tiger", "flower", "cross", "heart", "star", "moon", "sun", "tree", "bird", "snake", "fish", "crown", "anchor", "compass", "clock", "phoenix", "owl", "feather"];
  if (designKeywords.some(k => lower.includes(k))) return "Custom";
  return null;
}

// ─── Main Webhook Handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Meta webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    let verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "lovable_webhook_verify";
    try {
      const { data } = await supabase.from("whatsapp_settings").select("setting_value").eq("setting_key", "webhook_verify_token").single();
      if (data?.setting_value) verifyToken = data.setting_value;
    } catch { /* use fallback */ }

    if (mode === "subscribe" && token === verifyToken) return new Response(challenge, { status: 200, headers: corsHeaders });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Process incoming webhook (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[webhook] Payload:", JSON.stringify(body).slice(0, 2000));

      const entries = body?.entry || [];

      const { data: settingsData } = await supabase.from("whatsapp_settings").select("setting_key, setting_value");
      const settingsMap: Record<string, string> = {};
      if (settingsData) for (const row of settingsData) { if (row.setting_value) settingsMap[row.setting_key] = row.setting_value; }

      const accessToken = settingsMap["access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const wabaId = settingsMap["whatsapp_business_account_id"];
      const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      const chatbotEnabled = settingsMap["chatbot_enabled"] !== "false";

      let phoneNumberId: string | null = null;
      if (wabaId && accessToken) phoneNumberId = await resolvePhoneNumberId(wabaId, accessToken);
      if (!phoneNumberId && envPhoneId) phoneNumberId = envPhoneId;

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          // Handle delivery status updates
          for (const statusUpdate of (value?.statuses || [])) {
            const metaMessageId = statusUpdate.id;
            const status = statusUpdate.status;
            const timestamp = statusUpdate.timestamp;
            const updateData: Record<string, unknown> = { delivery_status: status };
            if (status === "delivered") updateData.delivered_at = new Date(parseInt(timestamp) * 1000).toISOString();
            else if (status === "read") updateData.read_at = new Date(parseInt(timestamp) * 1000).toISOString();
            else if (status === "failed") { updateData.error_message = statusUpdate?.errors?.[0]?.title || "Delivery failed"; updateData.status = "failed"; }
            await supabase.from("whatsapp_messages").update(updateData).eq("meta_message_id", metaMessageId);
          }

          // Handle incoming messages
          const messages = value?.messages || [];
          const contactsList = value?.contacts || [];

          for (const message of messages) {
            const senderPhone = message.from;
            const msgType = message.type || "text";

            let messageText = "";
            let mediaId: string | null = null;
            let messageType = msgType;
            let mediaUrl: string | null = null;
            let fileName: string | null = null;

            if (msgType === "text") { messageText = message?.text?.body || ""; messageType = "text"; }
            else if (msgType === "button") { messageText = message?.button?.text || ""; messageType = "text"; }
            else if (msgType === "interactive") { messageText = message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title || ""; messageType = "text"; }
            else if (msgType === "image") { mediaId = message?.image?.id || null; messageText = message?.image?.caption || "📷 Image"; messageType = "image"; fileName = `image_${Date.now()}.jpg`; }
            else if (msgType === "video") { mediaId = message?.video?.id || null; messageText = message?.video?.caption || "🎥 Video"; messageType = "video"; fileName = `video_${Date.now()}.mp4`; }
            else if (msgType === "audio" || msgType === "voice") { mediaId = message?.audio?.id || message?.voice?.id || null; messageText = "🎵 Voice message"; messageType = "audio"; fileName = `audio_${Date.now()}.ogg`; }
            else if (msgType === "document") { mediaId = message?.document?.id || null; messageText = message?.document?.filename || "📄 Document"; messageType = "document"; fileName = message?.document?.filename || `document_${Date.now()}`; }
            else if (msgType === "sticker") { mediaId = message?.sticker?.id || null; messageText = "🏷️ Sticker"; messageType = "sticker"; fileName = `sticker_${Date.now()}.webp`; }
            else if (msgType === "location") { const loc = message?.location; messageText = loc ? `📍 Location: ${loc.latitude}, ${loc.longitude}${loc.name ? ` — ${loc.name}` : ""}` : "📍 Location"; messageType = "location"; }
            else if (msgType === "contacts") { messageText = `👤 Contact: ${message?.contacts?.[0]?.name?.formatted_name || "Contact"}`; messageType = "contacts"; }
            else if (msgType === "reaction") { messageText = `${message?.reaction?.emoji || "👍"} Reaction`; messageType = "reaction"; }
            else { messageText = `[${msgType}]`; }

            // Fetch and store media
            if (mediaId && accessToken) {
              const mediaInfo = await fetchMediaUrl(mediaId, accessToken);
              if (mediaInfo?.url) {
                const stored = await downloadAndStoreMedia(mediaInfo.url, mediaInfo.mimeType, accessToken, supabase);
                if (stored) { mediaUrl = stored.publicUrl; fileName = stored.fileName; }
              }
            }

            const buttonPayloadId = getButtonPayloadId(message);
            const contactInfo = contactsList.find((c: any) => c.wa_id === senderPhone);
            const senderName = contactInfo?.profile?.name || `WhatsApp ${senderPhone}`;

            console.log(`[webhook] Incoming from ${senderName} (${senderPhone}): ${messageText} [type: ${messageType}] [button: ${buttonPayloadId}]`);

            // Upsert lead
            const { data: existingLeads } = await supabase.from("leads")
              .select("id, notes, bot_enabled, status, placement, size, budget, source, tattoo_style, timeline, lead_score, full_name")
              .eq("phone", `+${senderPhone}`).limit(1);

            let leadId: string | null = null;
            let botEnabled = true;
            let leadStatus = "New Lead";
            let isNewLead = false;
            let lead: any = null;

            if (existingLeads && existingLeads.length > 0) {
              lead = existingLeads[0];
              leadId = lead.id;
              botEnabled = lead.bot_enabled !== false;
              leadStatus = lead.status;
              const updatedNotes = `${lead.notes ? lead.notes + "\n" : ""}[WA ${new Date().toLocaleDateString("en-IN")}] ${messageText}`.slice(0, 2000);
              await supabase.from("leads").update({ notes: updatedNotes, updated_at: new Date().toISOString() }).eq("id", lead.id);
            } else {
              isNewLead = true;
              const { data: newLead, error } = await supabase.from("leads").insert({
                full_name: senderName, phone: `+${senderPhone}`, source: "WhatsApp",
                whatsapp_opt_in: true, status: "New Lead", tags: ["whatsapp_inquiry"],
                notes: `[WA ${new Date().toLocaleDateString("en-IN")}] ${messageText}`, bot_enabled: true,
              }).select().single();
              if (!error && newLead) { leadId = newLead.id; lead = newLead; console.log(`[webhook] Auto-created lead: ${newLead.id}`); }
            }

            // Log incoming message
            await supabase.from("whatsapp_messages").insert({
              lead_phone: `+${senderPhone}`, lead_name: senderName, lead_id: leadId,
              template_name: "incoming", template_type: "incoming", status: "received",
              meta_message_id: message.id, message_body: messageText || null,
              is_escalated: false, message_type: messageType, media_url: mediaUrl, file_name: fileName,
            });

            // Skip if bot disabled or no credentials
            if (!chatbotEnabled || !botEnabled || !phoneNumberId || !accessToken) {
              if (chatbotEnabled && !botEnabled) {
                await supabase.from("whatsapp_messages").update({ is_escalated: true }).eq("meta_message_id", message.id);
              }
              continue;
            }

            if (messageType === "reaction") continue;

            // ─── BUTTON-BASED FLOW ROUTING ────────────────────

            // Talk to Human
            if (buttonPayloadId === "talk_to_human" || messageText.toLowerCase().includes("talk to human")) {
              if (leadId) await supabase.from("leads").update({ bot_enabled: false, status: "Contacted" }).eq("id", leadId);
              const reply = "You're now connected to our team! 👨‍💻 One of our artists will get back to you shortly.";
              const msgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, reply);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "human_handoff", reply, msgId);
              continue;
            }

            // Talk to Artist
            if (buttonPayloadId === "talk_to_artist" || buttonPayloadId === "menu_artist") {
              if (leadId && lead) await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead);
              await sendArtistContactFlow(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // See Designs
            if (buttonPayloadId === "menu_designs") {
              await sendStyleList(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Style selection from list
            if (buttonPayloadId.startsWith("style_")) {
              await handleStyleSelection(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, buttonPayloadId);
              continue;
            }

            // Get Price → starts qualification from size
            if (buttonPayloadId === "menu_price") {
              await sendSizeButtons(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Qualification: Size selected
            if (buttonPayloadId.startsWith("qual_size_")) {
              const sizeMap: Record<string, string> = { qual_size_small: "Small (2-4 in)", qual_size_medium: "Medium (4-6 in)", qual_size_large: "Large (6-10 in)" };
              const sizeVal = sizeMap[buttonPayloadId] || "Medium (4-6 in)";
              if (leadId) {
                await supabase.from("leads").update({ size: sizeVal, updated_at: new Date().toISOString() }).eq("id", leadId);
                const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
                if (freshLead) { lead = freshLead; await advanceQualification(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, freshLead); }
              }
              continue;
            }

            // Qualification: Timeline selected
            if (buttonPayloadId.startsWith("qual_time_")) {
              const timeMap: Record<string, string> = { qual_time_week: "This Week", qual_time_month: "This Month", qual_time_exploring: "Just Exploring" };
              const timeVal = timeMap[buttonPayloadId] || "This Month";
              if (leadId) {
                await supabase.from("leads").update({ timeline: timeVal, updated_at: new Date().toISOString() }).eq("id", leadId);
                const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
                if (freshLead) { lead = freshLead; await advanceQualification(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, freshLead); }
              }
              continue;
            }

            // Qualification: Budget selected
            if (buttonPayloadId.startsWith("qual_budget_")) {
              const budgetMap: Record<string, string> = { qual_budget_low: "₹2k – ₹5k", qual_budget_mid: "₹5k – ₹10k", qual_budget_high: "₹10k+" };
              const budgetVal = budgetMap[buttonPayloadId] || "₹5k – ₹10k";
              if (leadId) {
                await supabase.from("leads").update({ budget: budgetVal, updated_at: new Date().toISOString() }).eq("id", leadId);
                const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
                if (freshLead) { lead = freshLead; await advanceQualification(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, freshLead); }
              }
              continue;
            }

            // Book Appointment
            if (buttonPayloadId === "menu_book") {
              await sendBookingSlots(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Booking slot confirm
            if (buttonPayloadId.startsWith("book_")) {
              await handleBookingConfirm(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, buttonPayloadId);
              continue;
            }

            // Send Tattoo Idea
            if (buttonPayloadId === "send_tattoo_idea") {
              const promptText = "Go ahead! 📷 Send me a photo or describe your tattoo idea, and our artist will review it.";
              const msgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, promptText);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "flow_send_idea_prompt", promptText, msgId);
              continue;
            }

            // ─── WELCOME FOR NEW / GREETING ────────────────────

            const lowerText = messageText.toLowerCase().trim();
            const isGreeting = /^(hi|hello|hey|hola|namaste|namaskar|yo|sup|start|menu)$/i.test(lowerText);

            if ((isNewLead || isGreeting) && !buttonPayloadId) {
              await sendWelcomeMenu(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // ─── FREE-TEXT PROCESSING ──────────────────────────

            // Try to extract qualification data from free-text
            const qualState = getQualificationState(lead);
            const nextField = getNextQualificationField(qualState);
            let fieldUpdated = false;

            if (nextField === "tattoo_style" && messageText) {
              const extractedStyle = extractTattooStyle(messageText);
              if (extractedStyle && leadId) {
                await supabase.from("leads").update({ tattoo_style: extractedStyle, updated_at: new Date().toISOString() }).eq("id", leadId);
                const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
                if (freshLead) {
                  lead = freshLead;
                  fieldUpdated = true;
                  // AI acknowledges + system sends next step buttons
                  const history = await getConversationHistory(supabase, `+${senderPhone}`);
                  const aiReply = await getAIReply(history, messageText, `The user described their tattoo style as "${extractedStyle}". Acknowledge briefly, positively.`);
                  const replyMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, aiReply);
                  await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "chatbot_auto_reply", aiReply, replyMsgId);
                  await advanceQualification(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, freshLead);
                }
              }
            }

            if (!fieldUpdated && nextField === "placement" && messageText) {
              const extractedPlacement = extractPlacement(messageText);
              if (extractedPlacement && leadId) {
                await supabase.from("leads").update({ placement: extractedPlacement, updated_at: new Date().toISOString() }).eq("id", leadId);
                const { data: freshLead } = await supabase.from("leads").select("*").eq("id", leadId).single();
                if (freshLead) {
                  lead = freshLead;
                  fieldUpdated = true;
                  const history = await getConversationHistory(supabase, `+${senderPhone}`);
                  const aiReply = await getAIReply(history, messageText, `The user said placement is "${extractedPlacement}". Acknowledge briefly.`);
                  const replyMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, aiReply);
                  await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "chatbot_auto_reply", aiReply, replyMsgId);
                  await advanceQualification(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, freshLead);
                }
              }
            }

            if (fieldUpdated) continue;

            // Check for strong intent → trigger artist consultation
            if (leadId && messageText && detectStrongIntent(messageText)) {
              if (lead && lead.status !== "Artist Consultation" && lead.status !== "Booked" && lead.status !== "Completed") {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead);
              }
              await sendArtistContactFlow(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Media (tattoo reference photos)
            if (messageType === "image" || messageType === "document") {
              const ackText = "Thanks for sharing! 📷 Our artist will review your design idea and get back to you with details and pricing. 🎨";
              const ackMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, ackText);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "media_ack", ackText, ackMsgId);
              if (leadId && lead && lead.status !== "Artist Consultation" && lead.status !== "Booked" && lead.status !== "Completed") {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead);
              }
              continue;
            }

            // ─── AI FALLBACK REPLY ─────────────────────────────

            // Build system note for AI context
            let systemNote = "";
            if (nextField) {
              systemNote = `The user hasn't provided their ${nextField.replace("_", " ")} yet. Ask for it naturally. Current collected data: ${generateChatSummary(lead)}`;
            } else if (isFullyQualified(qualState)) {
              systemNote = `All qualification data is collected. Lead score: ${calculateLeadScore(lead)}. Summary: ${generateChatSummary(lead)}. If user has more questions, answer them. Otherwise guide to Talk to Artist or Book Appointment.`;
            }

            const history = await getConversationHistory(supabase, `+${senderPhone}`);
            const historyWithoutCurrent = history.slice(0, -1);
            const aiReply = await getAIReply(historyWithoutCurrent, messageText, systemNote);

            const replyMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, aiReply);
            await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "chatbot_auto_reply", aiReply, replyMsgId);

            // If AI asked for placement or style, the next message should be parsed for that field
            // (handled in next webhook call via qualification state)
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      console.error("[webhook] Error:", err instanceof Error ? err.message : err);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
