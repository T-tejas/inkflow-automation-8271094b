import { useState, useEffect, useCallback, useRef } from 'react';
import { Lead, LeadStatus, AutomationTag, parseBudget } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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

const LEADS_CACHE_KEY = 'crm_leads_cache_v1';

function readCachedLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEADS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Lead[]) : [];
  } catch {
    return [];
  }
}

function writeCachedLeads(leads: Lead[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(leads));
  } catch {
    // Ignore storage write errors
  }
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs = 30000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, timeoutMs = 30000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn, timeoutMs);
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Retry exhausted');
}

// Auto-tag logic
function computeAutoTags(
  existingTags: AutomationTag[],
  source: string,
  status: string,
  allLeads: Lead[],
  phone: string,
  currentLeadId?: string
): AutomationTag[] {
  const tags = new Set<AutomationTag>(existingTags);

  if (source === 'WhatsApp') tags.add('whatsapp_inquiry');
  if (status === 'Booked') tags.add('booked_whatsapp');
  if (status === 'Completed') tags.add('happy_client');

  // repeat_client: same phone exists in another lead
  const otherWithSamePhone = allLeads.some(
    l => l.phone === phone && l.id !== currentLeadId
  );
  if (otherWithSamePhone) tags.add('repeat_client');

  return Array.from(tags);
}

// Log interaction to lead_interactions table (fire and forget)
function logInteraction(leadId: string, actionType: string, oldValue?: string, newValue?: string, note?: string) {
  supabase.from('lead_interactions' as any).insert({
    lead_id: leadId,
    action_type: actionType,
    old_value: oldValue || null,
    new_value: newValue || null,
    note: note || null,
  }).then(({ error }) => {
    if (error) console.error('Failed to log interaction:', error);
  });
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(() => readCachedLeads());
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
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) throw error ?? new Error('No leads data returned');
        return data as DbLead[];
      });

      setLeads(rows.map(dbToLead));
    } catch (error) {
      console.error('Fetch leads failed after retries:', error);
      setSyncError(true);
    } finally {
      setLoading(false);
    }
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

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    // Auto-tag
    const autoTags = computeAutoTags(lead.tags, lead.source, lead.status, leadsRef.current, lead.phone);

    const insertData: TablesInsert<'leads'> = {
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
      notes: lead.notes,
    };
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase
          .from('leads')
          .insert(insertData)
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
      logInteraction(newLead.id, 'created', undefined, lead.status);
      toast.success(`Lead "${newLead.fullName}" added`);
      setSyncError(false);
      return true;
    } catch (err) {
      console.error('Error adding lead:', err);
      setSyncError(true);
      toast.error('Failed to add lead. Please try again.');
      return false;
    }
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>): Promise<boolean> => {
    const prev = leadsRef.current;
    const existing = prev.find(l => l.id === id);
    const now = new Date().toISOString();

    // Auto-tag on update
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

    const updateData: TablesUpdate<'leads'> = { updated_at: now };
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.whatsappOptIn !== undefined) updateData.whatsapp_opt_in = updates.whatsappOptIn;
    if (updates.tattooStyle !== undefined) updateData.tattoo_style = updates.tattooStyle;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.placement !== undefined) updateData.placement = updates.placement;
    if (updates.budget !== undefined) updateData.budget = updates.budget;
    if (updates.preferredDate !== undefined) updateData.preferred_date = updates.preferredDate;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    setLeads(curr => curr.map(l => l.id === id ? { ...l, ...updates, updatedAt: now } : l));

    try {
      await withRetry(async () => {
        const { error } = await supabase.from('leads').update(updateData).eq('id', id);
        if (error) throw error;
      });
      logInteraction(id, 'updated');
      setSyncError(false);
      return true;
    } catch (err) {
      console.error('Error updating lead:', err);
      toast.error('Failed to update lead');
      setSyncError(true);
      setLeads(prev);
      return false;
    }
  }, []);

  const autoDeductNeedles = useCallback(async (lead: Lead) => {
    // Map tattoo styles to needle types for auto-deduction
    const style = lead.tattooStyle?.toLowerCase() || '';
    const needleTypesToDeduct: string[] = [];
    if (['traditional', 'lettering', 'minimalist', 'minimal', 'geometric'].some(s => style.includes(s))) {
      needleTypesToDeduct.push('RL'); // line work
    }
    if (['realism', 'portrait', 'watercolor', 'neo-traditional'].some(s => style.includes(s))) {
      needleTypesToDeduct.push('RS', 'Bugpin');
    }
    if (['japanese', 'tribal', 'blackwork', 'dotwork'].some(s => style.includes(s))) {
      needleTypesToDeduct.push('RL', 'M1');
    }
    if (needleTypesToDeduct.length === 0) needleTypesToDeduct.push('RL'); // default

    const uniqueTypes = [...new Set(needleTypesToDeduct)];
    for (const nt of uniqueTypes) {
      const { data: needles } = await supabase
        .from('inventory_items')
        .select('id, quantity_in_stock')
        .eq('category', 'Needles')
        .eq('needle_type', nt)
        .gt('quantity_in_stock', 0)
        .order('quantity_in_stock', { ascending: false })
        .limit(1);
      if (needles && needles.length > 0) {
        const needle = needles[0];
        await supabase.from('inventory_items').update({
          quantity_in_stock: Math.max(0, needle.quantity_in_stock - 1),
          last_updated: new Date().toISOString(),
        } as any).eq('id', needle.id);
        await supabase.from('needle_usage_log').insert({
          inventory_item_id: needle.id,
          lead_id: lead.id,
          quantity_used: 1,
          usage_type: 'auto',
          notes: `Auto-deducted for completed tattoo (${lead.tattooStyle})`,
        } as any);
      }
    }
  }, []);

  const updateLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    const prev = leadsRef.current;
    const existing = prev.find(l => l.id === id);
    const oldStatus = existing?.status;
    const now = new Date().toISOString();

    // Auto-tag on stage change
    let newTags = existing?.tags ?? [];
    if (existing) {
      newTags = computeAutoTags(existing.tags, existing.source, status, prev, existing.phone, id);
    }

    setLeads(curr => curr.map(l => l.id === id ? { ...l, status, tags: newTags, updatedAt: now } : l));

    try {
      await withRetry(async () => {
        const { error } = await supabase.from('leads').update({ status, tags: newTags, updated_at: now }).eq('id', id);
        if (error) throw error;
      });
      logInteraction(id, 'stage_change', oldStatus, status);
      toast.success(`Stage → ${status}`);
      setSyncError(false);

      // Auto-deduct needles when tattoo is completed
      if (status === 'Completed' && oldStatus !== 'Completed' && existing) {
        autoDeductNeedles(existing);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
      setSyncError(true);
      setLeads(prev);
    }
  }, [autoDeductNeedles]);

  const deleteLead = useCallback(async (id: string) => {
    const prev = leadsRef.current;
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
      setSyncError(true);
      setLeads(prev);
    }
  }, []);

  const getLeadsByStatus = useCallback(
    (status: LeadStatus) => {
      if (status === 'No Response') {
        return leads.filter(l => l.status === 'No Response' || l.status === 'Cancelled');
      }
      return leads.filter(l => l.status === status);
    },
    [leads]
  );

  const pipelineValue = leads.reduce((sum, l) => sum + parseBudget(l.budget), 0);

  const stats = {
    total: leads.length,
    newLeads: leads.filter(l => l.status === 'New Lead').length,
    booked: leads.filter(l => l.status === 'Booked').length,
    completed: leads.filter(l => l.status === 'Completed').length,
    conversionRate: leads.length
      ? Math.round((leads.filter(l => l.status === 'Completed').length / leads.length) * 100)
      : 0,
    pipelineValue,
  };

  return { leads, loading, syncError, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats, refetchLeads: fetchLeads };
}
