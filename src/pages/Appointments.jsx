import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { useAppointments } from "@/hooks/useAppointments";
import { BookingDialog } from "@/components/appointments/BookingDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CalendarPlus,
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Palette,
  RefreshCw,
  ClockIcon,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
function formatTimeSlot(slot) {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}
const STATUS_CONFIG = {
  pending: { bg: "bg-amber-500/15", text: "text-amber-400", icon: ClockIcon, label: "Pending" },
  confirmed: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle2, label: "Confirmed" },
  completed: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: CheckCircle2, label: "Completed" },
  cancelled: { bg: "bg-red-500/15", text: "text-red-400", icon: XCircle, label: "Cancelled" },
  rejected: { bg: "bg-red-500/15", text: "text-red-400", icon: XCircle, label: "Rejected" },
  no_show: { bg: "bg-amber-500/15", text: "text-amber-400", icon: AlertCircle, label: "No Show" }
};
async function sendWhatsAppMessage(phone, leadName, messageBody) {
  try {
    await supabase.functions.invoke("send-whatsapp", {
      body: { phone, leadName, type: "text", messageBody }
    });
  } catch (e) {
    console.error("Failed to send WhatsApp:", e);
  }
}
function Appointments() {
  const navigate = useNavigate();
  const {
    appointments,
    loading,
    getAvailableSlots,
    isDayAvailable,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment
  } = useAppointments();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tab, setTab] = useState("pending");
  const pending = appointments.filter((a) => a.status === "pending");
  const upcoming = appointments.filter((a) => a.status === "confirmed" && !isPast(parseISO(a.appointmentDate)));
  const todayAppts = appointments.filter((a) => isToday(parseISO(a.appointmentDate)) && a.status !== "cancelled" && a.status !== "rejected");
  const past = appointments.filter((a) => isPast(parseISO(a.appointmentDate)) || a.status === "completed" || a.status === "cancelled" || a.status === "rejected");
  const handleApprove = async (appt) => {
    await updateAppointmentStatus(appt.id, "confirmed");
    if (appt.leadId) {
      await supabase.from("leads").update({ status: "Booked", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", appt.leadId);
    }
    const dayLabel = new Date(appt.appointmentDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    await sendWhatsAppMessage(
      appt.leadPhone,
      appt.leadName,
      `\u2705 Booking Confirmed!

\u{1F4C5} ${dayLabel}
\u{1F550} ${appt.timeSlot}
\u{1F4CD} F19 Tattoo Studio, Kothrud, Pune

Please arrive 15 minutes early. See you soon! \u{1F3A8}\u{1F525}`
    );
    toast.success("Appointment approved & client notified");
  };
  const handleReject = async (appt) => {
    await updateAppointmentStatus(appt.id, "rejected");
    await sendWhatsAppMessage(
      appt.leadPhone,
      appt.leadName,
      `Sorry, that slot is unavailable. Please choose another time.

Reply "Book" to see available slots or contact us at +91 7517050600.`
    );
    toast.success("Appointment rejected & client notified");
  };
  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
      </div>;
  }
  const renderAppointmentCard = (appt) => {
    const config = STATUS_CONFIG[appt.status] || STATUS_CONFIG.confirmed;
    const StatusIcon = config.icon;
    const dateObj = parseISO(appt.appointmentDate);
    const dateLabel = isToday(dateObj) ? "Today" : isTomorrow(dateObj) ? "Tomorrow" : format(dateObj, "EEE, dd MMM yyyy");
    const isOverdue = isPast(dateObj) && appt.status === "pending";
    return <div
      key={appt.id}
      className={`group rounded-xl border transition-all duration-200 hover:border-slate-500 hover:shadow-lg hover:shadow-black/20 ${isOverdue ? "border-red-500/40 bg-red-500/5" : "border-[#334155] bg-[#1e293b]"}`}
    >
        <div className="p-4">
          {
      /* Mobile layout */
    }
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className={`text-center min-w-[52px] rounded-lg py-2 px-2 ${isOverdue ? "bg-red-500/10" : "bg-[#0f172a]"}`}>
                <p className={`text-lg font-bold ${isOverdue ? "text-red-400" : "text-white"}`}>{format(dateObj, "dd")}</p>
                <p className="text-[10px] text-slate-400 uppercase">{format(dateObj, "MMM")}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{appt.leadName}</p>
                  <Badge className={`${config.bg} ${config.text} border-0 text-[10px] font-medium`}>
                    <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                    {config.label}
                  </Badge>
                  {isOverdue && <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">⚠️ Overdue</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {appt.timeSlot}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {appt.leadPhone}
                  </span>
                  {appt.tattooStyle && <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Palette className="h-3 w-3" /> {appt.tattooStyle}
                    </span>}
                  <span className="text-xs text-slate-500">{dateLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 sm:flex-shrink-0 ml-auto sm:ml-0">
              {appt.status === "pending" && <>
                  <Button
      size="sm"
      className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-0 gap-1 h-8"
      variant="outline"
      onClick={() => handleApprove(appt)}
    >
                    <ThumbsUp className="h-3 w-3" /> Approve
                  </Button>
                  <Button
      size="sm"
      className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0 gap-1 h-8"
      variant="outline"
      onClick={() => handleReject(appt)}
    >
                    <ThumbsDown className="h-3 w-3" /> Reject
                  </Button>
                </>}
              {appt.status === "confirmed" && <>
                  <Button
      size="sm"
      className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-0 h-8"
      variant="outline"
      onClick={() => {
        updateAppointmentStatus(appt.id, "completed");
        toast.success("Marked as completed");
      }}
    >
                    Complete
                  </Button>
                  <Button
      size="sm"
      className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0 h-8"
      variant="outline"
      onClick={() => {
        cancelAppointment(appt);
        toast.success("Appointment cancelled");
      }}
    >
                    Cancel
                  </Button>
                </>}
            </div>
          </div>
        </div>
      </div>;
  };
  const statCards = [
    { label: "Pending", value: pending.length, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Today", value: todayAppts.length, color: "text-white", bg: "bg-slate-700/50" },
    { label: "Upcoming", value: upcoming.length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Completed", value: appointments.filter((a) => a.status === "completed").length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Cancelled", value: appointments.filter((a) => a.status === "cancelled" || a.status === "rejected").length, color: "text-red-400", bg: "bg-red-500/10" }
  ];
  return <div className="min-h-screen bg-[#0f172a]">
      {
    /* Header */
  }
      <header className="border-b border-[#334155] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <Button
    variant="ghost"
    size="sm"
    className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5"
    onClick={() => navigate("/")}
  >
              <ArrowLeft className="h-4 w-4" /> CRM
            </Button>
            <div className="h-5 w-px bg-[#334155]" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-sm font-semibold text-white">Appointments</h1>
            </div>
          </div>
          <Button
    onClick={() => setBookingOpen(true)}
    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
    size="sm"
  >
            <CalendarPlus className="h-4 w-4" /> New Booking
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {
    /* Stats Grid */
  }
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {statCards.map((s) => <div key={s.label} className={`rounded-xl border border-[#334155] ${s.bg} p-4`}>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>)}
        </div>

        {
    /* Tabs */
  }
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-[#1e293b] border border-[#334155]">
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 text-slate-400">
              Pending {pending.length > 0 && <Badge className="ml-1.5 bg-amber-500/20 text-amber-400 border-0 text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 text-slate-400">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400">
              Today ({todayAppts.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400">
              Past ({past.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400">
              All ({appointments.length})
            </TabsTrigger>
          </TabsList>

          {[
    { key: "pending", list: pending },
    { key: "upcoming", list: upcoming },
    { key: "today", list: todayAppts },
    { key: "past", list: past },
    { key: "all", list: appointments }
  ].map(({ key, list }) => <TabsContent key={key} value={key}>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pt-2">
                  {list.length === 0 && <div className="text-center py-16">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p className="text-slate-500 text-sm">{key === "pending" ? "No pending requests" : "No appointments"}</p>
                    </div>}
                  {list.map(renderAppointmentCard)}
                </div>
              </ScrollArea>
            </TabsContent>)}
        </Tabs>
      </main>

      <BookingDialog
    open={bookingOpen}
    onClose={() => setBookingOpen(false)}
    getAvailableSlots={getAvailableSlots}
    isDayAvailable={isDayAvailable}
    onBook={createAppointment}
  />
    </div>;
}
export {
  Appointments as default
};
