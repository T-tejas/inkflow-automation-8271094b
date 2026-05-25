// Daily stale-lead alert: finds leads with no contact in 7+ days and notifies CRM + owner via WA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = ["New Lead", "Contacted", "Quoted", "Appointment Scheduled"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find stale leads
  const { data: stale, error } = await supabase
    .from("leads")
    .select("id, full_name, phone, status, last_contacted_at, updated_at")
    .in("status", ACTIVE_STATUSES)
    .or(`last_contacted_at.lt.${cutoff},and(last_contacted_at.is.null,updated_at.lt.${cutoff})`)
    .limit(100);

  if (error) {
    console.error("[stale-lead-alerts] query error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let created = 0;
  for (const lead of stale || []) {
    // Skip if already notified in last 24h
    const { data: existingNotif } = await supabase
      .from("crm_notifications")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("notification_type", "stale_lead")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();
    if (existingNotif) continue;

    await supabase.from("crm_notifications").insert({
      lead_id: lead.id,
      lead_name: lead.full_name,
      lead_phone: lead.phone,
      notification_type: "stale_lead",
      lead_source: "system",
      chat_summary: `⚠️ Stale lead: no contact in 7+ days. Status: ${lead.status}`,
    });
    created++;
  }

  console.log(`[stale-lead-alerts] notified ${created} stale leads (of ${stale?.length || 0} found)`);
  return new Response(JSON.stringify({ checked: stale?.length || 0, notified: created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
