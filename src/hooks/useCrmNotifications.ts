import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CrmNotification {
  id: string;
  lead_id: string | null;
  lead_name: string;
  lead_phone: string;
  notification_type: string;
  tattoo_idea: string | null;
  placement: string | null;
  size: string | null;
  budget: string | null;
  lead_source: string | null;
  lead_score: string | null;
  timeline: string | null;
  chat_summary: string | null;
  is_read: boolean;
  created_at: string;
}

export function useCrmNotifications() {
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('crm_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as CrmNotification[]);
      setUnreadCount((data as CrmNotification[]).filter(n => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('crm-notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_notifications' },
        (payload) => {
          const newNotif = payload.new as CrmNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('crm_notifications').update({ is_read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('crm_notifications').update({ is_read: true } as any).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [notifications]);

  return { notifications, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications };
}
