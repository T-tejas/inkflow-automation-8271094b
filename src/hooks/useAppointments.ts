import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSystemError } from '@/lib/systemLogger';

export interface Appointment {
  id: string;
  leadId: string | null;
  leadName: string;
  leadPhone: string;
  appointmentDate: string;
  timeSlot: string;
  durationMinutes: number;
  status: string;
  tattooStyle: string | null;
  notes: string | null;
  reminder1dSent: boolean;
  reminder2hSent: boolean;
  followupSent: boolean;
  createdAt: string;
  googleEventId: string | null;
}

export interface StudioAvailability {
  id: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  specificDate: string | null;
}

function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadName: row.lead_name,
    leadPhone: row.lead_phone,
    appointmentDate: row.appointment_date,
    timeSlot: row.time_slot,
    durationMinutes: row.duration_minutes,
    status: row.status,
    tattooStyle: row.tattoo_style,
    notes: row.notes,
    reminder1dSent: row.reminder_1d_sent,
    reminder2hSent: row.reminder_2h_sent,
    followupSent: row.followup_sent,
    createdAt: row.created_at,
    googleEventId: row.google_event_id || null,
  };
}

// Generate time slots between start and end times
export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes = 60): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    current += intervalMinutes;
  }
  return slots;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<StudioAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    if (data) setAppointments(data.map(mapAppointment));
    setLoading(false);
  }, []);

  const fetchAvailability = useCallback(async () => {
    const { data } = await supabase
      .from('studio_availability')
      .select('*')
      .order('day_of_week', { ascending: true });
    if (data) {
      setAvailability(data.map((r: any) => ({
        id: r.id,
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        endTime: r.end_time,
        isAvailable: r.is_available,
        specificDate: r.specific_date,
      })));
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchAvailability();
  }, [fetchAppointments, fetchAvailability]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  const getAvailableSlots = useCallback((date: Date): string[] => {
    const dayOfWeek = date.getDay();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const blockedDate = availability.find(
      a => a.specificDate === dateStr && !a.isAvailable
    );
    if (blockedDate) return [];

    const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!dayAvail || !dayAvail.isAvailable) return [];

    const allSlots = generateTimeSlots(dayAvail.startTime, dayAvail.endTime);

    const bookedSlots = appointments
      .filter(a => a.appointmentDate === dateStr && a.status !== 'cancelled')
      .map(a => a.timeSlot);

    return allSlots.filter(s => !bookedSlots.includes(s));
  }, [availability, appointments]);

  const isDayAvailable = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const blocked = availability.find(a => a.specificDate === dateStr && !a.isAvailable);
    if (blocked) return false;
    const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
    return !!dayAvail?.isAvailable;
  }, [availability]);

  const syncCalendarEvent = useCallback(async (
    action: 'create' | 'update' | 'delete',
    appointmentData: any,
    googleEventId?: string | null
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: {
          action,
          appointment_id: appointmentData?.id,
          event_id: googleEventId,
          event_data: action !== 'delete' ? {
            _type: 'appointment',
            client_name: appointmentData.leadName || appointmentData.lead_name,
            client_phone: appointmentData.leadPhone || appointmentData.lead_phone,
            appointment_date: appointmentData.appointmentDate || appointmentData.appointment_date,
            time_slot: appointmentData.timeSlot || appointmentData.time_slot,
            duration_minutes: appointmentData.durationMinutes || appointmentData.duration_minutes || 120,
            tattoo_style: appointmentData.tattooStyle || appointmentData.tattoo_style,
            notes: appointmentData.notes,
          } : undefined,
        },
      });
      if (error || !data?.success) {
        console.error('Calendar sync failed:', error || data);
        return null;
      }
      return data?.event_id || true;
    } catch (err) {
      console.error('Calendar sync error:', err);
      await logSystemError('general', `Google Calendar sync failed: ${action}`, { error: String(err) });
      return null;
    }
  }, []);

  const createAppointment = useCallback(async (data: {
    leadId: string | null;
    leadName: string;
    leadPhone: string;
    appointmentDate: string;
    timeSlot: string;
    durationMinutes?: number;
    tattooStyle?: string;
    notes?: string;
  }) => {
    const { data: insertedRows, error } = await supabase.from('appointments').insert({
      lead_id: data.leadId,
      lead_name: data.leadName,
      lead_phone: data.leadPhone,
      appointment_date: data.appointmentDate,
      time_slot: data.timeSlot,
      duration_minutes: data.durationMinutes || 60,
      tattoo_style: data.tattooStyle || null,
      notes: data.notes || null,
    } as any).select();
    if (error) throw error;

    // Update lead preferred_date
    if (data.leadId) {
      await supabase.from('leads').update({
        preferred_date: data.appointmentDate,
        status: 'Booked',
        updated_at: new Date().toISOString(),
      }).eq('id', data.leadId);

      await supabase.from('lead_interactions').insert({
        lead_id: data.leadId,
        action_type: 'appointment_booked',
        new_value: `${data.appointmentDate} at ${data.timeSlot}`,
      });
    }

    // Sync to Google Calendar (non-blocking)
    if (insertedRows && insertedRows[0]) {
      syncCalendarEvent('create', {
        id: insertedRows[0].id,
        ...data,
        leadName: data.leadName,
        leadPhone: data.leadPhone,
        appointmentDate: data.appointmentDate,
        timeSlot: data.timeSlot,
        durationMinutes: data.durationMinutes || 60,
        tattooStyle: data.tattooStyle,
        notes: data.notes,
      }).catch(() => {});
    }

    // Send WhatsApp booking confirmation
    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: data.leadPhone,
          leadName: data.leadName,
          type: 'text',
          messageBody: `✅ Booking Confirmed!\n\n📅 Date: ${data.appointmentDate}\n🕐 Time: ${data.timeSlot}\n${data.tattooStyle ? `🎨 Style: ${data.tattooStyle}\n` : ''}\nSee you at F19 Tattoo Studio! Reply if you need to reschedule.`,
        },
      });
    } catch (e) {
      console.error('Failed to send booking confirmation WhatsApp:', e);
    }

    await fetchAppointments();
  }, [fetchAppointments, syncCalendarEvent]);

  const updateAppointmentStatus = useCallback(async (id: string, status: string) => {
    // Get current appointment to check for google_event_id
    const appointment = appointments.find(a => a.id === id);
    
    await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    // If cancelled, delete from Google Calendar
    if (status === 'cancelled' && appointment?.googleEventId) {
      syncCalendarEvent('delete', appointment, appointment.googleEventId).catch(() => {});
    }

    await fetchAppointments();
  }, [fetchAppointments, appointments, syncCalendarEvent]);

  const cancelAppointment = useCallback(async (appointment: Appointment) => {
    await updateAppointmentStatus(appointment.id, 'cancelled');

    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: appointment.leadPhone,
          leadName: appointment.leadName,
          type: 'text',
          messageBody: `❌ Your appointment on ${appointment.appointmentDate} at ${appointment.timeSlot} has been cancelled. Please contact us to reschedule.`,
        },
      });
    } catch { /* ignore */ }
  }, [updateAppointmentStatus]);

  const rescheduleAppointment = useCallback(async (
    id: string,
    newDate: string,
    newTimeSlot: string
  ) => {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;

    await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        time_slot: newTimeSlot,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    // Update Google Calendar event
    if (appointment.googleEventId) {
      syncCalendarEvent('update', {
        ...appointment,
        appointmentDate: newDate,
        timeSlot: newTimeSlot,
      }, appointment.googleEventId).catch(() => {});
    }

    await fetchAppointments();
  }, [fetchAppointments, appointments, syncCalendarEvent]);

  return {
    appointments,
    availability,
    loading,
    getAvailableSlots,
    isDayAvailable,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    rescheduleAppointment,
    fetchAppointments,
    fetchAvailability,
  };
}
