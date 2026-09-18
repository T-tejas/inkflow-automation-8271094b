import { useState, useEffect, useCallback, useRef } from "react";
import { parseBudget, getFollowupStatus } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendMetaConversion } from "@/lib/metaConversions";
function dbToLead(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    source: row.source,
    whatsappOptIn: row.whatsapp_opt_in,
    tattooStyle: row.tattoo_style,
    size: row.size,
    placement: row.placement,
    budget: row.budget,
    preferredDate: row.preferred_date,
    status: row.status,
    tags: row.tags,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextFollowupDate: row.next_followup_date,
    lastContactedAt: row.last_contacted_at,
    assignedArtist: row.assigned_artist ?? null
  };
}
function leadToDb(lead) {
  const map = {};
  if (lead.fullName !== void 0) map.full_name = lead.fullName;
  if (lead.phone !== void 0) map.phone = lead.phone;
  if (lead.source !== void 0) map.source = lead.source;
  if (lead.whatsappOptIn !== void 0) map.whatsapp_opt_in = lead.whatsappOptIn;
  if (lead.tattooStyle !== void 0) map.tattoo_style = lead.tattooStyle;
  if (lead.size !== void 0) map.size = lead.size;
  if (lead.placement !== void 0) map.placement = lead.placement;
  if (lead.budget !== void 0) map.budget = lead.budget;
  if (lead.preferredDate !== void 0) map.preferred_date = lead.preferredDate;
  if (lead.status !== void 0) map.status = lead.status;
  if (lead.tags !== void 0) map.tags = lead.tags;
  if (lead.notes !== void 0) map.notes = lead.notes;
  if (lead.nextFollowupDate !== void 0) map.next_followup_date = lead.nextFollowupDate;
  if (lead.lastContactedAt !== void 0) map.last_contacted_at = lead.lastContactedAt;
  return map;
}
const LEADS_CACHE_KEY = "crm_leads_cache_v1";
function readCachedLeads() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEADS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeCachedLeads(leads) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(leads));
  } catch {
  }
}
async function withTimeout(fn, timeoutMs = 3e4) {
  let timeoutId = null;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
async function withRetry(fn, attempts = 2, timeoutMs = 3e4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn, timeoutMs);
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1e3 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Retry exhausted");
}
function computeAutoTags(existingTags, source, status, allLeads, phone, currentLeadId) {
  const tags = new Set(existingTags);
  if (source === "WhatsApp") tags.add("whatsapp_inquiry");
  if (status === "Booked") tags.add("booked_whatsapp");
  if (status === "Completed") tags.add("happy_client");
  const otherWithSamePhone = allLeads.some(
    (l) => l.phone === phone && l.id !== currentLeadId
  );
  if (otherWithSamePhone) tags.add("repeat_client");
  return Array.from(tags);
}
function logInteraction(leadId, actionType, oldValue, newValue, note) {
  supabase.from("lead_interactions").insert({
    lead_id: leadId,
    action_type: actionType,
    old_value: oldValue || null,
    new_value: newValue || null,
    note: note || null
  }).then(({ error }) => {
    if (error) console.error("Failed to log interaction:", error);
  });
}
function useLeads() {
  const [leads, setLeads] = useState(() => readCachedLeads());
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  useEffect(() => {
    writeCachedLeads(leads);
  }, [leads]);
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setSyncError(false);
    try {
      const rows = await withRetry(async () => {
        const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
        if (error || !data) throw error ?? new Error("No leads data returned");
        return data;
      });
      setLeads(rows.map(dbToLead));
    } catch (error) {
      console.error("Fetch leads failed after retries:", error);
      setSyncError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchLeads();
    const channel = supabase.channel("leads-realtime").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leads" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const newLead = dbToLead(payload.new);
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          const updated = dbToLead(payload.new);
          setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
        } else if (payload.eventType === "DELETE") {
          const deletedId = payload.old.id;
          setLeads((prev) => prev.filter((l) => l.id !== deletedId));
        }
      }
    ).subscribe();
    const handleFocus = () => fetchLeads();
    const handleOnline = () => fetchLeads();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchLeads]);
  const addLead = useCallback(async (lead) => {
    const autoTags = computeAutoTags(lead.tags, lead.source, lead.status, leadsRef.current, lead.phone);
    const insertData = {
      full_name: lead.fullName,
      phone: lead.phone,
      source: lead.source,
      whatsapp_opt_in: lead.whatsappOptIn,
      tattoo_style: lead.tattooStyle,
      size: lead.size,
      placement: lead.placement,
      budget: lead.budget,
      preferred_date: lead.preferredDate,
      status: lead.status,
      tags: autoTags,
      notes: lead.notes
    };
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase.from("leads").insert(insertData).select().single();
        if (error) throw error;
        return data;
      });
      const newLead = dbToLead(result);
      setLeads((prev) => {
        if (prev.some((l) => l.id === newLead.id)) return prev;
        return [newLead, ...prev];
      });
      logInteraction(newLead.id, "created", void 0, lead.status);
      toast.success(`Lead "${newLead.fullName}" added`);
      setSyncError(false);
      return true;
    } catch (err) {
      console.error("Error adding lead:", err);
      setSyncError(true);
      toast.error("Failed to add lead. Please try again.");
      return false;
    }
  }, []);
  const updateLead = useCallback(async (id, updates) => {
    const prev = leadsRef.current;
    const existing = prev.find((l) => l.id === id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing && (updates.source || updates.status)) {
      const newTags = computeAutoTags(
        updates.tags ?? existing.tags,
        updates.source ?? existing.source,
        updates.status ?? existing.status,
        prev,
        updates.phone ?? existing.phone,
        id
      );
      updates.tags = newTags;
    }
    const updateData = { updated_at: now };
    if (updates.fullName !== void 0) updateData.full_name = updates.fullName;
    if (updates.phone !== void 0) updateData.phone = updates.phone;
    if (updates.source !== void 0) updateData.source = updates.source;
    if (updates.whatsappOptIn !== void 0) updateData.whatsapp_opt_in = updates.whatsappOptIn;
    if (updates.tattooStyle !== void 0) updateData.tattoo_style = updates.tattooStyle;
    if (updates.size !== void 0) updateData.size = updates.size;
    if (updates.placement !== void 0) updateData.placement = updates.placement;
    if (updates.budget !== void 0) updateData.budget = updates.budget;
    if (updates.preferredDate !== void 0) updateData.preferred_date = updates.preferredDate;
    if (updates.status !== void 0) updateData.status = updates.status;
    if (updates.tags !== void 0) updateData.tags = updates.tags;
    if (updates.notes !== void 0) updateData.notes = updates.notes;
    if (updates.nextFollowupDate !== void 0) updateData.next_followup_date = updates.nextFollowupDate;
    if (updates.lastContactedAt !== void 0) updateData.last_contacted_at = updates.lastContactedAt;
    setLeads((curr) => curr.map((l) => l.id === id ? { ...l, ...updates, updatedAt: now } : l));
    try {
      await withRetry(async () => {
        const { error } = await supabase.from("leads").update(updateData).eq("id", id);
        if (error) throw error;
      });
      logInteraction(id, "updated");
      setSyncError(false);
      return true;
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("Failed to update lead");
      setSyncError(true);
      setLeads(prev);
      return false;
    }
  }, []);
  const autoDeductNeedles = useCallback(async (lead) => {
    const style = lead.tattooStyle?.toLowerCase() || "";
    const needleTypesToDeduct = [];
    if (["traditional", "lettering", "minimalist", "minimal", "geometric"].some((s) => style.includes(s))) {
      needleTypesToDeduct.push("RL");
    }
    if (["realism", "portrait", "watercolor", "neo-traditional"].some((s) => style.includes(s))) {
      needleTypesToDeduct.push("RS", "Bugpin");
    }
    if (["japanese", "tribal", "blackwork", "dotwork"].some((s) => style.includes(s))) {
      needleTypesToDeduct.push("RL", "M1");
    }
    if (needleTypesToDeduct.length === 0) needleTypesToDeduct.push("RL");
    const uniqueTypes = [...new Set(needleTypesToDeduct)];
    for (const nt of uniqueTypes) {
      const { data: needles } = await supabase.from("inventory_items").select("id, quantity_in_stock").eq("category", "Needles").eq("needle_type", nt).gt("quantity_in_stock", 0).order("quantity_in_stock", { ascending: false }).limit(1);
      if (needles && needles.length > 0) {
        const needle = needles[0];
        await supabase.from("inventory_items").update({
          quantity_in_stock: Math.max(0, needle.quantity_in_stock - 1),
          last_updated: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", needle.id);
        await supabase.from("needle_usage_log").insert({
          inventory_item_id: needle.id,
          lead_id: lead.id,
          quantity_used: 1,
          usage_type: "auto",
          notes: `Auto-deducted for completed tattoo (${lead.tattooStyle})`
        });
      }
    }
  }, []);
  const updateLeadStatus = useCallback(async (id, status) => {
    const prev = leadsRef.current;
    const existing = prev.find((l) => l.id === id);
    const oldStatus = existing?.status;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let newTags = existing?.tags ?? [];
    if (existing) {
      newTags = computeAutoTags(existing.tags, existing.source, status, prev, existing.phone, id);
    }
    setLeads((curr) => curr.map((l) => l.id === id ? { ...l, status, tags: newTags, updatedAt: now } : l));
    try {
      await withRetry(async () => {
        const { error } = await supabase.from("leads").update({ status, tags: newTags, updated_at: now }).eq("id", id);
        if (error) throw error;
      });
      logInteraction(id, "stage_change", oldStatus, status);
      toast.success(`Stage \u2192 ${status}`);
      setSyncError(false);
      if (existing) {
        if (status === "Interested" && oldStatus !== "Interested") {
          sendMetaConversion("lead_qualified", { phone: existing.phone, leadId: id });
        }
        if (status === "Booked" && oldStatus !== "Booked") {
          sendMetaConversion("booking_confirmed", { phone: existing.phone, leadId: id });
        }
        if (status === "Completed" && oldStatus !== "Completed") {
          sendMetaConversion("tattoo_completed", { phone: existing.phone, leadId: id });
        }
      }
      if (status === "Completed" && oldStatus !== "Completed" && existing) {
        autoDeductNeedles(existing);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
      setSyncError(true);
      setLeads(prev);
    }
  }, [autoDeductNeedles]);
  const deleteLead = useCallback(async (id) => {
    const prev = leadsRef.current;
    setLeads((curr) => curr.filter((l) => l.id !== id));
    try {
      await withRetry(async () => {
        const { error } = await supabase.from("leads").delete().eq("id", id);
        if (error) throw error;
      });
      toast.success("Lead deleted");
      setSyncError(false);
    } catch (err) {
      console.error("Error deleting lead:", err);
      toast.error("Failed to delete lead");
      setSyncError(true);
      setLeads(prev);
    }
  }, []);
  const getLeadsByStatus = useCallback(
    (status) => {
      if (status === "No Response") {
        return leads.filter((l) => l.status === "No Response" || l.status === "Cancelled");
      }
      if (status === "Out of City") {
        return leads.filter((l) => l.status === "Out of City");
      }
      return leads.filter((l) => l.status === status);
    },
    [leads]
  );
  const pipelineValue = leads.reduce((sum, l) => sum + parseBudget(l.budget), 0);
  const stats = {
    total: leads.length,
    newLeads: leads.filter((l) => l.status === "New Lead").length,
    hotLeads: leads.filter((l) => l.status === "Artist Consultation").length,
    booked: leads.filter((l) => l.status === "Booked").length,
    completed: leads.filter((l) => l.status === "Completed").length,
    conversionRate: leads.length ? Math.round(leads.filter((l) => l.status === "Completed").length / leads.length * 100) : 0,
    pipelineValue,
    followupToday: leads.filter((l) => getFollowupStatus(l.nextFollowupDate) === "today").length,
    followupOverdue: leads.filter((l) => getFollowupStatus(l.nextFollowupDate) === "overdue").length
  };
  return { leads, loading, syncError, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats, refetchLeads: fetchLeads };
}
export {
  useLeads
};
