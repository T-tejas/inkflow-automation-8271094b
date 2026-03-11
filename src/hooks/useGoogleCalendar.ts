import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      // Open in popup
      const popup = window.open(data.url, 'google-calendar-auth', 'width=500,height=600');
      // Poll for popup close
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          checkStatus();
        }
      }, 1000);
    } catch {
      toast.error('Failed to connect Google Calendar');
    }
  }, [checkStatus]);

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

  return { connected, checking, connect, checkStatus, createEvent, updateEvent };
}
