import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRequest {
  phone: string;
  leadName: string;
  leadId?: string;
  templateType?: "confirmation" | "reminder" | "promo";
  templateName?: string;
  templateLanguage?: string;
  parameters?: string[];
  type?: "text" | "template";
  messageBody?: string;
}

const TEMPLATE_DEFAULTS: Record<string, { name: string; language: string }> = {
  confirmation: { name: "booking_confirmation", language: "en" },
  reminder: { name: "appointment_reminder", language: "en" },
  promo: { name: "promo_offer", language: "en" },
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getSettingsFromDb(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("setting_key, setting_value");
  const map: Record<string, string> = {};
  if (data) {
    for (const row of data) {
      if (row.setting_value) map[row.setting_key] = row.setting_value;
    }
  }
  return map;
}

async function resolvePhoneNumberIdFromWaba(wabaId: string, accessToken: string): Promise<string | null> {
  console.log(`[send-whatsapp] Resolving phone numbers from WABA: ${wabaId}`);
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    const errText = await response.text();
    console.error(`[send-whatsapp] WABA phone_numbers API failed: ${response.status} ${errText}`);
    return null;
  }
  try {
    const result = await response.json();
    console.log(`[send-whatsapp] WABA phone_numbers response:`, JSON.stringify(result));
    const firstId = result?.data?.[0]?.id;
    return typeof firstId === "string" && firstId.length > 0 ? firstId : null;
  } catch {
    return null;
  }
}

async function sendToMeta(phoneNumberId: string, accessToken: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let result: Record<string, any> | null = null;
  try { result = await response.json(); } catch { result = null; }
  return { response, result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read credentials: prefer DB settings, fallback to env secrets
    const dbSettings = await getSettingsFromDb(supabase);
    console.log(`[send-whatsapp] DB settings keys:`, Object.keys(dbSettings));

    const accessToken = dbSettings["access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const wabaId = dbSettings["whatsapp_business_account_id"];
    const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    console.log(`[send-whatsapp] WABA ID: ${wabaId}, envPhoneId: ${envPhoneId}, hasAccessToken: ${!!accessToken}`);

    if (!accessToken) {
      return json({ error: "WhatsApp access token not configured. Add it in WhatsApp Settings." }, 500);
    }

    // Resolve Phone Number ID: try WABA → phone_numbers API first, then fallback to env secret
    let phoneNumberId: string | null = null;

    if (wabaId) {
      phoneNumberId = await resolvePhoneNumberIdFromWaba(wabaId, accessToken);
      console.log(`[send-whatsapp] Resolved from WABA: ${phoneNumberId}`);
    }

    if (!phoneNumberId && envPhoneId) {
      phoneNumberId = envPhoneId;
      console.log(`[send-whatsapp] Fallback to env phoneId: ${phoneNumberId}`);
    }

    if (!phoneNumberId) {
      return json({ error: "Could not resolve WhatsApp Phone Number ID. Please set your WhatsApp Business Account ID in Settings." }, 500);
    }

    const body: SendRequest = await req.json();
    const { phone, leadName, leadId, type, messageBody, templateType, templateName, templateLanguage, parameters } = body;

    if (!phone || !leadName) {
      return json({ error: "Missing required fields: phone, leadName" }, 400);
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
    const isTextMessage = type === "text" && messageBody;

    let waPayload: Record<string, unknown>;

    if (isTextMessage) {
      waPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: messageBody },
      };
    } else {
      if (!templateType) {
        return json({ error: "Missing templateType for template message" }, 400);
      }
      const defaults = TEMPLATE_DEFAULTS[templateType];
      const finalTemplateName = templateName || defaults.name;
      const finalLanguage = templateLanguage || defaults.language;

      waPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: finalTemplateName,
          language: { code: finalLanguage },
          ...(parameters && parameters.length > 0
            ? { components: [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }] }
            : {}),
        },
      };
    }

    // Send to Meta
    let { response: metaResponse, result: metaResult } = await sendToMeta(phoneNumberId, accessToken, waPayload);

    // If error 100/33 (wrong object type), the envPhoneId might be wrong - already resolved from WABA above
    if (!metaResponse.ok && metaResult?.error?.code === 100 && metaResult?.error?.error_subcode === 33 && wabaId) {
      // Try resolving again with fresh call
      const freshId = await resolvePhoneNumberIdFromWaba(wabaId, accessToken);
      if (freshId && freshId !== phoneNumberId) {
        phoneNumberId = freshId;
        const retry = await sendToMeta(phoneNumberId, accessToken, waPayload);
        metaResponse = retry.response;
        metaResult = retry.result;
      }
    }

    const messageId = metaResult?.messages?.[0]?.id || null;
    const status = metaResponse.ok ? "sent" : "failed";
    const errorMessage = metaResponse.ok ? null : (metaResult?.error?.message || "Unknown error");

    const msgBody = isTextMessage
      ? messageBody
      : `📋 ${templateName || TEMPLATE_DEFAULTS[templateType!]?.name}${parameters ? ` (${parameters.join(", ")})` : ""}`;

    await supabase.from("whatsapp_messages").insert({
      lead_phone: phone,
      lead_name: leadName,
      lead_id: leadId ?? null,
      template_name: isTextMessage ? "text_message" : (templateName || TEMPLATE_DEFAULTS[templateType!]?.name),
      template_type: isTextMessage ? "confirmation" : templateType,
      status,
      meta_message_id: messageId,
      error_message: errorMessage,
      message_body: msgBody,
    });

    if (!metaResponse.ok) {
      return json({
        error: errorMessage,
        details: metaResult,
        troubleshooting: {
          resolvedPhoneNumberId: phoneNumberId,
          wabaId: wabaId || "not configured",
          steps: [
            "Go to WhatsApp Settings and verify your WhatsApp Business Account ID is correct.",
            "Ensure your Access Token has whatsapp_business_messaging permission.",
            "The token and WABA must belong to the same Meta Business.",
          ],
        },
      }, 502);
    }

    return json({ success: true, messageId, phoneNumberId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
