import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const DEFAULT_CONSENT_TEXT = `TATTOO CONSENT & RELEASE FORM

F19 Tattoo Studio

I, the undersigned, hereby consent to the application of a tattoo by the artists at F19 Tattoo Studio.

I acknowledge that:
1. I am not under the influence of alcohol or drugs.
2. I do not have any medical conditions that may affect the healing process (diabetes, hemophilia, heart conditions, etc.).
3. I am not pregnant or nursing.
4. I am at least 18 years of age.
5. I have been informed of the aftercare procedures and will follow them.
6. I understand that tattoos are permanent and that touch-ups may be needed.
7. I release F19 Tattoo Studio and its artists from any liability related to the tattoo procedure.
8. I confirm that the design, placement, and spelling have been verified and approved by me.

I have read and understand the above statements and give my full consent to proceed with the tattoo procedure.`;
function useConsentForms() {
  const createConsentForm = useCallback(async (leadId, clientName) => {
    const { data, error } = await supabase.from("consent_forms").insert({
      lead_id: leadId,
      client_name: clientName,
      consent_text: DEFAULT_CONSENT_TEXT
    }).select().single();
    if (error) {
      toast.error("Failed to create consent form");
      return null;
    }
    return data;
  }, []);
  const getConsentForm = useCallback(async (formId) => {
    const { data, error } = await supabase.from("consent_forms").select("*").eq("id", formId).single();
    if (error) return null;
    return data;
  }, []);
  const signConsentForm = useCallback(async (formId, signatureData) => {
    const { error } = await supabase.from("consent_forms").update({ signature_data: signatureData, signed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", formId);
    if (error) {
      toast.error("Failed to save signature");
      return false;
    }
    return true;
  }, []);
  return { createConsentForm, getConsentForm, signConsentForm };
}
export {
  useConsentForms
};
