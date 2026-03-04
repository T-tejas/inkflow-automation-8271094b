import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, parseBudget } from '@/types/lead';
import { startOfWeek, startOfMonth, isAfter, isBefore, parseISO } from 'date-fns';

interface DbLead {
  id: string;
  full_name: string;
  phone: string;
  source: string;
  whatsapp_opt_in: boolean;
  tattoo_style: string;
  size: string;
  placement: string;
  budget: string;
  preferred_date: string;
  status: string;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

function dbToLead(row: DbLead): Lead {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    source: row.source as Lead['source'],
    whatsappOptIn: row.whatsapp_opt_in,
    tattooStyle: row.tattoo_style as Lead['tattooStyle'],
    size: row.size as Lead['size'],
    placement: row.placement,
    budget: row.budget,
    preferredDate: row.preferred_date,
    status: row.status as Lead['status'],
    tags: row.tags as Lead['tags'],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type DateRange = 'week' | 'month' | 'custom';

export interface AdminFilters {
  dateRange: DateRange;
  customFrom?: Date;
  customTo?: Date;
  styles: string[];
  sources: string[];
}

export function useAdminLeads(filters: AdminFilters) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setAllLeads((data as DbLead[]).map(dbToLead));
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    if (filters.dateRange === 'week') {
      from = startOfWeek(now, { weekStartsOn: 1 });
    } else if (filters.dateRange === 'month') {
      from = startOfMonth(now);
    } else if (filters.dateRange === 'custom') {
      from = filters.customFrom;
      to = filters.customTo;
    }

    return allLeads.filter(l => {
      // Date filter
      const date = parseISO(l.createdAt);
      if (from && isBefore(date, from)) return false;
      if (to && isAfter(date, to)) return false;

      // Style filter
      if (filters.styles.length > 0 && !filters.styles.includes(l.tattooStyle)) return false;

      // Source filter
      if (filters.sources.length > 0 && !filters.sources.includes(l.source)) return false;

      return true;
    });
  }, [allLeads, filters]);

  const completed = useMemo(() => filtered.filter(l => l.status === 'Completed'), [filtered]);
  const booked = useMemo(() => filtered.filter(l => l.status === 'Booked'), [filtered]);
  const pending = useMemo(
    () => filtered.filter(l => ['New Lead', 'Contacted', 'Interested', 'Negotiating'].includes(l.status)),
    [filtered]
  );

  const stats = useMemo(() => ({
    completedRevenue: completed.reduce((s, l) => s + parseBudget(l.budget), 0),
    completedCount: completed.length,
    bookedValue: booked.reduce((s, l) => s + parseBudget(l.budget), 0),
    bookedCount: booked.length,
    pendingValue: pending.reduce((s, l) => s + parseBudget(l.budget), 0),
    pendingCount: pending.length,
  }), [completed, booked, pending]);

  return { allLeads: filtered, completed, booked, pending, stats, loading };
}
