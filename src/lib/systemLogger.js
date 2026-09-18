import { supabase } from "@/integrations/supabase/client";
async function logSystemError(category, message, details, leadId) {
  try {
    await supabase.from("system_logs").insert({
      log_type: "error",
      category,
      message,
      details: details || {},
      lead_id: leadId || null
    });
  } catch (e) {
    console.error("[SystemLogger] Failed to log error:", e);
  }
}
async function logSystemInfo(category, message, details, leadId) {
  try {
    await supabase.from("system_logs").insert({
      log_type: "info",
      category,
      message,
      details: details || {},
      lead_id: leadId || null
    });
  } catch (e) {
    console.error("[SystemLogger] Failed to log info:", e);
  }
}
export {
  logSystemError,
  logSystemInfo
};
