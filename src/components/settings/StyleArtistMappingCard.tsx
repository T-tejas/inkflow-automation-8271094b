import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useArtists } from '@/hooks/useArtists';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Mapping { id: string; tattoo_style: string; artist_name: string; }

const STYLES = ['Realism','Traditional','Neo-Traditional','Blackwork','Geometric','Watercolor','Minimalist','Tribal','Japanese','Script','Other'];

const StyleArtistMappingCard = () => {
  const { artistNames } = useArtists();
  const [maps, setMaps] = useState<Mapping[]>([]);
  const [newStyle, setNewStyle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase.from('style_artist_mapping' as any).select('*').order('tattoo_style');
    setMaps((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const add = async () => {
    if (!newStyle || !newArtist) { toast.error('Pick style and artist'); return; }
    const { error } = await supabase.from('style_artist_mapping' as any).upsert(
      { tattoo_style: newStyle, artist_name: newArtist, updated_at: new Date().toISOString() } as any,
      { onConflict: 'tattoo_style' } as any
    );
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Mapping saved');
    setNewStyle(''); setNewArtist(''); fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('style_artist_mapping' as any).delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setMaps(p => p.filter(m => m.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4 text-primary" /> Auto-Assignment by Tattoo Style
        </CardTitle>
        <p className="text-xs text-muted-foreground">New leads will be auto-assigned to the artist mapped to their tattoo style.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Style</label>
            <Select value={newStyle} onValueChange={setNewStyle}>
              <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>{STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Artist</label>
            <Select value={newArtist} onValueChange={setNewArtist}>
              <SelectTrigger><SelectValue placeholder="Select artist" /></SelectTrigger>
              <SelectContent>{artistNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={add} size="sm" className="gap-1"><Plus className="h-4 w-4" />Add</Button>
        </div>

        <div className="border rounded-md divide-y">
          {loading ? <div className="p-3 text-sm text-muted-foreground">Loading...</div>
            : maps.length === 0 ? <div className="p-3 text-sm text-muted-foreground">No mappings yet. Add one above.</div>
            : maps.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 px-3 text-sm">
                <div><span className="font-medium">{m.tattoo_style}</span> <span className="text-muted-foreground">→</span> {m.artist_name}</div>
                <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StyleArtistMappingCard;
