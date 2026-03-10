import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSettingsFromDb(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from("whatsapp_settings").select("setting_key, setting_value");
  const map: Record<string, string> = {};
  if (data) for (const row of data) { if (row.setting_value) map[row.setting_key] = row.setting_value; }
  return map;
}

async function resolvePhoneNumberId(wabaId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    const result = await response.json();
    return result?.data?.[0]?.id || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { campaignId } = await req.json();

    if (!campaignId) return new Response(JSON.stringify({ error: "Missing campaignId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get campaign
    const { data: campaign, error: campErr } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (campErr || !campaign) return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get recipients
    const { data: recipients } = await supabase.from("campaign_recipients").select("*").eq("campaign_id", campaignId).eq("status", "pending");
    if (!recipients || recipients.length === 0) return new Response(JSON.stringify({ error: "No recipients" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get WhatsApp credentials
    const settings = await getSettingsFromDb(supabase);
    const accessToken = settings["access_token"] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const wabaId = settings["whatsapp_business_account_id"];
    const envPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken) return new Response(JSON.stringify({ error: "No WhatsApp access token" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let phoneNumberId: string | null = null;
    if (wabaId) phoneNumberId = await resolvePhoneNumberId(wabaId, accessToken);
    if (!phoneNumberId && envPhoneId) phoneNumberId = envPhoneId;
    if (!phoneNumberId) return new Response(JSON.stringify({ error: "No phone number ID" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update campaign status
    await supabase.from("campaigns").update({ status: "sending", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaignId);

    let sentCount = 0;
    let failedCount = 0;

    for (const recip of recipients) {
      const cleanPhone = recip.phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
      const personalizedMsg = campaign.message_content.replace(/\{\{name\}\}/g, recip.name);

      try {
        // Add delay between messages to avoid rate limiting
        if (sentCount > 0) await new Promise(r => setTimeout(r, 1000));

        const payload: any = { messaging_product: "whatsapp", to: cleanPhone, type: "text", text: { body: personalizedMsg } };

        // If CTA is set, send as interactive button
        if (campaign.cta_label && campaign.cta_type) {
          const ctaButtonId = campaign.cta_type === "book" ? "menu_book" : campaign.cta_type === "artist" ? "talk_to_artist" : "menu_designs";
          payload.type = "interactive";
          payload.interactive = {
            type: "button",
            body: { text: personalizedMsg },
            action: { buttons: [{ type: "reply", reply: { id: ctaButtonId, title: campaign.cta_label.slice(0, 20) } }] },
          };
          delete payload.text;
        }

        const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);
        const metaMsgId = result?.messages?.[0]?.id || null;

        if (response.ok && metaMsgId) {
          await supabase.from("campaign_recipients").update({ status: "sent", meta_message_id: metaMsgId }).eq("id", recip.id);
          // Log in whatsapp_messages
          await supabase.from("whatsapp_messages").insert({
            lead_phone: recip.phone, lead_name: recip.name, lead_id: null,
            template_name: `campaign_${campaignId.slice(0, 8)}`, template_type: "promo",
            status: "sent", meta_message_id: metaMsgId, message_body: personalizedMsg, message_type: "text",
          });
          sentCount++;
        } else {
          await supabase.from("campaign_recipients").update({ status: "failed" }).eq("id", recip.id);
          failedCount++;
        }
      } catch (err) {
        console.error(`[bulk] Failed to send to ${recip.phone}:`, err);
        await supabase.from("campaign_recipients").update({ status: "failed" }).eq("id", recip.id);
        failedCount++;
      }
    }

    // Update campaign stats
    await supabase.from("campaigns").update({
      status: "sent",
      messages_sent: sentCount,
      total_recipients: recipients.length,
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
