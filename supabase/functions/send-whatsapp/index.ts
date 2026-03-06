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
  // Template fields
  templateType?: "confirmation" | "reminder" | "promo";
  templateName?: string;
  templateLanguage?: string;
  parameters?: string[];
  // Text message fields
  type?: "text" | "template";
  messageBody?: string;
}

interface MetaErrorInfo {
  message: string;
  code?: number;
  subcode?: number;
  type?: string;
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

async function sendToMeta(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result: Record<string, any> | null = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  return { response, result };
}

async function resolvePhoneNumberIdFromWaba(objectId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${objectId}/phone_numbers?fields=id,display_phone_number`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) return null;

  let result: Record<string, any> | null = null;
  try {
    result = await response.json();
  } catch {
    return null;
  }

  const firstPhoneId = result?.data?.[0]?.id;
  return typeof firstPhoneId === "string" && firstPhoneId.length > 0 ? firstPhoneId : null;
}

function extractMetaError(metaResult: Record<string, any> | null): MetaErrorInfo {
  return {
    message: metaResult?.error?.message || "Unknown error",
    code: metaResult?.error?.code,
    subcode: metaResult?.error?.error_subcode,
    type: metaResult?.error?.type,
  };
}

function isUnsupportedObjectIdError(metaError: MetaErrorInfo): boolean {
  return metaError.code === 100 && metaError.subcode === 33;
}

function buildConfigurationHint(metaError: MetaErrorInfo, configuredObjectId: string): string {
  if (isUnsupportedObjectIdError(metaError)) {
    return `Invalid WhatsApp object ID (${configuredObjectId}). Use WhatsApp Phone Number ID (not Facebook App ID or WABA ID), and ensure the access token belongs to the same Meta app/business.`;
  }

  return metaError.message;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const configuredObjectId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !configuredObjectId) {
      return json({ error: "WhatsApp credentials not configured" }, 500);
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
            ? {
                components: [
                  {
                    type: "body",
                    parameters: parameters.map((p) => ({ type: "text", text: p })),
                  },
                ],
              }
            : {}),
        },
      };
    }

    let usedPhoneNumberId = configuredObjectId;
    let { response: metaResponse, result: metaResult } = await sendToMeta(usedPhoneNumberId, accessToken, waPayload);

    const firstMetaError = extractMetaError(metaResult);

    // Auto-recovery: if user accidentally configured WABA ID in WHATSAPP_PHONE_NUMBER_ID,
    // resolve the first phone number ID and retry once.
    if (!metaResponse.ok && isUnsupportedObjectIdError(firstMetaError)) {
      const resolvedPhoneId = await resolvePhoneNumberIdFromWaba(configuredObjectId, accessToken);
      if (resolvedPhoneId) {
        usedPhoneNumberId = resolvedPhoneId;
        const retry = await sendToMeta(usedPhoneNumberId, accessToken, waPayload);
        metaResponse = retry.response;
        metaResult = retry.result;
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messageId = metaResult?.messages?.[0]?.id || null;
    const status = metaResponse.ok ? "sent" : "failed";
    const metaError = extractMetaError(metaResult);
    const errorMessage = metaResponse.ok
      ? null
      : buildConfigurationHint(metaError, configuredObjectId);

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
      return json(
        {
          error: errorMessage,
          details: metaResult,
          troubleshooting: {
            configuredObjectId,
            usedPhoneNumberId,
            steps: [
              "Set WHATSAPP_PHONE_NUMBER_ID to the WhatsApp Phone Number ID from Meta API Setup (not App ID/WABA ID).",
              "Use a permanent System User token with whatsapp_business_messaging and whatsapp_business_management permissions.",
              "Ensure the token and phone number belong to the same Meta app/business.",
              "If your app is in test mode, add recipient numbers to the allowed list.",
            ],
          },
        },
        502
      );
    }

    return json({ success: true, messageId, usedPhoneNumberId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
