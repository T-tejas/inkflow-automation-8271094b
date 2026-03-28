import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "meta_lead_verify_token");

    const verifyToken = settings?.[0]?.setting_value || "f19_meta_leads";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[meta-lead-webhook] Verification successful");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST = Lead data from Meta
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("[meta-lead-webhook] Received:", JSON.stringify(body));

    const entries = body?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const pageId = change.value?.page_id;
        const adId = change.value?.ad_id;
        const createdTime = change.value?.created_time;

        console.log(`[meta-lead-webhook] Processing leadgen_id: ${leadgenId}, form_id: ${formId}`);

        // Fetch lead data from Meta Graph API
        const { data: tokenSettings } = await supabase
          .from("whatsapp_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["meta_page_access_token", "access_token"]);

        const pageAccessToken = tokenSettings?.find(
          (s: any) => s.setting_key === "meta_page_access_token"
        )?.setting_value;
        const fallbackToken = tokenSettings?.find(
          (s: any) => s.setting_key === "access_token"
        )?.setting_value;
        const accessToken = pageAccessToken || fallbackToken;

        if (!accessToken) {
          console.error("[meta-lead-webhook] No access token found");
          await supabase.from("system_logs").insert({
            log_type: "error",
            category: "general",
            message: "Meta Lead webhook: No access token configured",
            details: { leadgen_id: leadgenId, form_id: formId },
          });
          continue;
        }

        // Fetch lead details from Meta
        let leadData: any = null;
        try {
          const res = await fetch(
            `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`
          );
          if (res.ok) {
            leadData = await res.json();
            console.log("[meta-lead-webhook] Lead data:", JSON.stringify(leadData));
          } else {
            const errText = await res.text();
            console.error("[meta-lead-webhook] Failed to fetch lead:", errText);
            await supabase.from("system_logs").insert({
              log_type: "error",
              category: "general",
              message: `Meta Lead fetch failed: ${res.status}`,
              details: { leadgen_id: leadgenId, error: errText },
            });
          }
        } catch (fetchErr: any) {
          console.error("[meta-lead-webhook] Fetch error:", fetchErr);
          await supabase.from("system_logs").insert({
            log_type: "error",
            category: "general",
            message: `Meta Lead fetch exception: ${fetchErr.message}`,
            details: { leadgen_id: leadgenId },
          });
        }

        // Parse field data from Meta form
        const fieldData = leadData?.field_data || [];
        const getField = (name: string): string =>
          fieldData.find((f: any) =>
            f.name?.toLowerCase().includes(name.toLowerCase())
          )?.values?.[0] || "";

        const fullName = getField("full_name") || getField("name") || "Meta Lead";
        let phone = getField("phone_number") || getField("phone") || getField("whatsapp");
        const email = getField("email");
        const tattooIdea = getField("tattoo") || getField("design") || getField("idea");
        const placement = getField("placement") || getField("body_part") || getField("location");
        const size = getField("size");
        const budget = getField("budget") || getField("price");
        const timeline = getField("timeline") || getField("when");

        // Clean phone number
        if (phone) {
          phone = phone.replace(/[\s\-\(\)]/g, "");
          if (!phone.startsWith("+")) {
            phone = phone.startsWith("91") ? `+${phone}` : `+91${phone}`;
          }
        }

        if (!phone) {
          console.warn("[meta-lead-webhook] No phone number found in lead data");
          await supabase.from("system_logs").insert({
            log_type: "error",
            category: "general",
            message: "Meta Lead: No phone number in form submission",
            details: { leadgen_id: leadgenId, field_data: fieldData },
          });
          continue;
        }

        // Check for duplicate lead by phone
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id, full_name, status")
          .eq("phone", phone)
          .limit(1);

        let leadId: string;
        let leadName = fullName;

        if (existingLead && existingLead.length > 0) {
          // Update existing lead with new info
          leadId = existingLead[0].id;
          leadName = existingLead[0].full_name;
          const updateData: any = { updated_at: new Date().toISOString() };
          if (tattooIdea) updateData.tattoo_style = tattooIdea;
          if (placement) updateData.placement = placement;
          if (size) updateData.size = size;
          if (budget) updateData.budget = budget;
          if (timeline) updateData.timeline = timeline;

          await supabase.from("leads").update(updateData).eq("id", leadId);
          console.log(`[meta-lead-webhook] Updated existing lead: ${leadId}`);
        } else {
          // Create new lead
          const tags = ["meta_ads"];
          if (adId) tags.push(`ad:${adId}`);

          const { data: newLead, error: insertErr } = await supabase
            .from("leads")
            .insert({
              full_name: fullName,
              phone,
              source: "Meta Ads",
              status: "New Lead",
              tattoo_style: tattooIdea || "Other",
              placement: placement || "",
              size: size || "Medium (4-6 in)",
              budget: budget || "",
              timeline: timeline || "",
              tags,
              notes: email ? `Email: ${email}` : "",
              whatsapp_opt_in: true,
              bot_enabled: true,
            })
            .select("id")
            .single();

          if (insertErr || !newLead) {
            console.error("[meta-lead-webhook] Failed to create lead:", insertErr);
            await supabase.from("system_logs").insert({
              log_type: "error",
              category: "general",
              message: `Meta Lead creation failed: ${insertErr?.message}`,
              details: { phone, fullName, leadgen_id: leadgenId },
            });
            continue;
          }

          leadId = newLead.id;
          console.log(`[meta-lead-webhook] Created new lead: ${leadId}`);

          // Log interaction
          await supabase.from("lead_interactions").insert({
            lead_id: leadId,
            action_type: "meta_lead_created",
            new_value: "New Lead",
            note: `Source: Meta Ads | Form: ${formId} | Ad: ${adId || "N/A"}`,
          });
        }

        // Send auto WhatsApp welcome message
        try {
          await sendAutoWelcome(supabase, phone, leadName, leadId);
        } catch (err: any) {
          console.error("[meta-lead-webhook] Auto welcome failed:", err);
          await supabase.from("system_logs").insert({
            log_type: "error",
            category: "whatsapp",
            message: `Auto WhatsApp welcome failed: ${err.message}`,
            details: { phone, leadId },
            lead_id: leadId,
          });
        }

        // Create CRM notification
        await supabase.from("crm_notifications").insert({
          lead_id: leadId,
          lead_name: leadName,
          lead_phone: phone,
          notification_type: "meta_lead",
          tattoo_idea: tattooIdea || null,
          placement: placement || null,
          size: size || null,
          budget: budget || null,
          lead_source: "Meta Ads",
          lead_score: null,
          timeline: timeline || null,
          chat_summary: `New lead from Meta Ads form (${formId})`,
        });

        // Send Meta Conversions API event
        try {
          await sendConversionEvent(supabase, "Lead", phone, email, {
            lead_id: leadId,
            form_id: formId,
            ad_id: adId,
          });
        } catch (convErr: any) {
          console.error("[meta-lead-webhook] Conversion event failed:", convErr);
        }

        // Notify admin via WhatsApp
        try {
          const { data: adminSettings } = await supabase
            .from("whatsapp_settings")
            .select("setting_key, setting_value")
            .eq("setting_key", "admin_phone");

          const adminPhone = adminSettings?.[0]?.setting_value;
          if (adminPhone) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                phone: adminPhone,
                leadName: "F19 System",
                messageBody: `🔔 *NEW META LEAD*\n\nName: ${leadName}\nPhone: ${phone}\nTattoo: ${tattooIdea || "Not specified"}\nBudget: ${budget || "Not specified"}\nPlacement: ${placement || "Not specified"}\n\nSource: Meta Ads`,
              }),
            });
          }
        } catch (adminErr: any) {
          console.error("[meta-lead-webhook] Admin alert failed:", adminErr);
        }
      }
    }

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[meta-lead-webhook] Error:", message);
    return json({ error: message }, 500);
  }
});

// ─── Auto Welcome Message ────────────────────────────────────────────

async function sendAutoWelcome(
  supabase: any,
  phone: string,
  leadName: string,
  leadId: string
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const welcomeMsg = `Hi ${leadName} 👋 Thank you for contacting F19 Tattoo Studio!\n\nPlease share your tattoo idea, placement, size, and budget so we can guide you better. 🎨\n\nOur artist will personally connect with you once we understand your requirements.`;

  await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      phone,
      leadName,
      leadId,
      messageBody: welcomeMsg,
    }),
  });
}

// ─── Meta Conversions API ────────────────────────────────────────────

async function sendConversionEvent(
  supabase: any,
  eventName: string,
  phone?: string,
  email?: string,
  customData?: Record<string, any>
) {
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
    console.log("[meta-conversions] Pixel ID or token not configured, skipping");
    return;
  }

  const userData: any = {};
  if (phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
    // Hash for privacy (SHA-256)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cleanPhone));
    userData.ph = [Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")];
  }
  if (email) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(email.toLowerCase().trim()));
    userData.em = [Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")];
  }

  const eventData = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        user_data: userData,
        custom_data: customData || {},
      },
    ],
    access_token: conversionToken,
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      }
    );
    const result = await res.json();
    console.log(`[meta-conversions] ${eventName} event sent:`, JSON.stringify(result));

    await supabase.from("system_logs").insert({
      log_type: "info",
      category: "general",
      message: `Meta Conversion: ${eventName} event sent`,
      details: { event_name: eventName, response: result },
    });
  } catch (err: any) {
    console.error(`[meta-conversions] Failed to send ${eventName}:`, err);
    await supabase.from("system_logs").insert({
      log_type: "error",
      category: "general",
      message: `Meta Conversion failed: ${eventName} - ${err.message}`,
      details: { event_name: eventName },
    });
  }
}
