import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Palette,
  FileText,
  Check,
  Loader2
} from "lucide-react";
const TATTOO_STYLES = [
  "Traditional",
  "Realism",
  "Tribal",
  "Watercolor",
  "Portrait",
  "Minimal",
  "Japanese",
  "Geometric",
  "Blackwork",
  "Neo-Traditional",
  "Other"
];
function formatTimeSlot(slot) {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}
function BookingDialog({
  open,
  onClose,
  leadId,
  leadName = "",
  leadPhone = "",
  tattooStyle = "",
  getAvailableSlots,
  isDayAvailable,
  onBook
}) {
  const [selectedDate, setSelectedDate] = useState();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState(leadName);
  const [phone, setPhone] = useState(leadPhone);
  const [style, setStyle] = useState(tattooStyle);
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];
  const today = startOfDay(/* @__PURE__ */ new Date());
  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !name || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      await onBook({
        leadId: leadId || null,
        leadName: name,
        leadPhone: phone,
        appointmentDate: format(selectedDate, "yyyy-MM-dd"),
        timeSlot: selectedSlot,
        durationMinutes: parseInt(duration),
        tattooStyle: style || void 0,
        notes: notes || void 0
      });
      toast.success("Appointment booked! WhatsApp confirmation sent.");
      onClose();
    } catch (e) {
      toast.error("Failed to book appointment");
    }
    setSaving(false);
  };
  return <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[520px] bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-emerald-400" />
            Book Appointment
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-4 pb-2">
            {
    /* Client Info */
  }
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> Client Name *
                </label>
                <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Full name"
    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
  />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone *
                </label>
                <Input
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    placeholder="+91..."
    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
  />
              </div>
            </div>

            {
    /* Tattoo Style & Duration */
  }
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Tattoo Style
                </label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {TATTOO_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Duration
                </label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {
    /* Calendar */
  }
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Select Date *</label>
              <div className="flex justify-center rounded-lg bg-zinc-800 border border-zinc-700 p-1">
                <Calendar
    mode="single"
    selected={selectedDate}
    onSelect={(date) => {
      setSelectedDate(date);
      setSelectedSlot("");
    }}
    disabled={(date) => isBefore(date, today) || !isDayAvailable(date)}
    fromDate={today}
    toDate={addDays(today, 60)}
    className={cn("p-3 pointer-events-auto")}
  />
              </div>
            </div>

            {
    /* Time Slots */
  }
            {selectedDate && <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">
                  Available Slots — {format(selectedDate, "EEEE, dd MMM yyyy")}
                </label>
                {availableSlots.length > 0 ? <div className="grid grid-cols-4 gap-1.5">
                    {availableSlots.map((slot) => <Button
    key={slot}
    variant="outline"
    size="sm"
    className={cn(
      "text-xs border-zinc-700 hover:border-emerald-500/50",
      selectedSlot === slot ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700" : "bg-zinc-800 text-zinc-300"
    )}
    onClick={() => setSelectedSlot(slot)}
  >
                        {formatTimeSlot(slot)}
                      </Button>)}
                  </div> : <p className="text-xs text-zinc-500 text-center py-4">No available slots for this date</p>}
              </div>}

            {
    /* Notes */
  }
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Notes
              </label>
              <Textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Special requests, design details..."
    rows={2}
    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
  />
            </div>

            {
    /* Summary & Book */
  }
            {selectedDate && selectedSlot && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <p className="text-xs font-medium text-emerald-400">Booking Summary</p>
                <p className="text-sm text-white">
                  📅 {format(selectedDate, "EEEE, dd MMMM yyyy")} at {formatTimeSlot(selectedSlot)}
                </p>
                <p className="text-xs text-zinc-400">
                  {name} • {phone} {style && `\u2022 ${style}`} • {duration} min
                </p>
              </div>}

            <Button
    onClick={handleBook}
    disabled={saving || !selectedDate || !selectedSlot || !name || !phone}
    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
  >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Booking & Send WhatsApp
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
}
export {
  BookingDialog
};
