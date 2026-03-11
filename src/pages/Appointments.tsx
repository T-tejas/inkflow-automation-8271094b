import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { BookingDialog } from '@/components/appointments/BookingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, CalendarPlus, Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, AlertCircle, Palette, RefreshCw, ClockIcon, ThumbsUp, ThumbsDown
} from 'lucide-react';

function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', icon: ClockIcon },
  confirmed: { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2 },
  completed: { bg: 'bg-info/10', text: 'text-info', icon: CheckCircle2 },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', icon: XCircle },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive', icon: XCircle },
  no_show: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertCircle },
};

async function sendWhatsAppMessage(phone: string, leadName: string, messageBody: string) {
  try {
    await supabase.functions.invoke('send-whatsapp', {
      body: { phone, leadName, type: 'text', messageBody },
    });
  } catch (e) {
    console.error('Failed to send WhatsApp:', e);
  }
}

export default function Appointments() {
  const navigate = useNavigate();
  const {
    appointments, loading, getAvailableSlots, isDayAvailable,
    createAppointment, updateAppointmentStatus, cancelAppointment,
  } = useAppointments();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tab, setTab] = useState('pending');

  const pending = appointments.filter(a => a.status === 'pending');
  const upcoming = appointments.filter(a => a.status === 'confirmed' && !isPast(parseISO(a.appointmentDate)));
  const todayAppts = appointments.filter(a => isToday(parseISO(a.appointmentDate)) && a.status !== 'cancelled' && a.status !== 'rejected');
  const past = appointments.filter(a => isPast(parseISO(a.appointmentDate)) || a.status === 'completed' || a.status === 'cancelled' || a.status === 'rejected');

  const handleApprove = async (appt: any) => {
    await updateAppointmentStatus(appt.id, 'confirmed');
    if (appt.leadId) {
      await supabase.from('leads').update({ status: 'Booked', updated_at: new Date().toISOString() }).eq('id', appt.leadId);
    }
    const dayLabel = new Date(appt.appointmentDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    await sendWhatsAppMessage(
      appt.leadPhone,
      appt.leadName,
      `✅ Booking Confirmed!\n\n📅 ${dayLabel}\n🕐 ${appt.timeSlot}\n📍 F19 Tattoo Studio, Kothrud, Pune\n\nPlease arrive 15 minutes early. See you soon! 🎨🔥`
    );
    toast.success('Appointment approved & client notified');
  };

  const handleReject = async (appt: any) => {
    await updateAppointmentStatus(appt.id, 'rejected');
    await sendWhatsAppMessage(
      appt.leadPhone,
      appt.leadName,
      `Sorry, that slot is unavailable. Please choose another time.\n\nReply "Book" to see available slots or contact us at +91 7517050600.`
    );
    toast.success('Appointment rejected & client notified');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderAppointmentCard = (appt: any) => {
    const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.confirmed;
    const StatusIcon = statusStyle.icon;
    const dateObj = parseISO(appt.appointmentDate);
    const dateLabel = isToday(dateObj) ? 'Today' : isTomorrow(dateObj) ? 'Tomorrow' : format(dateObj, 'EEE, dd MMM yyyy');

    return (
      <Card key={appt.id} className="glass-card hover:border-border transition-colors">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[60px]">
                <p className="text-lg font-bold text-foreground">{format(dateObj, 'dd')}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{format(dateObj, 'MMM')}</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{appt.leadName}</p>
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-[10px]`}>
                    <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                    {appt.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {appt.timeSlot}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {appt.leadPhone}
                  </span>
                  {appt.tattooStyle && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Palette className="h-3 w-3" /> {appt.tattooStyle}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{dateLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              {appt.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-success hover:bg-success/10 gap-1"
                    onClick={() => handleApprove(appt)}
                  >
                    <ThumbsUp className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                    onClick={() => handleReject(appt)}
                  >
                    <ThumbsDown className="h-3 w-3" /> Reject
                  </Button>
                </>
              )}
              {appt.status === 'confirmed' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-success hover:bg-success/10"
                    onClick={() => {
                      updateAppointmentStatus(appt.id, 'completed');
                      toast.success('Marked as completed');
                    }}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      cancelAppointment(appt);
                      toast.success('Appointment cancelled');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" /> CRM
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-success" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">Appointments</h1>
            </div>
          </div>
          <Button onClick={() => setBookingOpen(true)} className="gap-2" size="sm">
            <CalendarPlus className="h-4 w-4" /> New Booking
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{pending.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-foreground">{todayAppts.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-success">{upcoming.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-info">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-destructive">
                {appointments.filter(a => a.status === 'cancelled' || a.status === 'rejected').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending {pending.length > 0 && <Badge className="ml-1.5 bg-warning/20 text-warning border-0 text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="today">
              Today ({todayAppts.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({past.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({appointments.length})
            </TabsTrigger>
          </TabsList>

          {[
            { key: 'pending', list: pending },
            { key: 'upcoming', list: upcoming },
            { key: 'today', list: todayAppts },
            { key: 'past', list: past },
            { key: 'all', list: appointments },
          ].map(({ key, list }) => (
            <TabsContent key={key} value={key}>
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
                  {list.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>{key === 'pending' ? 'No pending requests' : 'No appointments'}</p>
                    </div>
                  )}
                  {list.map(renderAppointmentCard)}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BookingDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        getAvailableSlots={getAvailableSlots}
        isDayAvailable={isDayAvailable}
        onBook={createAppointment}
      />
    </div>
  );
}
