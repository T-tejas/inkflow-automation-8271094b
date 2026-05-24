import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, CheckCircle2, CalendarCheck, Clock, TrendingUp, Trophy, Layers } from 'lucide-react';

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
      color: 'hsl(var(--warning))',
      isCount: false,
    },
    {
      title: 'Monthly Revenue',
      value: stats.completedRevenue,
      count: stats.completedCount,
      countLabel: 'this period',
      icon: CheckCircle2,
      color: 'hsl(var(--success))',
      isCount: false,
    },
    {
      title: 'Total Revenue',
      value: stats.totalRevenue,
      count: stats.totalCompleted,
      countLabel: 'all time',
      icon: Trophy,
      color: 'hsl(var(--primary))',
      isCount: false,
    },
    {
      title: 'Pending Payments',
      value: stats.pendingValue,
      count: stats.pendingCount,
      countLabel: 'leads',
      icon: Clock,
      color: 'hsl(var(--destructive))',
      isCount: false,
    },
    {
      title: 'Pipeline Value',
      value: stats.bookedValue + stats.pendingValue,
      count: stats.bookedCount + stats.pendingCount,
      countLabel: 'open leads',
      icon: Layers,
      color: 'hsl(var(--warning))',
      isCount: false,
    },
    {
      title: 'Total Completed',
      value: stats.totalCompleted,
      count: stats.bookedCount,
      countLabel: 'booked',
      icon: CalendarCheck,
      color: 'hsl(var(--info))',
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map(c => (
        <Card key={c.title} className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{c.title}</p>
                {c.isCount ? (
                  <span className="text-3xl font-bold text-foreground">{c.value}</span>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <IndianRupee className="h-4 w-4 text-foreground" />
                    <span className="text-2xl font-bold text-foreground">{fmt(c.value)}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">{c.count} {c.countLabel}</p>
              </div>
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: `${c.color}20` }}
              >
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
