import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function getSettings(supabase: any) {
  const { data } = await supabase.from("whatsapp_settings").select("setting_key, setting_value");
  const m: Record<string, string> = {};
  if (data) for (const r of data) if (r.setting_value) m[r.setting_key] = r.setting_value;
  return m;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const settings = await getSettings(supabase);

    const accessToken = settings["access_token"] || settings["whatsapp_access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const wabaId = settings["whatsapp_business_account_id"] || settings["waba_id"];

    if (!accessToken) return json({ error: "WhatsApp access token not configured" }, 400);
    if (!wabaId) return json({ error: "WhatsApp Business Account ID (WABA ID) not configured" }, 400);

    // Optional: testTemplate path
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.action === "test") {
        const { phone, templateName, language = "en_US", variables = [] } = body;
        if (!phone || !templateName) return json({ error: "phone and templateName required" }, 400);

        const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        const phoneRes = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?fields=id`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const phoneJson = await phoneRes.json().catch(() => null);
        const phoneNumberId = phoneJson?.data?.[0]?.id || envPhoneId;
        if (!phoneNumberId) return json({ error: "Could not resolve Phone Number ID" }, 500);

        const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
        const components = Array.isArray(variables) && variables.length
          ? [{ type: "body", parameters: variables.map((v: string) => ({ type: "text", text: String(v) })) }]
          : undefined;

        const payload: any = {
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: { name: templateName, language: { code: language }, ...(components ? { components } : {}) },
        };

        const r = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await r.json().catch(() => null);
        if (!r.ok) return json({ error: result?.error?.message || "Send failed", details: result }, 502);
        return json({ success: true, messageId: result?.messages?.[0]?.id, result });
      }
    }

    // GET → list approved templates
    const url = `https://graph.facebook.com/v22.0/${wabaId}/message_templates?fields=name,status,category,language,components&limit=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json().catch(() => null);
    if (!res.ok) return json({ error: data?.error?.message || "Failed to fetch templates", details: data }, 502);

    const templates = (data?.data || []).map((t: any) => {
      const bodyComp = (t.components || []).find((c: any) => c.type === "BODY");
      const bodyText: string = bodyComp?.text || "";
      const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
      return {
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        body: bodyText,
        variableCount: matches.length,
        components: t.components,
      };
    });

    return json({ templates });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
