import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TemplateCategory = 'utility' | 'marketing' | 'authentication';
export type TemplateStatus = 'approved' | 'pending' | 'rejected';

export interface TemplateButton {
  type: 'url' | 'quick_reply' | 'phone';
  label: string;
  value?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  body_text: string;
  variables: string[];
  buttons: TemplateButton[];
  meta_template_name: string | null;
  quality_rating: string | null;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  source: 'local' | 'meta';
  created_at: string;
  updated_at: string;
}

export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates' as any)
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error(error);
      toast.error('Failed to load templates');
    } else {
      setTemplates((data as any[])?.map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
        buttons: Array.isArray(t.buttons) ? t.buttons : [],
      })) as MessageTemplate[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleFavorite = useCallback(async (id: string, next: boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_favorite: next } : t));
    await supabase.from('message_templates' as any).update({ is_favorite: next }).eq('id', id);
  }, []);

  const incrementUsage = useCallback(async (id: string) => {
    const t = templates.find(x => x.id === id);
    const next = (t?.usage_count || 0) + 1;
    await supabase.from('message_templates' as any).update({
      usage_count: next,
      last_used_at: new Date().toISOString(),
    }).eq('id', id);
    setTemplates(prev => prev.map(x => x.id === id ? { ...x, usage_count: next, last_used_at: new Date().toISOString() } : x));
  }, [templates]);

  const syncFromMeta = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', { body: {} });
      if (error) throw error;
      const fetched = (data as any)?.templates || [];
      let upserted = 0;
      for (const t of fetched) {
        const status = (t.status || '').toLowerCase();
        const category = (t.category || '').toLowerCase().includes('marketing') ? 'marketing'
          : (t.category || '').toLowerCase().includes('auth') ? 'authentication' : 'utility';
        const { error: upErr } = await supabase.from('message_templates' as any).upsert({
          name: t.name,
          category,
          status: ['approved', 'pending', 'rejected'].includes(status) ? status : 'pending',
          language: t.language || 'en',
          body_text: t.body || '',
          variables: [],
          buttons: [],
          meta_template_name: t.name,
          source: 'meta',
        }, { onConflict: 'name' });
        if (!upErr) upserted++;
      }
      toast.success(`Synced ${upserted} templates from Meta`);
      await fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [fetchAll]);

  return { templates, loading, syncing, fetchAll, toggleFavorite, incrementUsage, syncFromMeta };
}
