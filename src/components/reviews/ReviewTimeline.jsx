import { Send, Eye, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
const fmt = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
function ReviewTimeline({ r }) {
  const steps = [
    { key: "sent", label: "Sent", icon: Send, done: !!r.review_sent_at, at: r.review_sent_at },
    { key: "opened", label: "Opened", icon: Eye, done: !!r.opened_at, at: r.opened_at },
    { key: "rated", label: r.rating ? `${r.rating}\u2605 Given` : "Rated", icon: Star, done: !!r.rating, at: r.rating ? r.created_at : null },
    { key: "posted", label: "Google Posted", icon: CheckCircle2, done: !!r.posted_to_google, at: r.google_redirected_at }
  ];
  return <div className="flex items-center gap-1 sm:gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
      {steps.map((s, i) => {
    const Icon = s.icon;
    return <div key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] sm:text-xs border transition-colors",
        s.done ? "bg-green-500/15 border-green-500/40 text-green-300" : "bg-slate-800/40 border-slate-700 text-slate-500"
      )}
      title={s.at ? fmt(s.at) : "Pending"}
    >
              <Icon className="h-3 w-3" />
              <span className="font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px w-3 sm:w-5", steps[i + 1].done ? "bg-green-500/50" : "bg-slate-700")} />}
          </div>;
  })}
    </div>;
}
export {
  ReviewTimeline
};
