import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, isPast, isAfter, startOfDay } from 'date-fns';
import { useAppointments } from '@/hooks/useAppointments';
import { BookingDialog } from '@/components/appointments/BookingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarPlus, Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, AlertCircle, Palette, RefreshCw
} from 'lucide-react';

function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle2 },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: CheckCircle2 },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', icon: XCircle },
  no_show: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertCircle },
};

export default function Appointments() {
  const navigate = useNavigate();
  const {
    appointments, loading, getAvailableSlots, isDayAvailable,
    createAppointment, updateAppointmentStatus, cancelAppointment,
  } = useAppointments();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tab, setTab] = useState('upcoming');

  const today = startOfDay(new Date());
  const upcoming = appointments.filter(a => a.status === 'confirmed' && !isPast(parseISO(a.appointmentDate)));
  const todayAppts = appointments.filter(a => isToday(parseISO(a.appointmentDate)) && a.status !== 'cancelled');
  const past = appointments.filter(a => isPast(parseISO(a.appointmentDate)) || a.status === 'completed' || a.status === 'cancelled');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-1.5" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" /> CRM
            </Button>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-sm font-semibold">Appointments</h1>
            </div>
          </div>
          <Button
            onClick={() => setBookingOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
          >
            <CalendarPlus className="h-4 w-4" /> New Booking
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-zinc-500">Today</p>
              <p className="text-2xl font-bold text-white">{todayAppts.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-zinc-500">Upcoming</p>
              <p className="text-2xl font-bold text-emerald-400">{upcoming.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-zinc-500">Completed</p>
              <p className="text-2xl font-bold text-blue-400">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-zinc-500">Cancelled</p>
              <p className="text-2xl font-bold text-red-400">
                {appointments.filter(a => a.status === 'cancelled').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-zinc-700">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-zinc-700">
              Today ({todayAppts.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-zinc-700">
              Past ({past.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-700">
              All ({appointments.length})
            </TabsTrigger>
          </TabsList>

          {['upcoming', 'today', 'past', 'all'].map(tabKey => {
            const list =
              tabKey === 'upcoming' ? upcoming :
              tabKey === 'today' ? todayAppts :
              tabKey === 'past' ? past :
              appointments;

            return (
              <TabsContent key={tabKey} value={tabKey}>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-2">
                    {list.length === 0 && (
                      <div className="text-center py-12 text-zinc-500">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No appointments</p>
                      </div>
                    )}
                    {list.map(appt => {
                      const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.confirmed;
                      const StatusIcon = statusStyle.icon;
                      const dateObj = parseISO(appt.appointmentDate);
                      const dateLabel = isToday(dateObj) ? 'Today' : isTomorrow(dateObj) ? 'Tomorrow' : format(dateObj, 'EEE, dd MMM yyyy');

                      return (
                        <Card key={appt.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[60px]">
                                  <p className="text-lg font-bold text-white">{format(dateObj, 'dd')}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase">{format(dateObj, 'MMM')}</p>
                                </div>
                                <div className="h-10 w-px bg-zinc-800" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-white">{appt.leadName}</p>
                                    <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-[10px]`}>
                                      <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                                      {appt.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> {formatTimeSlot(appt.timeSlot)}
                                    </span>
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                      <Phone className="h-3 w-3" /> {appt.leadPhone}
                                    </span>
                                    {appt.tattooStyle && (
                                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                                        <Palette className="h-3 w-3" /> {appt.tattooStyle}
                                      </span>
                                    )}
                                    <span className="text-xs text-zinc-500">{dateLabel}</span>
                                  </div>
                                </div>
                              </div>

                              {appt.status === 'confirmed' && (
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-zinc-700 text-emerald-400 hover:bg-emerald-500/10"
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
                                    className="text-xs border-zinc-700 text-red-400 hover:bg-red-500/10"
                                    onClick={() => {
                                      cancelAppointment(appt);
                                      toast.success('Appointment cancelled');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
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
