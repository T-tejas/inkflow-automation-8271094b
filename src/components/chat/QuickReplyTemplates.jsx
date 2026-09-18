import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Zap } from "lucide-react";
import { useState } from "react";
const TEMPLATES = [
  { label: "\u2705 Booking Confirmation", type: "confirmation", name: "booking_confirmation", description: "Confirm their tattoo appointment", text: "Hi {{name}}, your tattoo appointment has been confirmed! Please arrive 15 minutes early. See you soon! \u{1F3A8}" },
  { label: "\u{1F4B0} Deposit Request", type: "promo", name: "promo_offer", description: "Request deposit payment", text: "Hi {{name}}, to secure your booking please complete the deposit payment. Let us know if you have any questions! \u{1F4B0}" },
  { label: "\u23F0 Appointment Reminder", type: "reminder", name: "appointment_reminder", description: "Remind about upcoming session", text: "Hi {{name}}, just a reminder about your upcoming tattoo session. Please confirm your availability! \u23F0" },
  { label: "\u{1FA79} Aftercare Instructions", type: "promo", name: "promo_offer", description: "Send aftercare tips", text: "Hi {{name}}, here are your tattoo aftercare instructions: Keep it clean, moisturize regularly, avoid direct sunlight for 2 weeks. \u{1FA79}" }
];
function QuickReplyTemplates({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
    className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40"
    disabled={disabled}
    style={{ color: "#54656f" }}
  >
          <Zap className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
    className="w-72 p-1 rounded-lg shadow-xl border"
    style={{ backgroundColor: "#ffffff", borderColor: "#e9edef" }}
    side="top"
    align="start"
  >
        <div className="text-[11px] px-3 py-2 uppercase tracking-wider font-semibold" style={{ color: "#8696a0" }}>
          Quick Templates — loads into input for editing
        </div>
        {TEMPLATES.map((t) => <button
    key={t.label}
    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded text-sm transition-colors"
    onClick={() => {
      onSelect(t);
      setOpen(false);
    }}
  >
            <span style={{ color: "#111b21" }}>{t.label}</span>
            <span className="block text-[11px] mt-0.5" style={{ color: "#667781" }}>{t.description}</span>
          </button>)}
      </PopoverContent>
    </Popover>;
}
export {
  QuickReplyTemplates
};
