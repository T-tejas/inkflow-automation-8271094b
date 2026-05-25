// Public endpoint for website appointment-form submissions.
// Creates a lead, fires CRM notification, sends WA utility template.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const last10 = digits.slice(-10);
  return `+91 ${last10}`;
}

function isValidPhone(raw: string) {
  return String(raw || "").replace(/\D/g, "").length >= 10;
}

async function trySendTemplate(supabase: any, lead: any, templateName: string) {
  // Try template send first; on failure, retry once after 30s with text fallback.
  const params = [lead.full_name || "Client", "F19 Tattoo Studio"];
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        phone: lead.phone,
        leadName: lead.full_name,
        leadId: lead.id,
        type: "template",
        templateName,
        parameters: params,
      },
    });
    if (error) throw error;
    return { ok: true, data };
  } catch (err: any) {
    console.error("[website-lead-intake] template send failed:", err?.message);
    // Schedule a retry asynchronously (non-blocking)
    setTimeout(async () => {
      try {
        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phone: lead.phone,
            leadName: lead.full_name,
            leadId: lead.id,
            type: "template",
            templateName,
            parameters: params,
          },
        });
      } catch (e) {
        console.error("[website-lead-intake] retry failed:", e);
      }
    }, 30_000);
    return { ok: false, error: err?.message || "send failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      full_name,
      phone,
      email,
      tattoo_idea,
      placement,
      budget,
      preferred_date,
      tattoo_style,
      size,
      image_url,
    } = body || {};

    if (!full_name || !String(full_name).trim()) {
      return json({ error: "Name is required" }, 400);
    }
    if (!isValidPhone(phone)) {
      return json({ error: "Valid phone number is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const normalizedPhone = normalizePhone(phone);

    // Compose notes from form data
    const noteLines: string[] = ["📥 Website Appointment Form"];
    if (email) noteLines.push(`Email: ${email}`);
    if (tattoo_idea) noteLines.push(`Tattoo Idea: ${tattoo_idea}`);
    if (image_url) noteLines.push(`Reference: ${image_url}`);
    const notes = noteLines.join("\n");

    // Insert lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        full_name: String(full_name).trim(),
        phone: normalizedPhone,
        email: email || null,
        source: "Website",
        status: "New Lead",
        tattoo_style: tattoo_style || "Other",
        size: size || "Medium (4-6 in)",
        placement: placement || "",
        budget: budget ? String(budget) : "",
        preferred_date: preferred_date || "",
        notes,
        tags: ["website-lead"],
        whatsapp_opt_in: true,
      })
      .select()
      .single();

    if (leadErr) {
      // Possible duplicate (phone+source unique). Try fetching existing.
      console.error("[website-lead-intake] lead insert error:", leadErr.message);
      const { data: existing } = await supabase
        .from("leads")
        .select("*")
        .eq("phone", normalizedPhone)
        .eq("source", "Website")
        .maybeSingle();
      if (!existing) {
        return json({ error: "Failed to create lead", detail: leadErr.message }, 500);
      }
      // Update existing with new data
      await supabase
        .from("leads")
        .update({
          full_name: String(full_name).trim(),
          email: email || existing.email,
          placement: placement || existing.placement,
          budget: budget ? String(budget) : existing.budget,
          preferred_date: preferred_date || existing.preferred_date,
          notes: `${existing.notes || ""}\n\n--- New submission ${new Date().toISOString()} ---\n${notes}`.trim(),
          status: existing.status === "Cold Lead" ? "New Lead" : existing.status,
        })
        .eq("id", existing.id);
      // Use existing as the lead for downstream actions
      Object.assign(body, { _lead: existing });
    }

    const effectiveLead = lead || (body as any)._lead;

    // Fire CRM notification (realtime via existing subscription)
    await supabase.from("crm_notifications").insert({
      lead_id: effectiveLead.id,
      lead_name: effectiveLead.full_name,
      lead_phone: effectiveLead.phone,
      notification_type: "website_lead",
      tattoo_idea: tattoo_idea || null,
      placement: placement || null,
      budget: budget ? String(budget) : null,
      lead_source: "Website",
      chat_summary: `New website appointment request from ${effectiveLead.full_name}. ${
        tattoo_idea ? `Idea: ${tattoo_idea}` : ""
      }`.trim(),
    });

    // Send WA utility template
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "website_intake_template")
      .maybeSingle();
    const templateName = settings?.setting_value || "appointment_confirmation";

    const sendResult = await trySendTemplate(supabase, effectiveLead, templateName);

    return json({
      success: true,
      lead_id: effectiveLead.id,
      whatsapp: sendResult,
    });
  } catch (err: any) {
    console.error("[website-lead-intake] fatal:", err);
    return json({ error: err?.message || "Unexpected error" }, 500);
  }
});
