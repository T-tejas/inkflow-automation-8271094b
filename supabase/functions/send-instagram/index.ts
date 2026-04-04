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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pageAccessToken = Deno.env.get("INSTAGRAM_PAGE_ACCESS_TOKEN");
    if (!pageAccessToken) {
      return json({ error: "INSTAGRAM_PAGE_ACCESS_TOKEN not configured" }, 500);
    }

    const body = await req.json();
    const { recipientId, leadName, leadId, messageBody, instagramUsername } = body;

    if (!recipientId || !messageBody) {
      return json({ error: "Missing required fields: recipientId, messageBody" }, 400);
    }

    // Send message via Instagram Graph API
    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageBody },
      }),
    });

    const result = await response.json();
    const messageId = result?.message_id || null;
    const status = response.ok ? "sent" : "failed";
    const errorMessage = response.ok ? null : (result?.error?.message || "Unknown error");

    // Log the outgoing message
    await supabase.from("instagram_messages").insert({
      lead_id: leadId || null,
      lead_name: leadName || "F19 Staff",
      instagram_username: instagramUsername || "",
      instagram_sender_id: recipientId,
      message_body: messageBody,
      message_type: "text",
      direction: "outgoing",
      status,
      meta_message_id: messageId,
      error_message: errorMessage,
    });

    if (!response.ok) {
      return json({ error: errorMessage, details: result }, 502);
    }

    return json({ success: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
