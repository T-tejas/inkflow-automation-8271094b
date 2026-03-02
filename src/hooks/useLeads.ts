import { useState, useEffect, useCallback } from 'react';
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

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all leads
  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        toast.error('Failed to load leads');
      } else {
        setLeads((data as DbLead[]).map(dbToLead));
      }
      setLoading(false);
    };
    fetchLeads();

    // Realtime subscription
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const dbData = leadToDb(lead);
    const { data, error } = await supabase
      .from('leads')
      .insert(dbData as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
      return null;
    }
    // Realtime will handle state update
    return dbToLead(data as DbLead);
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const dbData = leadToDb(updates);
    dbData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('leads')
      .update(dbData as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  }, []);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
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

  return { leads, loading, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats };
}
