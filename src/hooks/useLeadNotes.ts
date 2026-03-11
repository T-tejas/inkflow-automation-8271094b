import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadNote {
  id: string;
  lead_id: string;
  artist_name: string;
  note_text: string;
  created_at: string;
}

export function useLeadNotes(leadId: string | null) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!leadId) { setNotes([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch notes:', error);
    } else {
      setNotes((data as LeadNote[]) || []);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Realtime
  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`lead-notes-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_notes', filter: `lead_id=eq.${leadId}` }, () => {
        fetchNotes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, fetchNotes]);

  const addNote = useCallback(async (artistName: string, noteText: string) => {
    if (!leadId) return false;
    const { error } = await supabase
      .from('lead_notes')
      .insert({ lead_id: leadId, artist_name: artistName, note_text: noteText } as any);
    if (error) {
      toast.error('Failed to add note');
      return false;
    }
    toast.success('Note added');
    return true;
  }, [leadId]);

  const deleteNote = useCallback(async (noteId: string) => {
    const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('Failed to delete note');
      return false;
    }
    return true;
  }, []);

  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}
