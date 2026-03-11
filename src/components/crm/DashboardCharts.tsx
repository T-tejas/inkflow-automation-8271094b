import { Lead, LEAD_SOURCES, KANBAN_STATUSES, parseBudget } from '@/types/lead';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { formatINRShort } from '@/lib/currency';

interface DashboardChartsProps {
  leads: Lead[];
}

const SOURCE_COLORS = [
  'hsl(36, 90%, 55%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 72%, 51%)',
  'hsl(38, 92%, 50%)',
];

export function DashboardCharts({ leads }: DashboardChartsProps) {
  const [completionPrices, setCompletionPrices] = useState<Record<string, number>>({});

  // Fetch actual tattoo_price for completed leads
  useEffect(() => {
    const completedLeads = leads.filter(l => l.status === 'Completed');
    if (completedLeads.length === 0) return;
    supabase
      .from('tattoo_completions')
      .select('lead_id, tattoo_price')
      .in('lead_id', completedLeads.map(l => l.id))
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        data.forEach((c: any) => {
          map[c.lead_id] = Math.max(map[c.lead_id] || 0, Number(c.tattoo_price) || 0);
        });
        setCompletionPrices(map);
      });
  }, [leads]);

  // Weekly trend: leads created per day over last 7 days
  const today = startOfDay(new Date());
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const count = leads.filter(l => {
      const created = format(startOfDay(new Date(l.createdAt)), 'yyyy-MM-dd');
      return created === dayStr;
    }).length;
    return { day: format(day, 'EEE'), count };
  });

  // Source breakdown
  const sourceData = LEAD_SOURCES.map(source => ({
    name: source,
    value: leads.filter(l => l.source === source).length,
  })).filter(d => d.value > 0);

  // Revenue distribution by stage - use actual price for completed, budget for others
  const getLeadValue = (l: Lead) => {
    if (l.status === 'Completed' && completionPrices[l.id]) {
      return completionPrices[l.id];
    }
    return parseBudget(l.budget);
  };

  const stageRevenueData = KANBAN_STATUSES
    .map(status => {
      const stageLeads = leads.filter(l => l.status === status || (status === 'No Response' && l.status === 'Cancelled'));
      const total = stageLeads.reduce((sum, l) => sum + getLeadValue(l), 0);
      return { name: status === 'No Response' ? 'No Resp.' : status, value: total, count: stageLeads.length };
    })
    .filter(d => d.value > 0);

  const STAGE_COLORS = [
    'hsl(199, 89%, 48%)', 'hsl(220, 70%, 55%)', 'hsl(36, 90%, 55%)',
    'hsl(25, 85%, 55%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(0, 50%, 55%)',
    'hsl(195, 80%, 50%)', 'hsl(340, 65%, 50%)',
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
          Leads This Week
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
          Lead Sources
        </h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {sourceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {sourceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Revenue by Stage */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-3">
          Revenue by Stage
        </h3>
        {stageRevenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageRevenueData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={v => formatINRShort(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} width={65} />
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [
                  `${formatINR(value)} (${props.payload.count} leads)`, 'Value'
                ]}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stageRevenueData.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No budget data</div>
        )}
      </motion.div>
    </div>
  );
}
