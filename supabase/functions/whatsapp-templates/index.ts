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

async function metaGet(path: string, token: string) {
  const r = await fetch(`https://graph.facebook.com/v22.0/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

/**
 * Resolves the real WhatsApp Business Account ID.
 * Handles three cases the user might have stored:
 *   1. Already a WABA ID → returned as-is.
 *   2. A Phone Number ID → resolves via `?fields=whatsapp_business_account`.
 *   3. Garbage / wrong ID → returns null + reason.
 */
async function resolveWaba(storedId: string, token: string) {
  // 1) Maybe it IS already a WABA — try fetching templates lightly
  const tplProbe = await metaGet(`${storedId}/message_templates?limit=1`, token);
  if (tplProbe.ok) {
    return { wabaId: storedId, autoResolvedFrom: null, kind: "waba_id", probe: { ok: true } };
  }

  // 2) Maybe it's a Phone Number ID — try to get its parent WABA
  const phoneProbe = await metaGet(`${storedId}?fields=display_phone_number,verified_name`, token);
  if (phoneProbe.ok && phoneProbe.body?.display_phone_number) {
    // Try owning WABA via business account chain
    const owner = await metaGet(`${storedId}?fields=account_mode,messaging_limit_tier`, token);
    // Enumerate WABAs accessible by this token and match by phone_numbers
    const businesses = await metaGet(`me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`, token);
    const owned: any[] = [];
    for (const biz of businesses.body?.data || []) {
      for (const w of biz?.owned_whatsapp_business_accounts?.data || []) {
        owned.push(w);
        for (const p of w?.phone_numbers?.data || []) {
          if (String(p.id) === String(storedId)) {
            return { wabaId: w.id, autoResolvedFrom: storedId, kind: "phone_number_id", probe: { phone: phoneProbe.body, matchedWaba: w } };
          }
        }
      }
    }
    return { wabaId: null, autoResolvedFrom: storedId, kind: "phone_number_id_no_match", probe: { phone: phoneProbe.body, owner: owner.body, candidate_wabas: owned } };
  }

  // 3) Last resort — enumerate WABAs and return list as candidates
  const businesses = await metaGet(`me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`, token);
  const candidates: any[] = [];
  for (const biz of businesses.body?.data || []) {
    for (const w of biz?.owned_whatsapp_business_accounts?.data || []) candidates.push(w);
  }
  return { wabaId: null, autoResolvedFrom: null, kind: "unknown", probe: { tplProbe: tplProbe.body, phoneProbe: phoneProbe.body, candidate_wabas: candidates } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const settings = await getSettings(supabase);

    const accessToken =
      settings["access_token"] || settings["whatsapp_access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const storedWabaId =
      settings["whatsapp_business_account_id"] || settings["waba_id"];

    if (!accessToken) return json({ error: "WhatsApp access token not configured", debug: { settingsKeys: Object.keys(settings) } }, 400);
    if (!storedWabaId) return json({ error: "WhatsApp Business Account ID not configured", debug: { settingsKeys: Object.keys(settings) } }, 400);

    // Token permission probe
    const tokenInfo = await metaGet(`debug_token?input_token=${encodeURIComponent(accessToken)}`, accessToken);

    // Auto-resolve WABA (handles stored Phone Number ID)
    const resolved = await resolveWaba(storedWabaId, accessToken);

    // If we auto-resolved, persist the real WABA back so future calls are clean
    if (resolved.wabaId && resolved.autoResolvedFrom) {
      await supabase
        .from("whatsapp_settings")
        .upsert(
          { setting_key: "whatsapp_business_account_id", setting_value: resolved.wabaId, updated_at: new Date().toISOString() },
          { onConflict: "setting_key" },
        );
    }

    const debug: any = {
      stored_id: storedWabaId,
      resolved_waba_id: resolved.wabaId,
      auto_resolved: !!resolved.autoResolvedFrom,
      id_kind: resolved.kind,
      probe: resolved.probe,
      token_scopes: tokenInfo.body?.data?.scopes || tokenInfo.body?.data?.granular_scopes || null,
      token_valid: tokenInfo.body?.data?.is_valid ?? null,
      token_expires_at: tokenInfo.body?.data?.expires_at ?? null,
    };

    // Test action (single send) — POST { action: 'test', ... }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.action === "test") {
        const { phone, templateName, language = "en_US", variables = [] } = body;
        if (!phone || !templateName) return json({ error: "phone and templateName required" }, 400);
        if (!resolved.wabaId) return json({ error: "Could not resolve WABA ID", debug }, 400);

        const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        const phoneRes = await metaGet(`${resolved.wabaId}/phone_numbers?fields=id`, accessToken);
        const phoneNumberId = phoneRes.body?.data?.[0]?.id || envPhoneId;
        if (!phoneNumberId) return json({ error: "Could not resolve Phone Number ID", debug }, 500);

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
        if (!r.ok) return json({ error: result?.error?.message || "Send failed", details: result, debug }, 502);

        // Log to whatsapp_messages so it appears in CRM Chats
        try {
          const variants = [`+${cleanPhone}`, cleanPhone];
          const { data: lead } = await supabase
            .from("leads")
            .select("id, full_name, phone")
            .in("phone", variants)
            .maybeSingle();

          await supabase.from("whatsapp_messages").insert({
            lead_phone: lead?.phone || `+${cleanPhone}`,
            lead_name: lead?.full_name || "Test Recipient",
            lead_id: lead?.id || null,
            template_name: templateName,
            template_type: "utility",
            template_language: language,
            template_variables: variables,
            status: "sent",
            meta_message_id: result?.messages?.[0]?.id,
            message_body: `[Template] ${templateName}${Array.isArray(variables) && variables.length ? ` — ${variables.join(" | ")}` : ""}`,
            message_type: "template",
          });
        } catch (logErr) {
          console.error("[whatsapp-templates] log failed:", logErr);
        }

        return json({ success: true, messageId: result?.messages?.[0]?.id, result, debug });
      }
    }

    if (!resolved.wabaId) {
      return json({
        error: `Could not resolve a valid WhatsApp Business Account ID from "${storedWabaId}". Open Meta Business Manager → WhatsApp Accounts and copy the WABA ID (numeric, shown above the phone number).`,
        templates: [],
        debug,
      }, 200);
    }

    // Fetch all templates (no status filter, but expose status per item; UI will display)
    const tplUrl = `${resolved.wabaId}/message_templates?fields=name,status,category,language,components&limit=200`;
    const tplRes = await metaGet(tplUrl, accessToken);

    if (!tplRes.ok) {
      return json({
        error: tplRes.body?.error?.message || "Failed to fetch templates",
        templates: [],
        debug: { ...debug, meta_response: tplRes.body, endpoint: tplUrl },
      }, 200);
    }

    const raw = tplRes.body?.data || [];
    const templates = raw.map((t: any) => {
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

    return json({
      templates,
      debug: { ...debug, raw_count: raw.length, approved_count: templates.filter((t: any) => t.status === "APPROVED").length, endpoint: tplUrl },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error", templates: [] }, 200);
  }
});
