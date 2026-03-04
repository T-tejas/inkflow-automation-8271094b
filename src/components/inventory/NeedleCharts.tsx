import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { InventoryItem, NeedleUsageLog, NEEDLE_TYPES } from '@/hooks/useInventory';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Props {
  needleItems: InventoryItem[];
  usageLogs: NeedleUsageLog[];
}

const COLORS = [
  'hsl(200, 98%, 39%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(199, 89%, 48%)'
];

export function NeedleCharts({ needleItems, usageLogs }: Props) {
  // Stock by type
  const stockByType = NEEDLE_TYPES.map(nt => ({
    type: nt.value,
    stock: needleItems.filter(i => i.needle_type === nt.value).reduce((s, i) => s + i.quantity_in_stock, 0),
  }));

  // Usage per month (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yy') };
  });

  const usagePerMonth = months.map(m => {
    const count = usageLogs.filter(l =>
      isWithinInterval(new Date(l.created_at), { start: m.start, end: m.end })
    ).reduce((s, l) => s + l.quantity_used, 0);
    return { month: m.label, used: count };
  });

  // Value distribution
  const valueByType = NEEDLE_TYPES.map(nt => ({
    name: nt.value,
    value: needleItems.filter(i => i.needle_type === nt.value).reduce((s, i) => s + i.quantity_in_stock * i.cost_per_unit, 0),
  })).filter(v => v.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Stock by Type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Needle Stock by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage per Month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Needle Usage per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={usagePerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="used" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Value Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Needle Value Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={valueByType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {valueByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(v))}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
