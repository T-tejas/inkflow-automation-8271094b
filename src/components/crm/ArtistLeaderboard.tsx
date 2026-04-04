import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, TrendingUp, Users, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/currency';

interface ArtistStats {
  name: string;
  totalRevenue: number;
  completedTattoos: number;
  totalClients: number;
}

export function ArtistLeaderboard() {
  const [artists, setArtists] = useState<ArtistStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('tattoo_completions')
        .select('artist_name, tattoo_price, lead_id');

      if (data) {
        const map = new Map<string, { revenue: number; tattoos: number; clients: Set<string> }>();
        data.forEach(c => {
          const name = c.artist_name || 'Unknown';
          if (!map.has(name)) map.set(name, { revenue: 0, tattoos: 0, clients: new Set() });
          const entry = map.get(name)!;
          entry.revenue += Number(c.tattoo_price) || 0;
          entry.tattoos += 1;
          if (c.lead_id) entry.clients.add(c.lead_id);
        });
        setArtists(
          Array.from(map.entries())
            .map(([name, s]) => ({ name, totalRevenue: s.revenue, completedTattoos: s.tattoos, totalClients: s.clients.size }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
        );
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-amber-400" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank + 1}</span>;
  };

  if (loading) return null;
  if (artists.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top Artist Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {artists.map((artist, i) => (
            <div key={artist.name} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'bg-amber-500/5' : ''}`}>
              <div className="w-8 flex items-center justify-center shrink-0">
                {getRankIcon(i)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{artist.name}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{artist.completedTattoos} tattoos</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{artist.totalClients} clients</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">{formatINR(artist.totalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
