import { supabase } from "@/integrations/supabase/client";
import { logSystemError } from "./systemLogger";
async function sendAdminAlert(opts) {
  await supabase.from("crm_notifications").insert({
    lead_id: opts.leadId || null,
    lead_name: opts.leadName,
    lead_phone: opts.leadPhone,
    notification_type: opts.notificationType,
    chat_summary: opts.message,
    ...opts.extraData
  });
  try {
    const { data: settings } = await supabase.from("whatsapp_settings").select("setting_key, setting_value").in("setting_key", ["admin_phone"]);
    const adminPhone = settings?.find((s) => s.setting_key === "admin_phone")?.setting_value;
    if (!adminPhone) return;
    await supabase.functions.invoke("send-whatsapp", {
      body: {
        phone: adminPhone,
        leadName: "F19 System",
        messageBody: `\u{1F514} *${opts.notificationType.toUpperCase()}*

${opts.message}

Client: ${opts.leadName}
Phone: ${opts.leadPhone}`
      }
    });
  } catch (err) {
    await logSystemError("whatsapp", `Admin notification failed: ${err.message}`, { notificationType: opts.notificationType });
  }
}
export {
  sendAdminAlert
};
