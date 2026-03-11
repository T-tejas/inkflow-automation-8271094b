import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Artist {
  id: string;
  name: string;
}

export function useArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('artists')
      .select('id, name')
      .order('name');
    if (error) {
      console.error('Failed to fetch artists:', error);
    } else {
      setArtists((data as Artist[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel('artists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artists' }, () => {
        fetchArtists();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchArtists]);

  const addArtist = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    // Case-insensitive check
    const existing = artists.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const { data, error } = await supabase
      .from('artists')
      .insert({ name: trimmed } as any)
      .select('id, name')
      .single();
    if (error) {
      if (error.code === '23505') {
        // Already exists (unique constraint)
        toast.info('Artist already exists');
        await fetchArtists();
        return artists.find(a => a.name.toLowerCase() === trimmed.toLowerCase()) || null;
      }
      toast.error('Failed to add artist');
      return null;
    }
    toast.success('Artist added');
    return data as Artist;
  }, [artists, fetchArtists]);

  const deleteArtist = useCallback(async (id: string) => {
    setArtists(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('artists').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete artist');
      fetchArtists();
      return false;
    }
    toast.success('Artist deleted');
    return true;
  }, [fetchArtists]);

  const artistNames = artists.map(a => a.name);

  return { artists, artistNames, loading, addArtist, deleteArtist, refetchArtists: fetchArtists };
}
