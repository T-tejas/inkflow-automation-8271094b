import { supabase } from "@/integrations/supabase/client";
async function sendMetaConversion(eventName, opts) {
  try {
    const { error } = await supabase.functions.invoke("meta-conversions", {
      body: {
        eventName,
        phone: opts.phone,
        email: opts.email,
        leadId: opts.leadId,
        customData: opts.customData
      }
    });
    if (error) {
      console.error("[MetaConversions] Failed:", error);
    }
  } catch (err) {
    console.error("[MetaConversions] Exception:", err);
  }
}
export {
  sendMetaConversion
};
