import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TriggerEvent =
  | 'lead_created'
  | 'appointment_24h_before'
  | 'no_reply_48h'
  | 'tattoo_completed'
  | 'inactive_30d'
  | 'birthday'
  | 'repeat_client_60d';

export interface AutomationRule {
  id: string;
  rule_name: string;
  trigger_event: TriggerEvent;
  template_id: string | null;
  delay_hours: number;
  is_active: boolean;
  conditions: Record<string, any>;
  last_run_at: string | null;
  run_count: number;
}

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('automation_rules' as any).select('*').order('rule_name');
    if (error) toast.error('Failed to load automation rules');
    else setRules((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateRule = useCallback(async (id: string, patch: Partial<AutomationRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    const { error } = await supabase.from('automation_rules' as any).update(patch as any).eq('id', id);
    if (error) {
      toast.error('Failed to save rule');
      await fetchAll();
    }
  }, [fetchAll]);

  return { rules, loading, fetchAll, updateRule };
}
