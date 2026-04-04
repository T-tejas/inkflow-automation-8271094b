import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const results = { appointmentReminders: 0, designReminders: 0, paymentReminders: 0 };

    // 1. Appointment Reminders (1 day before)
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", tomorrowStr)
      .eq("reminder_1d_sent", false)
      .in("status", ["confirmed", "pending"]);

    if (appointments) {
      for (const apt of appointments) {
        try {
          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phone: apt.lead_phone,
              leadName: apt.lead_name,
              type: "text",
              messageBody: `⏰ Reminder: Your tattoo appointment is tomorrow at F19 Tattoo Studio.\n\n📅 Date: ${apt.appointment_date}\n🕐 Time: ${apt.time_slot}\n\nSee you there! Reply if you need to reschedule.`,
            },
          });
          await supabase.from("appointments").update({ reminder_1d_sent: true }).eq("id", apt.id);
          results.appointmentReminders++;
        } catch (e) {
          console.error("Appointment reminder failed:", apt.id, e);
        }
      }
    }

    // 2. Design Due Reminders (1 day before design_due_date)
    const { data: designs } = await supabase
      .from("design_tasks")
      .select("*")
      .eq("design_due_date", tomorrowStr)
      .in("design_status", ["Pending", "In Progress"]);

    if (designs) {
      // Get admin phone for artist notifications
      const { data: adminPhoneSetting } = await supabase
        .from("whatsapp_settings")
        .select("setting_value")
        .eq("setting_key", "admin_phone")
        .maybeSingle();
      const adminPhone = adminPhoneSetting?.setting_value;

      for (const design of designs) {
        try {
          // Notify via admin phone or client phone
          const notifyPhone = adminPhone || design.client_phone;
          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phone: notifyPhone,
              leadName: design.artist_name,
              type: "text",
              messageBody: `🎨 Design deadline is tomorrow for ${design.client_name}.\n\nArtist: ${design.artist_name}\nDesign Type: ${design.design_type}\n\nPlease complete it before the deadline.`,
            },
          });
          results.designReminders++;
        } catch (e) {
          console.error("Design reminder failed:", design.id, e);
        }
      }
    }

    // 3. Payment Pending Reminders (for booked leads with pending design fees)
    const { data: pendingFees } = await supabase
      .from("design_tasks")
      .select("*, appointments!inner(appointment_date, lead_phone)")
      .eq("fee_status", "pending")
      .gte("design_fee", 1);

    // Fallback: check design tasks with pending fees and upcoming appointments
    const { data: upcomingBooked } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", tomorrowStr)
      .in("status", ["confirmed", "pending"]);

    if (upcomingBooked) {
      for (const apt of upcomingBooked) {
        if (!apt.lead_id) continue;
        // Check if there are pending design fees
        const { data: pendingDesigns } = await supabase
          .from("design_tasks")
          .select("design_fee")
          .eq("lead_id", apt.lead_id)
          .eq("fee_status", "pending")
          .gte("design_fee", 1);

        if (pendingDesigns && pendingDesigns.length > 0) {
          const totalPending = pendingDesigns.reduce((s, d) => s + Number(d.design_fee), 0);
          try {
            await supabase.functions.invoke("send-whatsapp", {
              body: {
                phone: apt.lead_phone,
                leadName: apt.lead_name,
                type: "text",
                messageBody: `💰 Your remaining payment of ₹${totalPending} is pending.\n\nPlease clear before your appointment tomorrow.\n\nF19 Tattoo Studio`,
              },
            });
            results.paymentReminders++;
          } catch (e) {
            console.error("Payment reminder failed:", apt.id, e);
          }
        }
      }
    }

    // Log the run
    await supabase.from("system_logs").insert({
      log_type: "info",
      category: "automation",
      message: `Scheduled reminders sent: ${results.appointmentReminders} appointment, ${results.designReminders} design, ${results.paymentReminders} payment`,
      details: results,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
