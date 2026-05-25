// Public AI chatbot endpoint for the website widget.
// Uses Lovable AI Gateway (Gemini). Non-streaming for simple embed.
// Persists conversations + auto-creates lead when contact info captured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (p: unknown, s = 200) =>
  new Response(JSON.stringify(p), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are F19 Assistant, a friendly chatbot for F19 Tattoo Studio (premium tattoo studio in India).
Goals:
- Answer queries about tattoo styles, pricing (₹), booking, aftercare, studio hours.
- Studio: open 11 AM - 8 PM, all 7 days. Located in India. Custom designs by expert artists.
- PRICING (STRICT — never quote lower):
  • Minimum charge: ₹2,000. Small ₹2,000-5,000. Medium ₹5,000-12,000. Large/sleeves ₹15,000+.
  • NEVER quote below ₹2,000.
- LEAD CAPTURE (collect one by one, in this order, BEFORE closing):
  1. Name — "May I know your good name?"
  2. WhatsApp number
  3. Tattoo idea / design
  4. Placement on body (forearm, wrist, back, etc.)
  5. Approx size
  6. Preferred date
- After name + phone are received, confirm: "Great <Name>, our team will reach out shortly on WhatsApp!"
- Keep replies short, warm, emoji-friendly. Reply in user's language (Hindi/English/Hinglish).`;

function extractContact(msgs: Array<{ role: string; content: string }>) {
  const userText = msgs.filter(m => m.role === "user").map(m => m.content).join("\n");
  const phoneMatch = userText.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  const nameMatch = userText.match(/(?:my name is|i am|i'm|mera naam|myself|this is|name[:\-])\s+([a-zA-Z][a-zA-Z\s]{1,40})/i);
  let name = nameMatch ? nameMatch[1].trim().split(/\s+/).slice(0, 3).join(" ") : null;
  if (name) name = name.replace(/\b(is|hai|here|from)\b/gi, "").trim();

  const bodyParts = /\b(forearm|wrist|arm|bicep|shoulder|back|chest|neck|thigh|leg|calf|ankle|hand|finger|rib|ribs|hip|stomach|foot|spine|collarbone)\b/i;
  const placementMatch = userText.match(/(?:placement|place|jagah|on my|on the)[:\s\-]+([a-zA-Z\s]{2,30})/i);
  let placement: string | null = placementMatch ? placementMatch[1].trim().split(/[.,\n]/)[0].trim() : null;
  if (!placement) {
    const m = userText.match(bodyParts);
    placement = m ? m[1] : null;
  }

  const ideaMatch = userText.match(/(?:tattoo of|want a|chahiye|design of|banwana hai|getting a)\s+([a-zA-Z0-9\s]{2,60})/i);
  const tattooIdea = ideaMatch ? ideaMatch[1].trim().split(/[.,\n]/)[0].trim() : null;

  return { phone, name, placement, tattooIdea };
}

function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  return `+91 ${d.slice(-10)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!LOVABLE_API_KEY) return json({ error: "AI key missing" }, 500);
    const { messages = [], sessionId } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: "messages required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Call Gemini via gateway
    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[website-chatbot] AI error", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "Rate limited, try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI failed" }, 500);
    }
    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Sorry, please try again.";

    // Auto-capture lead if contact info present
    const { phone, name } = extractContact(messages);
    let leadId: string | null = null;
    if (phone) {
      const normalized = normalizePhone(phone);
      const fullName = name || "Website Chat Lead";
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
      const notes = `📥 Website Chatbot\nLast message: ${lastUserMsg}\nSession: ${sessionId || "n/a"}`;

      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", normalized)
        .eq("source", "Website Chat")
        .maybeSingle();

      if (existing) {
        leadId = existing.id;
      } else {
        const { data: lead } = await supabase
          .from("leads")
          .insert({
            full_name: fullName,
            phone: normalized,
            source: "Website Chat",
            status: "New Lead",
            notes,
            tags: ["website-chatbot"],
            whatsapp_opt_in: true,
          })
          .select("id")
          .single();
        if (lead) {
          leadId = lead.id;
          await supabase.from("crm_notifications").insert({
            lead_id: lead.id,
            lead_name: fullName,
            lead_phone: normalized,
            notification_type: "website_chatbot",
            lead_source: "Website Chat",
            chat_summary: lastUserMsg.slice(0, 200),
          });
        }
      }
    }

    return json({ reply, leadId });
  } catch (err: any) {
    console.error("[website-chatbot] fatal:", err);
    return json({ error: err?.message || "Unexpected error" }, 500);
  }
});
