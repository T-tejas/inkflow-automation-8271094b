import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
function useMessageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("message_templates").select("*").order("category", { ascending: true }).order("name", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Failed to load templates");
    } else {
      setTemplates(data?.map((t) => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
        buttons: Array.isArray(t.buttons) ? t.buttons : []
      })));
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  const toggleFavorite = useCallback(async (id, next) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, is_favorite: next } : t));
    await supabase.from("message_templates").update({ is_favorite: next }).eq("id", id);
  }, []);
  const incrementUsage = useCallback(async (id) => {
    const t = templates.find((x) => x.id === id);
    const next = (t?.usage_count || 0) + 1;
    await supabase.from("message_templates").update({
      usage_count: next,
      last_used_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id);
    setTemplates((prev) => prev.map((x) => x.id === id ? { ...x, usage_count: next, last_used_at: (/* @__PURE__ */ new Date()).toISOString() } : x));
  }, [templates]);
  const syncFromMeta = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", { body: {} });
      if (error) throw error;
      const fetched = data?.templates || [];
      let upserted = 0;
      for (const t of fetched) {
        const status = (t.status || "").toLowerCase();
        const category = (t.category || "").toLowerCase().includes("marketing") ? "marketing" : (t.category || "").toLowerCase().includes("auth") ? "authentication" : "utility";
        const { error: upErr } = await supabase.from("message_templates").upsert({
          name: t.name,
          category,
          status: ["approved", "pending", "rejected"].includes(status) ? status : "pending",
          language: t.language || "en",
          body_text: t.body || "",
          variables: [],
          buttons: [],
          meta_template_name: t.name,
          source: "meta"
        }, { onConflict: "name" });
        if (!upErr) upserted++;
      }
      toast.success(`Synced ${upserted} templates from Meta`);
      await fetchAll();
    } catch (e) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [fetchAll]);
  return { templates, loading, syncing, fetchAll, toggleFavorite, incrementUsage, syncFromMeta };
}
export {
  useMessageTemplates
};
