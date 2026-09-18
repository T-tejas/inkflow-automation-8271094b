import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
function useAutomationRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("automation_rules").select("*").order("rule_name");
    if (error) toast.error("Failed to load automation rules");
    else setRules(data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  const updateRule = useCallback(async (id, patch) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
    const { error } = await supabase.from("automation_rules").update(patch).eq("id", id);
    if (error) {
      toast.error("Failed to save rule");
      await fetchAll();
    }
  }, [fetchAll]);
  return { rules, loading, fetchAll, updateRule };
}
export {
  useAutomationRules
};
