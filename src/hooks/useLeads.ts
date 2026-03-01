import { useState, useCallback } from 'react';
import { Lead, LeadStatus } from '@/types/lead';
import { sampleLeads } from '@/data/sampleLeads';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);

  const addLead = useCallback((lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newLead: Lead = {
      ...lead,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev =>
      prev.map(l =>
        l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
      )
    );
  }, []);

  const updateLeadStatus = useCallback((id: string, status: LeadStatus) => {
    updateLead(id, { status });
  }, [updateLead]);

  const deleteLead = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
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

  return { leads, addLead, updateLead, updateLeadStatus, deleteLead, getLeadsByStatus, stats };
}
