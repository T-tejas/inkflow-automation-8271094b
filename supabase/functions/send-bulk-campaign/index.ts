import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getSettings(supabase: any) {
  const { data } = await supabase.from("whatsapp_settings").select("setting_key, setting_value");
  const m: Record<string, string> = {};
  if (data) for (const r of data) if (r.setting_value) m[r.setting_key] = r.setting_value;
  return m;
}

async function resolvePhoneNumberId(wabaId: string, accessToken: string): Promise<string | null> {
  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?fields=id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.[0]?.id || null;
  } catch { return null; }
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

const INVISIBLE_EMPTY_TEXT = "\u200C";

function phoneDigits(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function phoneVariants(phone: string) {
  const raw = String(phone || "").trim();
  const compact = raw.replace(/[\s\-\(\)]/g, "");
  const digits = phoneDigits(raw);
  const last10 = digits.slice(-10);
  return Array.from(new Set([
    raw,
    compact,
    compact.replace(/^\+/, ""),
    digits,
    digits ? `+${digits}` : "",
    last10 ? `+91${last10}` : "",
    last10 ? `+91 ${last10}` : "",
  ].filter(Boolean)));
}

async function findLeadByPhone(supabase: any, phone: string) {
  const variants = phoneVariants(phone);
  const { data: exact } = await supabase
    .from("leads")
    .select("id, full_name, phone, preferred_date, updated_at")
    .in("phone", variants)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (exact?.length) {
    const raw = String(phone || "").trim();
    const compact = raw.replace(/[\s\-\(\)]/g, "");
    return exact.find((l: any) => l.phone === raw) || exact.find((l: any) => l.phone === compact) || exact[0];
  }

  const last10 = phoneDigits(phone).slice(-10);
  if (!last10) return null;

  const { data: candidates } = await supabase
    .from("leads")
    .select("id, full_name, phone, preferred_date, updated_at")
    .order("updated_at", { ascending: false })
    .limit(2000);

  return (candidates || []).find((l: any) => phoneDigits(l.phone).slice(-10) === last10) || null;
}

async function findLatestAppointment(supabase: any, lead: any, phone: string) {
  const pickActive = (rows: any[] = []) => rows.find((a) => String(a.status || "").toLowerCase() !== "cancelled") || rows[0] || null;

  if (lead?.id) {
    const { data } = await supabase
      .from("appointments")
      .select("appointment_date, time_slot, status, updated_at")
      .eq("lead_id", lead.id)
      .order("updated_at", { ascending: false })
      .limit(10);
    const active = pickActive(data || []);
    if (active) return active;
  }

  const variants = phoneVariants(lead?.phone || phone);
  const { data: exact } = await supabase
    .from("appointments")
    .select("appointment_date, time_slot, status, lead_phone, updated_at")
    .in("lead_phone", variants)
    .order("updated_at", { ascending: false })
    .limit(10);
  const activeExact = pickActive(exact || []);
  if (activeExact) return activeExact;

  const last10 = phoneDigits(lead?.phone || phone).slice(-10);
  if (!last10) return null;
  const { data: candidates } = await supabase
    .from("appointments")
    .select("appointment_date, time_slot, status, lead_phone, updated_at")
    .order("updated_at", { ascending: false })
    .limit(2000);
  return pickActive((candidates || []).filter((a: any) => phoneDigits(a.lead_phone).slice(-10) === last10));
}

function templatePreview(body: string, order: string[], vars: Record<string, string>, templateName: string) {
  const rendered = String(body || "").replace(/\{\{(\d+)\}\}/g, (_, idx) => vars[order[Number(idx) - 1]] || "");
  return rendered.trim() ? rendered : `[Template] ${templateName}`;
}

function templateParam(value: string | undefined) {
  const text = String(value || "").trim();
  return text || INVISIBLE_EMPTY_TEXT;
}

async function buildVarsForRecipient(supabase: any, recip: any, _campaign: any): Promise<Record<string, string>> {
  const base: Record<string, string> = {
    name: recip.name || "",
    client_name: recip.name || "",
    artist_name: "",
    studio_name: "F19 Tattoo Studio",
    appointment_date: "",
    appointment_time: "",
    amount: "",
  };

  // Lookup lead by phone for real data — empty if not found
  try {
    const lead = await findLeadByPhone(supabase, recip.phone);

    if (lead?.full_name && !recip.name) base.client_name = base.name = lead.full_name;

    if (lead?.id) {
      // Latest appointment for date/time
      const appt = await findLatestAppointment(supabase, lead, recip.phone);
      if (appt?.appointment_date) base.appointment_date = String(appt.appointment_date);
      if (appt?.time_slot) base.appointment_time = String(appt.time_slot);

      // Artist from design task or completion
      const { data: dt } = await supabase
        .from("design_tasks")
        .select("artist_name")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dt?.artist_name) base.artist_name = dt.artist_name;
      if (!base.artist_name) {
        const { data: comp } = await supabase
          .from("tattoo_completions")
          .select("artist_name, tattoo_price")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (comp?.artist_name) base.artist_name = comp.artist_name;
        if (comp?.tattoo_price) base.amount = `₹${comp.tattoo_price}`;
      }
    }
  } catch { /* silent — keep empty defaults */ }

  // Recipient-level overrides win
  if (recip.template_variables && typeof recip.template_variables === "object") {
    for (const [k, v] of Object.entries(recip.template_variables)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") base[k] = String(v);
    }
  }
  return base;
}

async function sendOne(
  supabase: any,
  phoneNumberId: string,
  accessToken: string,
  recip: any,
  campaign: any,
): Promise<{ ok: boolean; messageId?: string | null; error?: string; raw?: any; preview?: string; vars?: Record<string, string> }> {
  const cleanPhone = String(recip.phone).replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  let payload: any;
  const vars = await buildVarsForRecipient(supabase, recip, campaign);
  const varOrder: string[] = Array.isArray(campaign.template_variables) ? campaign.template_variables : [];

  if (campaign.campaign_type === "template" && campaign.template_name) {
    const components = varOrder.length
      ? [{
          type: "body",
          parameters: varOrder.map((key: string) => ({ type: "text", text: templateParam(vars[key]) })),
        }]
      : undefined;

    payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: campaign.template_name,
        language: { code: campaign.template_language || "en_US" },
        ...(components ? { components } : {}),
      },
    };
  } else {
    const text = substitute(campaign.message_content || "", vars);
    if (campaign.cta_label && campaign.cta_type) {
      const id = campaign.cta_type === "book" ? "menu_book" : campaign.cta_type === "artist" ? "talk_to_artist" : "menu_designs";
      payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text },
          action: { buttons: [{ type: "reply", reply: { id, title: campaign.cta_label.slice(0, 20) } }] },
        },
      };
    } else {
      payload = { messaging_product: "whatsapp", to: cleanPhone, type: "text", text: { body: text } };
    }
  }

  const logPreview = campaign.campaign_type === "template"
    ? templatePreview(campaign.message_content || "", varOrder, vars, campaign.template_name)
    : campaign.message_content;

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => null);
    if (res.ok && j?.messages?.[0]?.id) return { ok: true, messageId: j.messages[0].id, raw: j, preview: logPreview, vars };
    return { ok: false, error: j?.error?.message || `HTTP ${res.status}`, raw: j, preview: logPreview, vars };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error", preview: logPreview, vars };
  }
}

async function logCampaignMessage(supabase: any, recip: any, campaign: any, campaignId: string, result: any, status: "sent" | "failed") {
  const leadRow = await findLeadByPhone(supabase, recip.phone);
  const templateName = campaign.campaign_type === "template" ? campaign.template_name : `campaign_${campaignId.slice(0, 8)}`;
  const { error } = await supabase.from("whatsapp_messages").insert({
    lead_phone: leadRow?.phone || recip.phone,
    lead_name: leadRow?.full_name || recip.name || "Unknown",
    lead_id: leadRow?.id || null,
    template_name: templateName,
    template_type: campaign.campaign_type === "template" ? "utility" : "promo",
    template_language: campaign.template_language || null,
    template_variables: result?.vars || recip.template_variables || {},
    status,
    meta_message_id: result?.messageId || null,
    error_message: status === "failed" ? result?.error || "Unknown error" : null,
    message_body: result?.preview || (campaign.campaign_type === "template" ? `[Template] ${templateName}` : campaign.message_content),
    message_type: campaign.campaign_type === "template" ? "template" : "text",
  });
  if (error) console.error("[send-bulk-campaign] whatsapp_messages log failed", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const respond = (p: unknown, status = 200) =>
    new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { campaignId } = await req.json();
    if (!campaignId) return respond({ error: "Missing campaignId" }, 400);

    const { data: campaign, error: campErr } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (campErr || !campaign) return respond({ error: "Campaign not found" }, 404);

    const { data: recipients } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "failed"]);
    if (!recipients || recipients.length === 0) return respond({ error: "No recipients" }, 400);

    const settings = await getSettings(supabase);
    const accessToken = settings["access_token"] || settings["whatsapp_access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const wabaId = settings["whatsapp_business_account_id"] || settings["waba_id"];
    const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken) return respond({ error: "WhatsApp access token not configured" }, 500);

    let phoneNumberId: string | null = null;
    if (wabaId) phoneNumberId = await resolvePhoneNumberId(wabaId, accessToken);
    if (!phoneNumberId && envPhoneId) phoneNumberId = envPhoneId;
    if (!phoneNumberId) return respond({ error: "Could not resolve Phone Number ID" }, 500);

    await supabase.from("campaigns").update({
      status: "sending",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    let sent = 0;
    let failed = 0;
    const failedForRetry: any[] = [];

    for (const recip of recipients) {
      if (sent + failed > 0) await new Promise(r => setTimeout(r, 700));
      const result = await sendOne(supabase, phoneNumberId, accessToken, recip, campaign);

      if (result.ok) {
        await supabase.from("campaign_recipients").update({
          status: "sent",
          meta_message_id: result.messageId,
          last_attempt_at: new Date().toISOString(),
          error_message: null,
        }).eq("id", recip.id);

        // Lookup lead so the message appears in CRM Chats
        const cleanLookup = String(recip.phone).replace(/[\s\-\(\)]/g, "");
        const { data: leadRow } = await supabase
          .from("leads")
          .select("id, full_name, phone")
          .in("phone", [cleanLookup, cleanLookup.replace(/^\+/, ""), `+${cleanLookup.replace(/^\+/, "")}`])
          .maybeSingle();

        await supabase.from("whatsapp_messages").insert({
          lead_phone: leadRow?.phone || recip.phone,
          lead_name: leadRow?.full_name || recip.name,
          lead_id: leadRow?.id || null,
          template_name: campaign.campaign_type === "template" ? campaign.template_name : `campaign_${campaignId.slice(0, 8)}`,
          template_type: campaign.campaign_type === "template" ? "utility" : "promo",
          template_language: campaign.template_language || null,
          template_variables: recip.template_variables || {},
          status: "sent",
          meta_message_id: result.messageId,
          message_body: campaign.campaign_type === "template"
            ? `[Template] ${campaign.template_name}`
            : campaign.message_content,
          message_type: campaign.campaign_type === "template" ? "template" : "text",
        });
        sent++;
      } else {
        await supabase.from("campaign_recipients").update({
          status: "failed",
          error_message: result.error || "Unknown error",
          retry_count: (recip.retry_count || 0) + 1,
          last_attempt_at: new Date().toISOString(),
        }).eq("id", recip.id);

        await supabase.from("whatsapp_messages").insert({
          lead_phone: recip.phone,
          lead_name: recip.name,
          template_name: campaign.template_name || `campaign_${campaignId.slice(0, 8)}`,
          template_type: campaign.campaign_type === "template" ? "utility" : "promo",
          template_language: campaign.template_language || null,
          status: "failed",
          error_message: result.error,
          message_body: campaign.message_content,
          message_type: campaign.campaign_type === "template" ? "template" : "text",
        });
        failed++;
        if ((recip.retry_count || 0) < 1) failedForRetry.push(recip);
      }
    }

    // Auto-retry failed once after 30s
    if (failedForRetry.length > 0) {
      await new Promise(r => setTimeout(r, 30_000));
      for (const recip of failedForRetry) {
        const r2 = await sendOne(supabase, phoneNumberId, accessToken, recip, campaign);
        if (r2.ok) {
          await supabase.from("campaign_recipients").update({
            status: "sent",
            meta_message_id: r2.messageId,
            error_message: null,
            retry_count: (recip.retry_count || 0) + 2,
            last_attempt_at: new Date().toISOString(),
          }).eq("id", recip.id);
          sent++;
          failed--;
        } else {
          await supabase.from("campaign_recipients").update({
            error_message: r2.error,
            retry_count: (recip.retry_count || 0) + 2,
            last_attempt_at: new Date().toISOString(),
          }).eq("id", recip.id);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }

    await supabase.from("campaigns").update({
      status: failed === 0 ? "sent" : (sent === 0 ? "failed" : "sent"),
      messages_sent: sent,
      failed_count: failed,
      total_recipients: recipients.length,
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    return respond({ success: true, sent, failed });
  } catch (err) {
    return respond({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
