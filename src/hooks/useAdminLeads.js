import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseBudget } from "@/types/lead";
import { startOfWeek, startOfMonth, startOfDay, isAfter, isBefore, parseISO, isToday } from "date-fns";
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
    lastContactedAt: row.last_contacted_at
  };
}
function useAdminLeads(filters) {
  const [allLeads, setAllLeads] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const [leadsRes, completionsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("tattoo_completions").select("lead_id, tattoo_price, artist_name, created_at")
      ]);
      if (!leadsRes.error && leadsRes.data) {
        setAllLeads(leadsRes.data.map(dbToLead));
      }
      if (!completionsRes.error && completionsRes.data) {
        setCompletions(completionsRes.data);
      }
      setLoading(false);
    }
    fetch();
  }, []);
  const filtered = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    let from;
    let to;
    if (filters.dateRange === "today") {
      from = startOfDay(now);
    } else if (filters.dateRange === "week") {
      from = startOfWeek(now, { weekStartsOn: 1 });
    } else if (filters.dateRange === "month") {
      from = startOfMonth(now);
    } else if (filters.dateRange === "custom") {
      from = filters.customFrom;
      to = filters.customTo;
    }
    return allLeads.filter((l) => {
      const date = parseISO(l.createdAt);
      if (from && isBefore(date, from)) return false;
      if (to && isAfter(date, to)) return false;
      if (filters.styles.length > 0 && !filters.styles.includes(l.tattooStyle)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(l.source)) return false;
      return true;
    });
  }, [allLeads, filters]);
  const completed = useMemo(() => filtered.filter((l) => l.status === "Completed"), [filtered]);
  const booked = useMemo(() => filtered.filter((l) => l.status === "Booked"), [filtered]);
  const pending = useMemo(
    () => filtered.filter((l) => ["New Lead", "Contacted", "Interested", "Negotiating"].includes(l.status)),
    [filtered]
  );
  const completionPriceMap = useMemo(() => {
    const map = {};
    completions.forEach((c) => {
      map[c.lead_id] = Math.max(map[c.lead_id] || 0, Number(c.tattoo_price) || 0);
    });
    return map;
  }, [completions]);
  const artistRevenue = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    completions.forEach((c) => {
      const name = c.artist_name || "Unknown";
      map.set(name, (map.get(name) || 0) + Number(c.tattoo_price || 0));
    });
    return Array.from(map.entries()).map(([artist, revenue]) => ({ artist, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [completions]);
  const getLeadRevenue = (l) => completionPriceMap[l.id] || parseBudget(l.budget);
  const todayCompleted = useMemo(
    () => allLeads.filter((l) => l.status === "Completed" && isToday(parseISO(l.updatedAt))),
    [allLeads]
  );
  const stats = useMemo(() => ({
    todayRevenue: todayCompleted.reduce((s, l) => s + getLeadRevenue(l), 0),
    todayCount: todayCompleted.length,
    completedRevenue: completed.reduce((s, l) => s + getLeadRevenue(l), 0),
    completedCount: completed.length,
    bookedValue: booked.reduce((s, l) => s + parseBudget(l.budget), 0),
    bookedCount: booked.length,
    pendingValue: pending.reduce((s, l) => s + parseBudget(l.budget), 0),
    pendingCount: pending.length,
    totalRevenue: allLeads.filter((l) => l.status === "Completed").reduce((s, l) => s + getLeadRevenue(l), 0),
    totalCompleted: allLeads.filter((l) => l.status === "Completed").length
  }), [completed, booked, pending, todayCompleted, allLeads, completionPriceMap]);
  return { allLeads: filtered, completed, booked, pending, stats, loading, completions, artistRevenue, completionPriceMap };
}
export {
  useAdminLeads
};
