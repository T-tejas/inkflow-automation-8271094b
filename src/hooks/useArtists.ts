import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useArtists() {
  const [artists, setArtists] = useState<string[]>([]);

  const fetchArtists = useCallback(async () => {
    // Fetch unique artist names from all three tables in parallel
    const [designRes, notesRes, completionsRes] = await Promise.all([
      supabase.from('design_tasks').select('artist_name'),
      supabase.from('lead_notes').select('artist_name'),
      supabase.from('tattoo_completions').select('artist_name'),
    ]);

    const names = new Set<string>();
    for (const row of designRes.data || []) if (row.artist_name?.trim()) names.add(row.artist_name.trim());
    for (const row of notesRes.data || []) if (row.artist_name?.trim()) names.add(row.artist_name.trim());
    for (const row of completionsRes.data || []) if (row.artist_name?.trim()) names.add(row.artist_name.trim());

    setArtists([...names].sort());
  }, []);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  return { artists, refetchArtists: fetchArtists };
}
