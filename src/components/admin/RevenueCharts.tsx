import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO } from 'date-fns';
import { formatINRShort } from '@/lib/currency';

interface Props {
  completed: Lead[];
  booked: Lead[];
  pending: Lead[];
}

export function RevenueCharts({ completed, booked, pending }: Props) {
  const monthlyCompleted = useMemo(() => {
    const map = new Map<string, number>();
    completed.forEach(l => {
      const key = format(parseISO(l.createdAt), 'MMM yyyy');
      map.set(key, (map.get(key) || 0) + parseBudget(l.budget));
    });
    return Array.from(map.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .reverse();
  }, [completed]);

  const pipelineData = useMemo(() => {
    const map = new Map<string, { booked: number; pending: number }>();
    const process = (leads: Lead[], key: 'booked' | 'pending') => {
      leads.forEach(l => {
        const month = format(parseISO(l.createdAt), 'MMM yyyy');
        const entry = map.get(month) || { booked: 0, pending: 0 };
        entry[key] += parseBudget(l.budget);
        map.set(month, entry);
      });
    };
    process(booked, 'booked');
    process(pending, 'pending');
    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .reverse();
  }, [booked, pending]);

  const fmt = (v: number) => formatINRShort(v);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-[#111] border-[#222]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-300">Monthly Completed Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyCompleted.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">No completed revenue data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyCompleted}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#999' }}
                  formatter={(v: number) => [`₹${new Intl.NumberFormat('en-IN').format(v)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#111] border-[#222]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-300">Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineData.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">No pipeline data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#999' }}
                  formatter={(v: number) => [`₹${new Intl.NumberFormat('en-IN').format(v)}`]}
                />
                <Line type="monotone" dataKey="booked" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Booked" />
                <Line type="monotone" dataKey="pending" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
