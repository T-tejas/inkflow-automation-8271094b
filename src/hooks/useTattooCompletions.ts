import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TattooCompletion {
  id: string;
  lead_id: string;
  client_id_code: string;
  artist_name: string;
  tattoo_price: number;
  photo_urls: string[];
  aftercare_notes: string;
  invoice_url: string | null;
  created_at: string;
}

export function useTattooCompletions(leadId?: string) {
  const [completions, setCompletions] = useState<TattooCompletion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCompletions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('tattoo_completions').select('*').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (!error) setCompletions((data as TattooCompletion[]) || []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchCompletions(); }, [fetchCompletions]);

  const addCompletion = useCallback(async (data: Omit<TattooCompletion, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('tattoo_completions').insert(data as any);
    if (error) {
      toast.error('Failed to save completion');
      return false;
    }
    toast.success('Tattoo completion recorded!');
    fetchCompletions();
    return true;
  }, [fetchCompletions]);

  return { completions, loading, addCompletion, refetch: fetchCompletions };
}

export function generateClientId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `F19-CLIENT-${num}`;
}
