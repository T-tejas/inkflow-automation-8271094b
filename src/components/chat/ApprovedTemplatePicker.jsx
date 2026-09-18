import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
const APPROVED_TEMPLATES = [
  {
    type: "confirmation",
    name: "booking_confirmation",
    label: "\u2705 Booking Confirmation",
    description: "Confirm appointment \u2014 works anytime",
    preview: "Hi {{name}}, your tattoo appointment has been confirmed. Please arrive 15 minutes early."
  },
  {
    type: "reminder",
    name: "appointment_reminder",
    label: "\u23F0 Appointment Reminder",
    description: "Remind upcoming session \u2014 works anytime",
    preview: "Hi {{name}}, just a reminder about your upcoming tattoo session at F19."
  },
  {
    type: "promo",
    name: "promo_offer",
    label: "\u{1F381} Re-engagement / Offer",
    description: "Re-open 24h window with a check-in",
    preview: "Hi {{name}}, are you still interested in your tattoo design? Reply YES to continue."
  }
];
function ApprovedTemplatePicker({ onSelect, disabled, highlight }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
    className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-40",
      highlight ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md animate-pulse" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
    )}
    disabled={disabled}
    title="Send Meta-approved template (works even after 24h window closes)"
  >
          <ShieldCheck className="h-3.5 w-3.5" />
          {highlight ? "Send Template" : "Approved"}
        </button>
      </PopoverTrigger>
      <PopoverContent
    className="w-80 p-1 rounded-lg shadow-xl border"
    style={{ backgroundColor: "#ffffff", borderColor: "#e9edef" }}
    side="top"
    align="start"
  >
        <div className="px-3 py-2 border-b" style={{ borderColor: "#f0f2f5" }}>
          <div className="text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5" style={{ color: "#16a34a" }}>
            <ShieldCheck className="h-3 w-3" />
            Meta-Approved Templates
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#667781" }}>
            Sent instantly. Works even after 24-hour window closes.
          </p>
        </div>
        {APPROVED_TEMPLATES.map((t) => <button
    key={t.name}
    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded transition-colors group"
    onClick={() => {
      onSelect(t.type, t.name);
      setOpen(false);
    }}
  >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium" style={{ color: "#111b21" }}>{t.label}</span>
              <Send className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#16a34a" }} />
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "#667781" }}>{t.description}</p>
            <p className="text-[11px] mt-1 italic line-clamp-2 px-2 py-1 rounded" style={{ color: "#54656f", backgroundColor: "#f0f2f5" }}>
              "{t.preview}"
            </p>
          </button>)}
        <div className="px-3 py-2 border-t text-[10px]" style={{ borderColor: "#f0f2f5", color: "#8696a0" }}>
          Templates must be APPROVED in Meta Business Manager.
        </div>
      </PopoverContent>
    </Popover>;
}
export {
  ApprovedTemplatePicker
};
