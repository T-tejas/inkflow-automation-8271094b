import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, CheckCircle2, CalendarCheck, Clock } from 'lucide-react';

interface Stats {
  completedRevenue: number;
  completedCount: number;
  bookedValue: number;
  bookedCount: number;
  pendingValue: number;
  pendingCount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function RevenueCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: 'Completed Revenue',
      value: stats.completedRevenue,
      count: stats.completedCount,
      icon: CheckCircle2,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Booked Value',
      value: stats.bookedValue,
      count: stats.bookedCount,
      icon: CalendarCheck,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      title: 'Pending Value',
      value: stats.pendingValue,
      count: stats.pendingCount,
      icon: Clock,
      accent: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map(c => (
        <Card key={c.title} className={`bg-[#111] border ${c.border} shadow-lg`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{c.title}</p>
                <div className="flex items-baseline gap-1">
                  <IndianRupee className={`h-5 w-5 ${c.accent}`} />
                  <span className={`text-2xl font-bold ${c.accent}`}>{fmt(c.value)}</span>
                </div>
                <p className="text-xs text-neutral-500">{c.count} tattoo{c.count !== 1 ? 's' : ''}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.accent}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
