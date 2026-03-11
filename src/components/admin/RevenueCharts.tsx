import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { formatINRShort } from '@/lib/currency';

interface Props {
  completed: Lead[];
  booked: Lead[];
  pending: Lead[];
  artistRevenue?: { artist: string; revenue: number }[];
  completionPriceMap?: Record<string, number>;
}

export function RevenueCharts({ completed, booked, pending, artistRevenue = [], completionPriceMap = {} }: Props) {
  // Daily revenue - last 14 days
  const dailyRevenue = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => {
      const day = subDays(today, 13 - i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const revenue = completed
        .filter(l => format(parseISO(l.updatedAt || l.createdAt), 'yyyy-MM-dd') === dayStr)
        .reduce((sum, l) => sum + (completionPriceMap[l.id] || parseBudget(l.budget)), 0);
      return { day: format(day, 'dd MMM'), revenue };
    });
  }, [completed, completionPriceMap]);

  // Monthly revenue
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    completed.forEach(l => {
      const key = format(parseISO(l.createdAt), 'MMM yyyy');
      map.set(key, (map.get(key) || 0) + (completionPriceMap[l.id] || parseBudget(l.budget)));
    });
    return Array.from(map.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .reverse()
      .slice(0, 12);
  }, [completed, completionPriceMap]);

  const fmt = (v: number) => formatINRShort(v);

  const tooltipStyle = {
    contentStyle: { background: '#18181b', border: '1px solid #333', borderRadius: 10, fontSize: 12 },
    labelStyle: { color: '#a1a1aa' },
  };

  const fmtTooltip = (v: number) => [`₹${new Intl.NumberFormat('en-IN').format(v)}`, 'Revenue'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Daily Revenue */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Daily Revenue (14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#71717a' }} interval={1} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length === 0 ? (
            <p className="text-xs text-zinc-600 py-8 text-center">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#71717a' }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Artist-wise Revenue */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Artist-wise Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {artistRevenue.length === 0 ? (
            <p className="text-xs text-zinc-600 py-8 text-center">No artist data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={artistRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis type="category" dataKey="artist" tick={{ fontSize: 10, fill: '#a1a1aa' }} width={80} />
                <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
