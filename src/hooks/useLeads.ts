import { useState, useEffect, useCallback, useRef } from 'react';
import { Lead, LeadStatus } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

function leadToDb(lead: Partial<Lead>): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  if (lead.fullName !== undefined) map.full_name = lead.fullName;
  if (lead.phone !== undefined) map.phone = lead.phone;
  if (lead.source !== undefined) map.source = lead.source;
  if (lead.whatsappOptIn !== undefined) map.whatsapp_opt_in = lead.whatsappOptIn;
  if (lead.tattooStyle !== undefined) map.tattoo_style = lead.tattooStyle;
  if (lead.size !== undefined) map.size = lead.size;
  if (lead.placement !== undefined) map.placement = lead.placement;
  if (lead.budget !== undefined) map.budget = lead.budget;
  if (lead.preferredDate !== undefined) map.preferred_date = lead.preferredDate;
  if (lead.status !== undefined) map.status = lead.status;
  if (lead.tags !== undefined) map.tags = lead.tags;
  if (lead.notes !== undefined) map.notes = lead.notes;
  return map;
}

// Retry helper for mutations
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Retry exhausted');
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setSyncError(false);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLeads((data as DbLead[]).map(dbToLead));
        setLoading(false);
        return;
      }
      console.error(`Fetch leads attempt ${attempt + 1} failed:`, error);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
    setSyncError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = dbToLead(payload.new as DbLead);
            setLeads(prev => {
              if (prev.some(l => l.id === newLead.id)) return prev;
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToLead(payload.new as DbLead);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setLeads(prev => prev.filter(l => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    // Auto-refetch on focus/reconnect
    const handleFocus = () => fetchLeads();
    const handleOnline = () => fetchLeads();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchLeads]);

  // Returns true on success, false on failure
  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    const dbData = leadToDb(lead);
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase
          .from('leads')
          .insert(dbData as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      });
      const newLead = dbToLead(result as DbLead);
      setLeads(prev => {
        if (prev.some(l => l.id === newLead.id)) return prev;
        return [newLead, ...prev];
      });
      toast.success(`Lead "${newLead.fullName}" added`);
      setSyncError(false);
      return true;
    } catch (err) {
      console.error('Error adding lead:', err);
      toast.error('Failed to add lead. Please try again.');
      return false;
    }
  }, []);

  // Returns true on success
  const updateLead = useCallback(async (id: string, updates: Partial<Lead>): Promise<boolean> => {
    const prev = leadsRef.current;
    const dbData = leadToDb(updates);
    dbData.updated_at = new Date().toISOString();

    // Optimistic update
    setLeads(curr => curr.map(l => l.id === id ? { ...l, ...updates, updatedAt: dbData.updated_at as string } : l));

    try {
      await withRetry(async () => {
        const { error } = await supabase.from('leads').update(dbData as any).eq('id', id);
        if (error) throw error;
      });
      setSyncError(false);
      return true;
    } catch (err) {
      console.error('Error updating lead:', err);
      toast.error('Failed to update lead');
      setLeads(prev); // rollback
      return false;
    }
  }, []);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    const prev = leadsRef.current;
    const now = new Date().toISOString();

    // Optimistic
    setLeads(curr => curr.map(l => l.id === id ? { ...l, status, updatedAt: now } : l));

    try {
      await withRetry(async () => {
        const { error } = await supabase.from('leads').update({ status, updated_at: now }).eq('id', id);
        if (error) throw error;
      });
      setSyncError(false);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
      setLeads(prev);
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const prev = leadsRef.current;

    // Optimistic
    setLeads(curr => curr.filter(l => l.id !== id));

    try {
      await withRetry(async () => {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
      });
      toast.success('Lead deleted');
      setSyncError(false);
    } catch (err) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead');
      setLeads(prev);
    }
  }, []);

  const getLeadsByStatus = useCallback(
    (status: LeadStatus) => leads.filter(l => l.status === status),
    [leads]
  );

  const stats = {
    total: leads.length,
    newLeads: leads.filter(l => l.status === 'New Lead').length,
    booked: leads.filter(l => l.status === 'Booked').length,
    completed: leads.filter(l => l.status === 'Completed').length,
    conversionRate: leads.length
      ? Math.round((leads.filter(l => l.status === 'Completed').length / leads.length) * 100)
      : 0,
  };

  return { leads, loading, syncError, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats, refetchLeads: fetchLeads };
}
