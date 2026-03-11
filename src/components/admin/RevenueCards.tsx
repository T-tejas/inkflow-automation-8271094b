import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, CheckCircle2, CalendarCheck, Clock, TrendingUp, Trophy } from 'lucide-react';

interface Stats {
  todayRevenue: number;
  todayCount: number;
  completedRevenue: number;
  completedCount: number;
  bookedValue: number;
  bookedCount: number;
  pendingValue: number;
  pendingCount: number;
  totalRevenue: number;
  totalCompleted: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function RevenueCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: "Today's Revenue",
      value: stats.todayRevenue,
      count: stats.todayCount,
      countLabel: 'today',
      icon: TrendingUp,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/5',
    },
    {
      title: 'Monthly Revenue',
      value: stats.completedRevenue,
      count: stats.completedCount,
      countLabel: 'this period',
      icon: CheckCircle2,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/5',
    },
    {
      title: 'Total Revenue',
      value: stats.totalRevenue,
      count: stats.totalCompleted,
      countLabel: 'all time',
      icon: Trophy,
      accent: 'text-amber-300',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30',
      glow: 'shadow-amber-400/5',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingValue,
      count: stats.pendingCount,
      countLabel: 'leads',
      icon: Clock,
      accent: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      glow: 'shadow-orange-500/5',
    },
    {
      title: 'Total Completed',
      value: stats.totalCompleted,
      count: stats.bookedCount,
      countLabel: 'booked',
      icon: CalendarCheck,
      accent: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      glow: 'shadow-sky-500/5',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(c => (
        <Card key={c.title} className={`bg-zinc-900/80 border ${c.border} shadow-lg ${c.glow}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{c.title}</p>
                {c.isCount ? (
                  <span className={`text-3xl font-bold ${c.accent}`}>{c.value}</span>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <IndianRupee className={`h-4 w-4 ${c.accent}`} />
                    <span className={`text-2xl font-bold ${c.accent}`}>{fmt(c.value)}</span>
                  </div>
                )}
                <p className="text-[10px] text-zinc-600">{c.count} {c.countLabel}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.accent}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
