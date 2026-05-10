import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOLLOWUP_MESSAGE = "Hey, just checking 😊 Are you still interested in getting a tattoo? We'd love to help you out!";

function normalize(value: string | null | undefined) {
  if (!value) return "";
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  v = v.replace(/^Bearer\s+/i, "").trim();
  v = v.replace(/[\r\n\t\s]+/g, "");
  return v;
}

async function getToken(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("setting_value")
    .eq("setting_key", "instagram_page_access_token")
    .maybeSingle();
  const dbToken = normalize(data?.setting_value);
  if (dbToken) return dbToken;
  return normalize(Deno.env.get("INSTAGRAM_PAGE_ACCESS_TOKEN"));
}

async function getPageId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("setting_value")
    .eq("setting_key", "instagram_page_id")
    .maybeSingle();
  const dbId = normalize(data?.setting_value);
  if (dbId) return dbId;
  return normalize(Deno.env.get("INSTAGRAM_PAGE_ID"));
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

    const token = await getToken(supabase);
    if (!token) {
      console.log("[ig-followup] No Instagram token configured");
      return new Response(JSON.stringify({ skipped: true, reason: "No token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageId = await getPageId(supabase);
    const endpoint = pageId
      ? `https://graph.facebook.com/v21.0/${pageId}/messages`
      : `https://graph.facebook.com/v21.0/me/messages`;

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
    let skipped = 0;
    let authError = false;

    for (const conv of staleConversations || []) {
      // Dedupe: if we already logged the same follow-up text recently, skip
      const { data: existing } = await supabase
        .from("instagram_messages")
        .select("id")
        .eq("instagram_sender_id", conv.instagram_sender_id)
        .eq("message_body", FOLLOWUP_MESSAGE)
        .eq("direction", "outgoing")
        .limit(1);

      if (existing && existing.length > 0) {
        // Already attempted; mark state so scheduler doesn't keep picking it up
        await supabase
          .from("instagram_bot_state")
          .update({ followup_sent: true, updated_at: new Date().toISOString() })
          .eq("id", conv.id);
        skipped++;
        continue;
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: conv.instagram_sender_id },
            message: { text: FOLLOWUP_MESSAGE },
          }),
        });

        const result = await response.json();
        const messageId = result?.message_id || null;
        const errorCode = result?.error?.code;

        if (response.ok) {
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

          await supabase
            .from("instagram_bot_state")
            .update({ followup_sent: true, updated_at: new Date().toISOString() })
            .eq("id", conv.id);

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
        } else {
          console.error(`[ig-followup] Failed for ${conv.instagram_sender_id}:`, JSON.stringify(result));
          failed++;

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

          // Mark as attempted to prevent re-spamming on next cron run
          await supabase
            .from("instagram_bot_state")
            .update({ followup_sent: true, updated_at: new Date().toISOString() })
            .eq("id", conv.id);

          // If it's an auth/token error, stop the entire batch — token is broken
          if (errorCode === 190 || errorCode === 10 || errorCode === 200) {
            authError = true;
            await supabase.from("system_logs").insert({
              log_type: "error",
              category: "instagram",
              message: `Instagram follow-up aborted: invalid access token (code ${errorCode})`,
              details: { error: result?.error },
            });
            break;
          }
        }
      } catch (err) {
        console.error(`[ig-followup] Error for ${conv.instagram_sender_id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, skipped, authError, total: staleConversations?.length || 0 }),
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
