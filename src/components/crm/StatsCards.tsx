import { Users, CalendarCheck, CheckCircle, TrendingUp, IndianRupee, Flame, Clock } from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  stats: {
    total: number;
    newLeads: number;
    booked: number;
    completed: number;
    conversionRate: number;
    pipelineValue: number;
    hotLeads?: number;
    followupToday?: number;
    followupOverdue?: number;
  };
}

const cards = [
  { key: 'total', label: 'Total Leads', icon: Users, color: 'text-primary', format: 'number' },
  { key: 'newLeads', label: 'New Leads', icon: TrendingUp, color: 'text-pipeline-new', format: 'number' },
  { key: 'hotLeads', label: 'Hot Leads 🔥', icon: Flame, color: 'text-orange-500', format: 'number' },
  { key: 'booked', label: 'Booked', icon: CalendarCheck, color: 'text-pipeline-booked', format: 'number' },
  { key: 'followupToday', label: 'Follow-up Today', icon: Clock, color: 'text-warning', format: 'number' },
  { key: 'followupOverdue', label: 'Overdue ⚠', icon: Clock, color: 'text-destructive', format: 'number' },
] as const;

function formatValue(val: number, format: string) {
  if (format === 'currency') {
    return formatINR(val);
  }
  return val.toString();
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map(({ key, label, icon: Icon, color, format }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {formatValue(stats[key], format)}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
