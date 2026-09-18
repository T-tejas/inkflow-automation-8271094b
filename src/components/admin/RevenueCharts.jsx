import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { parseBudget } from "@/types/lead";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { formatINRShort } from "@/lib/currency";
function RevenueCharts({ completed, booked, pending, artistRevenue = [], completionPriceMap = {} }) {
  const dailyRevenue = useMemo(() => {
    const today = startOfDay(/* @__PURE__ */ new Date());
    return Array.from({ length: 14 }, (_, i) => {
      const day = subDays(today, 13 - i);
      const dayStr = format(day, "yyyy-MM-dd");
      const revenue = completed.filter((l) => format(parseISO(l.updatedAt || l.createdAt), "yyyy-MM-dd") === dayStr).reduce((sum, l) => sum + (completionPriceMap[l.id] || parseBudget(l.budget)), 0);
      return { day: format(day, "dd MMM"), revenue };
    });
  }, [completed, completionPriceMap]);
  const monthlyRevenue = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    completed.forEach((l) => {
      const key = format(parseISO(l.createdAt), "MMM yyyy");
      map.set(key, (map.get(key) || 0) + (completionPriceMap[l.id] || parseBudget(l.budget)));
    });
    return Array.from(map.entries()).map(([month, revenue]) => ({ month, revenue })).reverse().slice(0, 12);
  }, [completed, completionPriceMap]);
  const fmt = (v) => formatINRShort(v);
  const tooltipStyle = {
    contentStyle: {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 10,
      fontSize: 12,
      color: "hsl(var(--foreground))"
    },
    labelStyle: { color: "hsl(var(--muted-foreground))" }
  };
  const fmtTooltip = (v) => [`\u20B9${new Intl.NumberFormat("en-IN").format(v)}`, "Revenue"];
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Revenue (14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={1} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">No data</p> : <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
                <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artist-wise Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {artistRevenue.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">No artist data</p> : <ResponsiveContainer width="100%" height={220}>
              <BarChart data={artistRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="artist" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={80} />
                <Tooltip {...tooltipStyle} formatter={fmtTooltip} />
                <Bar dataKey="revenue" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </CardContent>
      </Card>
    </div>;
}
export {
  RevenueCharts
};
