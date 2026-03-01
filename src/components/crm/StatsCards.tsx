import { Users, CalendarCheck, CheckCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  stats: {
    total: number;
    newLeads: number;
    booked: number;
    completed: number;
    conversionRate: number;
  };
}

const cards = [
  { key: 'total', label: 'Total Leads', icon: Users, color: 'text-primary' },
  { key: 'newLeads', label: 'New Leads', icon: TrendingUp, color: 'text-pipeline-new' },
  { key: 'booked', label: 'Booked', icon: CalendarCheck, color: 'text-pipeline-booked' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-pipeline-completed' },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon, color }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats[key]}</p>
        </motion.div>
      ))}
    </div>
  );
}
