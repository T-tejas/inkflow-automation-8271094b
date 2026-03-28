import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(value.toLowerCase().trim()));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
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

    const { eventName, phone, email, leadId, customData } = await req.json();

    if (!eventName) {
      return json({ error: "eventName is required" }, 400);
    }

    // Get Meta Conversions API credentials from whatsapp_settings
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["meta_pixel_id", "meta_conversions_token", "meta_dataset_id"]);

    const pixelId =
      settings?.find((s: any) => s.setting_key === "meta_pixel_id")?.setting_value ||
      settings?.find((s: any) => s.setting_key === "meta_dataset_id")?.setting_value;
    const conversionToken = settings?.find(
      (s: any) => s.setting_key === "meta_conversions_token"
    )?.setting_value;

    if (!pixelId || !conversionToken) {
      return json({ error: "Meta Pixel ID or Conversions API token not configured" }, 400);
    }

    // Build user_data with hashed PII
    const userData: any = {};
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
      userData.ph = [await hashValue(cleanPhone)];
    }
    if (email) {
      userData.em = [await hashValue(email)];
    }

    // Map event names to Meta standard events
    const eventMap: Record<string, string> = {
      lead_submitted: "Lead",
      lead_qualified: "CompleteRegistration",
      booking_confirmed: "Schedule",
      tattoo_completed: "Purchase",
    };

    const metaEventName = eventMap[eventName] || eventName;

    const eventPayload = {
      data: [
        {
          event_name: metaEventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            lead_id: leadId || null,
            source: "f19_crm",
            ...customData,
          },
        },
      ],
      access_token: conversionToken,
    };

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );

    const result = await res.json();
    console.log(`[meta-conversions] ${metaEventName} response:`, JSON.stringify(result));

    // Log the event
    await supabase.from("system_logs").insert({
      log_type: "info",
      category: "general",
      message: `Meta Conversion: ${metaEventName} event sent`,
      details: { event_name: metaEventName, response: result, lead_id: leadId },
      lead_id: leadId || null,
    });

    return json({ success: true, eventName: metaEventName, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[meta-conversions] Error:", message);
    return json({ error: message }, 500);
  }
});
