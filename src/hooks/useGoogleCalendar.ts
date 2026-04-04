import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logSystemError, logSystemInfo } from '@/lib/systemLogger';

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setConnected(false); setChecking(false); return; }

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'check_status' },
      });
      if (!error && data?.connected) setConnected(true);
      else setConnected(false);
    } catch {
      setConnected(false);
    }
    setChecking(false);
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const connect = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url' },
      });
      if (error || !data?.url) {
        toast.error('Failed to get auth URL');
        return;
      }
      const targetWindow = window.top || window.parent || window;
      targetWindow.open(data.url, '_blank');
      const interval = setInterval(async () => {
        await checkStatus();
      }, 3000);
      setTimeout(() => clearInterval(interval), 300000);
    } catch {
      toast.error('Failed to connect Google Calendar');
    }
  }, [checkStatus]);

  const createAppointmentEvent = useCallback(async (eventData: {
    client_name: string;
    client_phone: string;
    appointment_date: string;
    time_slot: string;
    duration_minutes?: number;
    tattoo_style?: string;
    notes?: string;
    artist_email?: string;
    appointment_id: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: {
          action: 'create',
          appointment_id: eventData.appointment_id,
          event_data: { ...eventData, _type: 'appointment' },
        },
      });
      if (error || !data?.success) {
        console.error('Calendar appointment event error:', error || data);
        await logSystemError('general', `Failed to create calendar event for ${eventData.client_name}`, { error: error?.message || data });
        return null;
      }
      await logSystemInfo('general', `Calendar event created for appointment: ${eventData.client_name}`);
      return data.event_id;
    } catch (err) {
      console.error('Calendar appointment event failed:', err);
      await logSystemError('general', `Calendar event exception for ${eventData.client_name}`, { error: String(err) });
      return null;
    }
  }, []);

  const createEvent = useCallback(async (eventData: {
    client_name: string;
    client_phone: string;
    tattoo_idea?: string;
    placement?: string;
    size?: string;
    budget?: string;
    notes?: string;
    start_date: string;
    end_date: string;
    design_due_date: string;
    tattoo_date?: string;
    artist_email?: string;
    design_task_id?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'create', event_data: eventData, design_task_id: eventData.design_task_id },
      });
      if (error || !data?.success) {
        console.error('Calendar event error:', error || data);
        return null;
      }
      return data.event_id;
    } catch (err) {
      console.error('Calendar event failed:', err);
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, eventData: Record<string, any>) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'update', event_id: eventId, event_data: eventData },
      });
      return !error && data?.success;
    } catch {
      return false;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'delete', event_id: eventId },
      });
      return !error && data?.success;
    } catch {
      return false;
    }
  }, []);

  return { connected, checking, connect, checkStatus, createEvent, createAppointmentEvent, updateEvent, deleteEvent };
}
