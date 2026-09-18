import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
function useTattooCompletions(leadId) {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchCompletions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tattoo_completions").select("*").order("created_at", { ascending: false });
    if (leadId) query = query.eq("lead_id", leadId);
    const { data, error } = await query;
    if (!error) setCompletions(data || []);
    setLoading(false);
  }, [leadId]);
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);
  const addCompletion = useCallback(async (data) => {
    const { error } = await supabase.from("tattoo_completions").insert(data);
    if (error) {
      toast.error("Failed to save completion");
      return false;
    }
    toast.success("Tattoo completion recorded!");
    fetchCompletions();
    return true;
  }, [fetchCompletions]);
  return { completions, loading, addCompletion, refetch: fetchCompletions };
}
function generateClientId() {
  const num = Math.floor(1e4 + Math.random() * 9e4);
  return `F19-CLIENT-${num}`;
}
export {
  generateClientId,
  useTattooCompletions
};
