import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRequest {
  phone: string;
  leadName: string;
  templateType: "confirmation" | "reminder" | "promo";
  templateName: string;
  templateLanguage?: string;
  parameters?: string[];
}

const TEMPLATE_DEFAULTS: Record<string, { name: string; language: string }> = {
  confirmation: { name: "booking_confirmation", language: "en" },
  reminder: { name: "appointment_reminder", language: "en" },
  promo: { name: "promo_offer", language: "en" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendRequest = await req.json();
    const { phone, leadName, templateType, templateName, templateLanguage, parameters } = body;

    if (!phone || !leadName || !templateType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, leadName, templateType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone: remove spaces, ensure starts with country code
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");

    const defaults = TEMPLATE_DEFAULTS[templateType];
    const finalTemplateName = templateName || defaults.name;
    const finalLanguage = templateLanguage || defaults.language;

    // Build Meta Cloud API payload
    const waPayload: Record<string, unknown> = {
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
                  parameters: parameters.map((p) => ({
                    type: "text",
                    text: p,
                  })),
                },
              ],
            }
          : {}),
      },
    };

    // Send via Meta Graph API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload),
      }
    );

    const metaResult = await metaResponse.json();

    // Log to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messageId = metaResult?.messages?.[0]?.id || null;
    const status = metaResponse.ok ? "sent" : "failed";
    const errorMessage = metaResponse.ok
      ? null
      : metaResult?.error?.message || "Unknown error";

    await supabase.from("whatsapp_messages").insert({
      lead_phone: phone,
      lead_name: leadName,
      template_name: finalTemplateName,
      template_type: templateType,
      status,
      meta_message_id: messageId,
      error_message: errorMessage,
    });

    if (!metaResponse.ok) {
      return new Response(
        JSON.stringify({ error: errorMessage, details: metaResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        templateName: finalTemplateName,
        templateType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
