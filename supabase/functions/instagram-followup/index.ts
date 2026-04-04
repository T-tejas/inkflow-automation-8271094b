import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FOLLOWUP_MESSAGE = "Hey, just checking 😊 Are you still interested in getting a tattoo? We'd love to help you out!";

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
      console.log("[ig-followup] No INSTAGRAM_PAGE_ACCESS_TOKEN configured");
      return new Response(JSON.stringify({ skipped: true, reason: "No token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find bot states where:
    // 1. Bot is enabled
    // 2. Last message was >24 hours ago
    // 3. Follow-up not yet sent
    // 4. Current step is NOT "completed" (still in qualification)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleConversations, error } = await supabase
      .from("instagram_bot_state")
      .select("*")
      .eq("bot_enabled", true)
      .eq("followup_sent", false)
      .neq("current_step", "completed")
      .neq("current_step", "greeting")
      .lt("last_message_at", twentyFourHoursAgo);

    if (error) {
      console.error("[ig-followup] Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ig-followup] Found ${staleConversations?.length || 0} stale conversations`);

    let sent = 0;
    let failed = 0;

    for (const conv of staleConversations || []) {
      try {
        // Send follow-up message via Instagram API
        const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pageAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: conv.instagram_sender_id },
            message: { text: FOLLOWUP_MESSAGE },
          }),
        });

        const result = await response.json();
        const messageId = result?.message_id || null;

        if (response.ok) {
          // Log outgoing message
          await supabase.from("instagram_messages").insert({
            lead_id: conv.lead_id,
            lead_name: "F19 Bot",
            instagram_username: "f19tattoostudio",
            instagram_sender_id: conv.instagram_sender_id,
            message_body: FOLLOWUP_MESSAGE,
            message_type: "text",
            direction: "outgoing",
            status: "sent",
            meta_message_id: messageId,
          });

          // Mark follow-up as sent
          await supabase
            .from("instagram_bot_state")
            .update({ followup_sent: true, updated_at: new Date().toISOString() })
            .eq("id", conv.id);

          // Tag lead as "Cold Lead" if no response
          if (conv.lead_id) {
            await supabase
              .from("leads")
              .update({
                tags: ["instagram_inquiry", "cold_lead"],
                lead_score: "COLD",
                updated_at: new Date().toISOString(),
              } as any)
              .eq("id", conv.lead_id);
          }

          sent++;
          console.log(`[ig-followup] Sent to ${conv.instagram_sender_id}`);
        } else {
          console.error(`[ig-followup] Failed for ${conv.instagram_sender_id}:`, JSON.stringify(result));
          failed++;

          // Log failed message
          await supabase.from("instagram_messages").insert({
            lead_id: conv.lead_id,
            lead_name: "F19 Bot",
            instagram_username: "f19tattoostudio",
            instagram_sender_id: conv.instagram_sender_id,
            message_body: FOLLOWUP_MESSAGE,
            message_type: "text",
            direction: "outgoing",
            status: "failed",
            error_message: result?.error?.message || "Unknown error",
          });
        }
      } catch (err) {
        console.error(`[ig-followup] Error for ${conv.instagram_sender_id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: staleConversations?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ig-followup] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
