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

# IMPORTANT: INTERACTIVE BUTTONS CONTEXT
The system automatically sends interactive buttons (Welcome menu, Style options, Size options, etc.) to the user.
When a user clicks a button, you'll see the button text as their message.
Respond naturally to button selections — do NOT re-send the same options the system already showed.
If the system just sent buttons, keep your text reply SHORT and complementary, not redundant.

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
    return { url: data.url || "", mimeType: data.mime_type || "", fileName: `media_${mediaId.slice(-8)}` };
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

// ─── Message Senders ──────────────────────────────────────────────────

async function sendTextMessage(
  phoneNumberId: string, accessToken: string, recipientPhone: string, text: string
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp", to: recipientPhone,
    type: "text", text: { body: text },
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

async function sendInteractiveButtons(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  bodyText: string, buttons: { id: string; title: string }[]
): Promise<string | null> {
  // WhatsApp allows max 3 buttons, each title max 20 chars
  const safeButtons = buttons.slice(0, 3).map(b => ({
    type: "reply",
    reply: { id: b.id, title: b.title.slice(0, 20) },
  }));
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: safeButtons },
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

async function sendInteractiveList(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  bodyText: string, buttonLabel: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<string | null> {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections,
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

/** Log an outgoing message to the database */
async function logOutgoingMessage(
  supabase: any, phone: string, name: string, leadId: string | null,
  templateName: string, body: string, metaMsgId: string | null
) {
  await supabase.from("whatsapp_messages").insert({
    lead_phone: phone,
    lead_name: name,
    lead_id: leadId,
    template_name: templateName,
    template_type: "confirmation",
    status: "sent",
    meta_message_id: metaMsgId,
    message_body: body,
    message_type: "text",
  });
}

// ─── Intent & Flow Detection ─────────────────────────────────────────

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
  const exactMatches = ['yes', 'yep', 'yeah', 'ok', 'okay', 'sure', 'done', 'haan', 'ha', 'ho'];
  const trimmed = lower.trim();
  if (exactMatches.includes(trimmed)) return true;
  return intentPhrases.some(phrase => lower.includes(phrase));
}

function hasSharedEnoughDetails(notes: string): boolean {
  const lower = (notes || '').toLowerCase();
  let detailCount = 0;
  if (/design|tattoo idea|drawing|image|photo|reference/i.test(lower)) detailCount++;
  if (/small|medium|large|sleeve|inch/i.test(lower)) detailCount++;
  if (/arm|leg|back|chest|wrist|shoulder|neck|ankle|forearm|hand/i.test(lower)) detailCount++;
  if (/week|month|tomorrow|today|asap|jaldi|soon/i.test(lower)) detailCount++;
  return detailCount >= 3;
}

/** Check if a specific template was already sent */
async function wasTemplateSent(supabase: any, phone: string, templateName: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("lead_phone", phone)
    .eq("template_name", templateName)
    .limit(1);
  return data && data.length > 0;
}

/** Detect which interactive flow button was clicked */
function getButtonPayloadId(message: any): string {
  return message?.button?.payload || message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id || "";
}

// ─── CRM Actions ─────────────────────────────────────────────────────

async function triggerArtistConsultation(
  supabase: any, leadId: string, leadName: string, leadPhone: string,
  notes: string, lead: any
) {
  if (lead?.status === 'Artist Consultation' || lead?.status === 'Booked' || lead?.status === 'Completed') return;

  await supabase
    .from('leads')
    .update({ status: 'Artist Consultation', updated_at: new Date().toISOString() })
    .eq('id', leadId);

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
      tattoo_idea: notes?.slice(0, 100) || null,
      placement: lead?.placement || null,
      size: lead?.size || null,
      budget: lead?.budget || null,
      lead_source: lead?.source || 'WhatsApp',
    });
  }

  await supabase.from('lead_interactions').insert({
    lead_id: leadId,
    action_type: 'artist_consultation_triggered',
    new_value: 'Artist Consultation',
    note: 'Auto-triggered by positive intent detection',
  });

  console.log(`[webhook] 🔥 Artist Consultation triggered for ${leadName} (${leadPhone})`);
}

// ─── AI Reply ─────────────────────────────────────────────────────────

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
    .filter((m: any) => m.message_body && !m.template_name?.includes('button') && !m.template_name?.includes('welcome') && !m.template_name?.includes('flow_'))
    .map((m: any) => ({
      role: m.template_type === "incoming" ? "user" : "assistant",
      content: m.message_body,
    }));
}

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

// ─── Interactive Flow Handlers ────────────────────────────────────────

/** Send welcome menu with buttons - first contact or "hi/hello" */
async function sendWelcomeMenu(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  const bodyText = `Welcome to F19 Tattoo Studio 🔥\nHey ${leadName}! How can we help you today?`;
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "menu_designs", title: "See Tattoo Designs" },
      { id: "menu_price", title: "Get Tattoo Price" },
      { id: "menu_artist", title: "Talk to Artist 🎨" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "welcome_menu", `${bodyText}\n[See Tattoo Designs] [Get Tattoo Price] [Talk to Artist 🎨]`, msgId);

  // Also send a second button row for Book Appointment (WhatsApp limits to 3 buttons per message)
  const msgId2 = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone,
    "Or would you like to book a session directly? 📅",
    [{ id: "menu_book", title: "Book Appointment 📅" }]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "welcome_menu_2", "Or would you like to book a session directly? 📅\n[Book Appointment 📅]", msgId2);

  console.log(`[webhook] Sent welcome menu to ${recipientPhone}`);
}

/** Send tattoo style list */
async function sendStyleList(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  const bodyText = "Check out our popular tattoo styles! 🎨 Tap below to explore:";
  const msgId = await sendInteractiveList(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    "View Styles",
    [{
      title: "Tattoo Styles",
      rows: [
        { id: "style_minimal", title: "Minimal Tattoo", description: "Small, clean & elegant designs" },
        { id: "style_name", title: "Name Tattoo", description: "Stylish lettering & calligraphy" },
        { id: "style_sleeve", title: "Sleeve Tattoo", description: "Full arm tattoo concepts" },
        { id: "style_portrait", title: "Portrait Tattoo", description: "Realistic face & figure art" },
        { id: "style_geometric", title: "Geometric Tattoo", description: "Sharp lines & sacred geometry" },
        { id: "style_traditional", title: "Traditional Tattoo", description: "Bold colors, classic motifs" },
        { id: "style_custom", title: "Custom Design", description: "Unique art made just for you" },
      ],
    }]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_style_list", bodyText + "\n[Minimal] [Name] [Sleeve] [Portrait] [Geometric] [Traditional] [Custom]", msgId);
  console.log(`[webhook] Sent style list to ${recipientPhone}`);
}

/** Send size selection buttons (price flow step 1) */
async function sendSizeSelection(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  const bodyText = "What size tattoo are you planning? 📐";
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "size_small", title: "Small (1-3 in)" },
      { id: "size_medium", title: "Medium (4-6 in)" },
      { id: "size_large", title: "Large (7+ in)" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_size_select", bodyText + "\n[Small] [Medium] [Large]", msgId);
  console.log(`[webhook] Sent size selection to ${recipientPhone}`);
}

/** Send style selection buttons (price flow step 2) */
async function sendPriceStyleSelection(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  const bodyText = "What style do you prefer? ✨";
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "pstyle_name", title: "Name / Lettering" },
      { id: "pstyle_minimal", title: "Minimal" },
      { id: "pstyle_custom", title: "Portrait / Custom" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_price_style", bodyText + "\n[Name] [Minimal] [Portrait/Custom]", msgId);
  console.log(`[webhook] Sent price style selection to ${recipientPhone}`);
}

/** Send price estimate with CTA buttons */
async function sendPriceEstimate(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null,
  size: string, style: string
) {
  const priceMap: Record<string, Record<string, string>> = {
    small: { name: "₹2,000 – ₹4,000", minimal: "₹2,500 – ₹5,000", custom: "₹4,000 – ₹8,000" },
    medium: { name: "₹4,000 – ₹8,000", minimal: "₹5,000 – ₹10,000", custom: "₹8,000 – ₹15,000" },
    large: { name: "₹8,000 – ₹15,000", minimal: "₹10,000 – ₹20,000", custom: "₹15,000 – ₹35,000+" },
  };
  const estimate = priceMap[size]?.[style] || "₹3,000 – ₹25,000+";

  const bodyText = `💰 Estimated Price Range: ${estimate}\n\nThis depends on complexity and detail. Our artist can give you the exact quote after seeing your design idea.\n\nWould you like to talk to an artist for the final quote?`;
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "talk_to_artist", title: "Talk to Artist 🎨" },
      { id: "menu_book", title: "Book Appointment 📅" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_price_estimate", bodyText + "\n[Talk to Artist 🎨] [Book Appointment 📅]", msgId);

  // Update lead with size info
  if (leadId) {
    const sizeLabel = size === "small" ? "Small (1-3 in)" : size === "medium" ? "Medium (4-6 in)" : "Large (7+ in)";
    await supabase.from("leads").update({ size: sizeLabel, tattoo_style: style, updated_at: new Date().toISOString() }).eq("id", leadId);
  }

  console.log(`[webhook] Sent price estimate to ${recipientPhone}: ${estimate}`);
}

/** Send artist contact confirmation with next step buttons */
async function sendArtistContactFlow(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  const bodyText = "Our artist will help you finalize the design and give you the exact price. 🎨✨\n\nWhat would you like to do next?";
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "send_tattoo_idea", title: "Send Tattoo Idea 📷" },
      { id: "menu_book", title: "Book Appointment 📅" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_artist_contact", bodyText + "\n[Send Tattoo Idea 📷] [Book Appointment 📅]", msgId);
  console.log(`[webhook] Sent artist contact flow to ${recipientPhone}`);
}

/** Send booking slots */
async function sendBookingSlots(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null
) {
  // Fetch next 3 available slots from appointments/availability
  const today = new Date();
  const slots: { label: string; id: string }[] = [];

  for (let dayOffset = 0; dayOffset < 7 && slots.length < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dow = date.getDay(); // 0=Sun
    if (dow === 0) continue; // Skip Sunday

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Check studio availability
    const { data: avail } = await supabase
      .from("studio_availability")
      .select("is_available")
      .or(`day_of_week.eq.${dow},specific_date.eq.${dateStr}`)
      .limit(1);

    if (avail && avail.length > 0 && !avail[0].is_available) continue;

    // Check existing appointments
    const { data: existing } = await supabase
      .from("appointments")
      .select("time_slot")
      .eq("appointment_date", dateStr)
      .neq("status", "cancelled");

    const bookedSlots = new Set((existing || []).map((a: any) => a.time_slot));
    const availableTimes = ["11:00 AM", "2:00 PM", "5:00 PM"];
    const freeSlot = availableTimes.find(t => !bookedSlots.has(t));

    if (freeSlot) {
      const dayName = dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      slots.push({
        label: `${dayName} ${freeSlot}`,
        id: `book_${dateStr}_${freeSlot.replace(/[:\s]/g, '')}`,
      });
    }
  }

  if (slots.length === 0) {
    const msgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone,
      "All our slots are currently booked! 😅 Our team will reach out to find the best time for you. Hang tight! 🎨");
    await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
      "flow_no_slots", "All our slots are currently booked! Our team will reach out.", msgId);
    return;
  }

  const bodyText = "Great! Here are our available slots 📅\nPick one that works for you:";
  const buttons = slots.slice(0, 3).map(s => ({ id: s.id, title: s.label }));
  const msgId = await sendInteractiveButtons(phoneNumberId, accessToken, recipientPhone, bodyText, buttons);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_booking_slots", bodyText + "\n" + slots.map(s => `[${s.label}]`).join(" "), msgId);
  console.log(`[webhook] Sent booking slots to ${recipientPhone}`);
}

/** Handle booking slot selection */
async function handleBookingConfirm(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null, slotId: string
) {
  // Parse slot ID: book_2026-03-10_0200PM
  const parts = slotId.replace("book_", "").split("_");
  const date = parts[0];
  const rawTime = parts[1];
  // Convert back: 0200PM -> 2:00 PM
  const hour = rawTime.slice(0, 2);
  const min = rawTime.slice(2, 4);
  const ampm = rawTime.slice(4);
  const timeSlot = `${parseInt(hour)}:${min} ${ampm}`;

  // Create appointment
  const { error } = await supabase.from("appointments").insert({
    lead_name: leadName,
    lead_phone: `+${recipientPhone}`,
    lead_id: leadId,
    appointment_date: date,
    time_slot: timeSlot,
    status: "confirmed",
  });

  if (error) {
    console.error("[webhook] Booking error:", error);
    await sendTextMessage(phoneNumberId, accessToken, recipientPhone,
      "Sorry, there was an issue booking that slot. Our team will contact you to confirm! 📞");
    return;
  }

  // Update lead status
  if (leadId) {
    await supabase.from("leads").update({
      status: "Booked",
      preferred_date: date,
      updated_at: new Date().toISOString(),
    }).eq("id", leadId);

    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      action_type: "status_change",
      old_value: "Artist Consultation",
      new_value: "Booked",
      note: `Booked via WhatsApp: ${date} ${timeSlot}`,
    });
  }

  const dayLabel = new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const confirmText = `✅ Your appointment is confirmed!\n\n📅 ${dayLabel}\n⏰ ${timeSlot}\n📍 F19 Tattoo Studio, Kothrud, Pune\n\nPlease arrive 15 minutes early. See you soon! 🎨🔥`;
  const msgId = await sendTextMessage(phoneNumberId, accessToken, recipientPhone, confirmText);
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "booking_confirmed", confirmText, msgId);

  console.log(`[webhook] ✅ Booking confirmed for ${recipientPhone}: ${date} ${timeSlot}`);
}

/** Handle style selection from the list */
async function handleStyleSelection(
  phoneNumberId: string, accessToken: string, recipientPhone: string,
  supabase: any, leadName: string, leadId: string | null, styleId: string
) {
  const styleNames: Record<string, string> = {
    style_minimal: "Minimal",
    style_name: "Name/Lettering",
    style_sleeve: "Sleeve",
    style_portrait: "Portrait",
    style_geometric: "Geometric",
    style_traditional: "Traditional",
    style_custom: "Custom",
  };
  const styleName = styleNames[styleId] || "Custom";

  // Update lead
  if (leadId) {
    await supabase.from("leads").update({ tattoo_style: styleName, updated_at: new Date().toISOString() }).eq("id", leadId);
  }

  const bodyText = `Great choice! ${styleName} tattoos are 🔥\n\nWant to see pricing or talk to our artist directly?`;
  const msgId = await sendInteractiveButtons(
    phoneNumberId, accessToken, recipientPhone, bodyText,
    [
      { id: "menu_price", title: "Get Price 💰" },
      { id: "talk_to_artist", title: "Talk to Artist 🎨" },
      { id: "menu_book", title: "Book Appointment 📅" },
    ]
  );
  await logOutgoingMessage(supabase, `+${recipientPhone}`, leadName, leadId,
    "flow_style_selected", bodyText + `\n[Get Price] [Talk to Artist] [Book Appointment]`, msgId);
}

// ─── Main Webhook Handler ─────────────────────────────────────────────

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
          const contactsList = value?.contacts || [];

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

            const buttonPayloadId = getButtonPayloadId(message);
            const contactInfo = contactsList.find((c: any) => c.wa_id === senderPhone);
            const senderName = contactInfo?.profile?.name || `WhatsApp ${senderPhone}`;

            console.log(`[webhook] Incoming from ${senderName} (${senderPhone}): ${messageText} [type: ${messageType}] [button: ${buttonPayloadId}]`);

            // Upsert lead
            const { data: existingLeads } = await supabase
              .from("leads")
              .select("id, notes, bot_enabled, status, placement, size, budget, source, tattoo_style")
              .eq("phone", `+${senderPhone}`)
              .limit(1);

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
              await supabase
                .from("leads")
                .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
                .eq("id", lead.id);
            } else {
              isNewLead = true;
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
                lead = newLead;
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

            // Skip further processing if bot is disabled or no phone/token
            if (!chatbotEnabled || !botEnabled || !phoneNumberId || !accessToken) {
              if (chatbotEnabled && !botEnabled) {
                console.log(`[webhook] Bot disabled for ${senderPhone}, skipping auto-reply`);
                await supabase.from("whatsapp_messages").update({ is_escalated: true }).eq("meta_message_id", message.id);
              }
              continue;
            }

            // Skip reactions
            if (messageType === "reaction") continue;

            // ─── INTERACTIVE FLOW ROUTING ─────────────────────

            // Handle "Talk to Human" button
            if (buttonPayloadId === "talk_to_human" || messageText.toLowerCase().includes("talk to human")) {
              if (leadId) {
                await supabase.from("leads").update({ bot_enabled: false, status: "Contacted" }).eq("id", leadId);
              }
              const confirmReply = "You're now connected to our team! 👨‍💻 One of our artists will get back to you shortly. Hang tight! 🎨";
              const confirmMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, confirmReply);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "human_handoff", confirmReply, confirmMsgId);
              continue;
            }

            // Handle "Talk to Artist" button or intent
            if (buttonPayloadId === "talk_to_artist" || buttonPayloadId === "menu_artist") {
              if (leadId && lead) {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead.notes, lead);
              }
              await sendArtistContactFlow(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Handle "See Tattoo Designs"
            if (buttonPayloadId === "menu_designs") {
              await sendStyleList(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Handle style selection from list
            if (buttonPayloadId.startsWith("style_")) {
              await handleStyleSelection(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, buttonPayloadId);
              continue;
            }

            // Handle "Get Tattoo Price"
            if (buttonPayloadId === "menu_price") {
              await sendSizeSelection(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Handle size selection (price flow step 1)
            if (buttonPayloadId.startsWith("size_")) {
              // Store selected size for price flow step 2
              const sizeKey = buttonPayloadId.replace("size_", "");
              // Tag the lead with the selected size temporarily via notes
              if (leadId) {
                await supabase.from("leads").update({
                  size: sizeKey === "small" ? "Small (1-3 in)" : sizeKey === "medium" ? "Medium (4-6 in)" : "Large (7+ in)",
                  updated_at: new Date().toISOString(),
                }).eq("id", leadId);
              }
              await sendPriceStyleSelection(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Handle price style selection (price flow step 2)
            if (buttonPayloadId.startsWith("pstyle_")) {
              const styleKey = buttonPayloadId.replace("pstyle_", "");
              // Get the lead's selected size
              let sizeKey = "medium";
              if (leadId) {
                const { data: freshLead } = await supabase.from("leads").select("size").eq("id", leadId).single();
                if (freshLead?.size?.toLowerCase().includes("small")) sizeKey = "small";
                else if (freshLead?.size?.toLowerCase().includes("large")) sizeKey = "large";
              }
              await sendPriceEstimate(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, sizeKey, styleKey);
              continue;
            }

            // Handle "Book Appointment"
            if (buttonPayloadId === "menu_book") {
              await sendBookingSlots(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
              continue;
            }

            // Handle booking slot selection
            if (buttonPayloadId.startsWith("book_")) {
              await handleBookingConfirm(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId, buttonPayloadId);
              continue;
            }

            // Handle "Send Tattoo Idea" - prompt them to share
            if (buttonPayloadId === "send_tattoo_idea") {
              const promptText = "Go ahead! 📷 Send me a photo or describe your tattoo idea, and our artist will review it.";
              const msgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, promptText);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "flow_send_idea_prompt", promptText, msgId);
              continue;
            }

            // ─── WELCOME MENU FOR FIRST-TIME / GREETING ──────

            const lowerText = messageText.toLowerCase().trim();
            const isGreeting = /^(hi|hello|hey|hola|namaste|namaskar|yo|sup|start|menu)$/i.test(lowerText);

            if ((isNewLead || isGreeting) && !buttonPayloadId) {
              // Send welcome menu only if not sent recently (last 24h)
              const alreadySentWelcome = await wasTemplateSent(supabase, `+${senderPhone}`, "welcome_menu");
              if (!alreadySentWelcome || isGreeting) {
                await sendWelcomeMenu(phoneNumberId, accessToken, senderPhone, supabase, senderName, leadId);
                continue;
              }
            }

            // ─── INTENT DETECTION & AI REPLY ─────────────────

            let intentDetected = false;
            if (leadId && messageText) {
              const strongIntent = detectStrongIntent(messageText);
              const enoughDetails = hasSharedEnoughDetails(lead?.notes || "");
              intentDetected = strongIntent || enoughDetails;

              if (intentDetected && lead && lead.status !== "Artist Consultation" && lead.status !== "Booked" && lead.status !== "Completed") {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead.notes, lead);
              }
            }

            // For media messages (tattoo idea photos), acknowledge and trigger consultation
            if (messageType === "image" || messageType === "document") {
              const ackText = "Thanks for sharing! 📷 Our artist will review your design idea and get back to you with details and pricing. 🎨";
              const ackMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, ackText);
              await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "media_ack", ackText, ackMsgId);

              if (leadId && lead && lead.status !== "Artist Consultation" && lead.status !== "Booked" && lead.status !== "Completed") {
                await triggerArtistConsultation(supabase, leadId, senderName, `+${senderPhone}`, lead.notes, lead);
              }
              continue;
            }

            // AI reply for free-text messages
            let userContent = messageText;
            if (messageType !== "text") {
              userContent = `[Client sent a ${messageType}: ${messageText}]`;
            }

            const history = await getConversationHistory(supabase, `+${senderPhone}`);
            const historyWithoutCurrent = history.slice(0, -1);
            const aiReply = await getAIReply(historyWithoutCurrent, userContent);
            console.log(`[webhook] AI reply to ${senderPhone}: ${aiReply.slice(0, 100)}`);

            const replyMsgId = await sendTextMessage(phoneNumberId, accessToken, senderPhone, aiReply);
            await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId, "chatbot_auto_reply", aiReply, replyMsgId);

            // Send "Talk to Artist" button when intent is detected and not already sent
            if (intentDetected && leadStatus !== "Artist Consultation" && leadStatus !== "Booked" && leadStatus !== "Completed") {
              const alreadySent = await wasTemplateSent(supabase, `+${senderPhone}`, "artist_consultation_button");
              if (!alreadySent) {
                const buttonMsgId = await sendInteractiveButtons(
                  phoneNumberId, accessToken, senderPhone,
                  "Would you like one of our artists to contact you? Tap below! 👇",
                  [
                    { id: "talk_to_artist", title: "Talk to Artist 🎨" },
                    { id: "menu_book", title: "Book Appointment 📅" },
                    { id: "talk_to_human", title: "Talk to Human 👨‍💻" },
                  ]
                );
                await logOutgoingMessage(supabase, `+${senderPhone}`, senderName, leadId,
                  "artist_consultation_button",
                  "Would you like one of our artists to contact you?\n[Talk to Artist 🎨] [Book Appointment 📅] [Talk to Human 👨‍💻]",
                  buttonMsgId);
                console.log(`[webhook] 🎨 Sent "Talk to Artist" button to ${senderPhone}`);
              }
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
