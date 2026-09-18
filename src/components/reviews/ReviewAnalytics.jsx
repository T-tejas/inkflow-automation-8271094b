import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, TrendingUp, AlertTriangle, Award } from "lucide-react";
function ReviewAnalytics({ reviews }) {
  const total = reviews.length;
  const rated = reviews.filter((r) => r.rating);
  const avg = rated.length ? (rated.reduce((a, r) => a + (r.rating || 0), 0) / rated.length).toFixed(1) : "0.0";
  const posted = reviews.filter((r) => r.posted_to_google).length;
  const conversion = total ? Math.round(posted / total * 100) : 0;
  const negative = reviews.filter((r) => (r.rating || 0) <= 3 && r.rating).length;
  const pending = reviews.filter((r) => !r.rating).length;
  const artistScores = {};
  rated.forEach((r) => {
    var _a;
    if (!r.artist_name) return;
    artistScores[_a = r.artist_name] ?? (artistScores[_a] = { sum: 0, count: 0 });
    artistScores[r.artist_name].sum += r.rating;
    artistScores[r.artist_name].count += 1;
  });
  const top = Object.entries(artistScores).map(([name, s]) => ({ name, avg: s.sum / s.count, count: s.count })).sort((a, b) => b.avg - a.avg || b.count - a.count)[0];
  const cards = [
    { label: "Total Reviews", value: total, icon: MessageSquare, color: "text-blue-400 bg-blue-500/10" },
    { label: "Average Rating", value: `${avg}\u2605`, icon: Star, color: "text-yellow-400 bg-yellow-500/10" },
    { label: "Top Artist", value: top?.name || "\u2014", icon: Award, color: "text-green-400 bg-green-500/10", sub: top ? `${top.avg.toFixed(1)}\u2605 \xB7 ${top.count} reviews` : void 0 },
    { label: "Google Conversion", value: `${conversion}%`, icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/10", sub: `${posted}/${total} posted` },
    { label: "Pending Requests", value: pending, icon: MessageSquare, color: "text-amber-400 bg-amber-500/10" },
    { label: "Negative (\u22643\u2605)", value: negative, icon: AlertTriangle, color: "text-red-400 bg-red-500/10" }
  ];
  return <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
      {cards.map((c) => <Card key={c.label} className="bg-slate-800/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{c.label}</p>
                <p className="text-xl font-bold text-white mt-1 truncate">{c.value}</p>
                {c.sub && <p className="text-[10px] text-slate-500 mt-0.5">{c.sub}</p>}
              </div>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>)}
    </div>;
}
export {
  ReviewAnalytics
};
