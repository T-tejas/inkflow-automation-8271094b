import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InstagramMessage {
  id: string;
  leadId: string | null;
  leadName: string;
  instagramUsername: string;
  instagramSenderId: string;
  messageBody: string | null;
  messageType: string | null;
  mediaUrl: string | null;
  direction: string;
  status: string;
  deliveryStatus: string | null;
  metaMessageId: string | null;
  errorMessage: string | null;
  isInternalNote: boolean;
  starred: boolean;
  isEscalated: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface InstagramContact {
  leadId: string;
  leadName: string;
  instagramUsername: string;
  instagramSenderId: string;
  leadStatus: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  botEnabled: boolean;
}

function mapRow(row: any): InstagramMessage {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadName: row.lead_name,
    instagramUsername: row.instagram_username,
    instagramSenderId: row.instagram_sender_id,
    messageBody: row.message_body,
    messageType: row.message_type || null,
    mediaUrl: row.media_url || null,
    direction: row.direction,
    status: row.status,
    deliveryStatus: row.delivery_status || null,
    metaMessageId: row.meta_message_id || null,
    errorMessage: row.error_message || null,
    isInternalNote: row.is_internal_note,
    starred: row.starred,
    isEscalated: row.is_escalated,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2XjHVjWGJ0hZSdmpKCcGFfbX+QnZuUh3ZoYWp6i5iamZOGdmhlanqLmJqZk4Z2aA==';

export function useInstagramChat() {
  const [contacts, setContacts] = useState<InstagramContact[]>([]);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  const fetchContacts = useCallback(async () => {
    // Get all unique Instagram senders from messages
    const { data: allMessages } = await supabase
      .from('instagram_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!allMessages) { setLoading(false); return; }

    const contactMap = new Map<string, InstagramContact>();

    for (const m of allMessages) {
      const senderId = m.instagram_sender_id;
      if (m.direction !== 'incoming') continue;

      if (!contactMap.has(senderId)) {
        // Get bot state
        const { data: botState } = await supabase
          .from('instagram_bot_state')
          .select('bot_enabled')
          .eq('instagram_sender_id', senderId)
          .single();

        contactMap.set(senderId, {
          leadId: m.lead_id || '',
          leadName: m.lead_name,
          instagramUsername: m.instagram_username,
          instagramSenderId: senderId,
          leadStatus: 'New Lead',
          lastMessage: m.message_body || '💬 Message',
          lastMessageTime: m.created_at,
          unreadCount: 0,
          botEnabled: botState?.bot_enabled !== false,
        });
      }

      if (!m.read_at && m.direction === 'incoming') {
        const contact = contactMap.get(senderId)!;
        contact.unreadCount++;
      }
    }

    // Get lead statuses
    const leadIds = [...contactMap.values()].map(c => c.leadId).filter(Boolean);
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, status')
        .in('id', leadIds);
      if (leads) {
        for (const lead of leads) {
          for (const contact of contactMap.values()) {
            if (contact.leadId === lead.id) {
              contact.leadStatus = lead.status;
            }
          }
        }
      }
    }

    const contactList = [...contactMap.values()];
    contactList.sort((a, b) => {
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      return 0;
    });

    setContacts(contactList);
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (senderId: string) => {
    setMessagesLoading(true);
    const { data: allMsgs } = await supabase
      .from('instagram_messages')
      .select('*')
      .eq('instagram_sender_id', senderId)
      .order('created_at', { ascending: true });

    setMessages(allMsgs ? allMsgs.map(mapRow) : []);
    setMessagesLoading(false);
  }, []);

  const markAsRead = useCallback(async (senderId: string) => {
    await supabase
      .from('instagram_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('instagram_sender_id', senderId)
      .eq('direction', 'incoming')
      .is('read_at', null);

    setContacts(prev => prev.map(c =>
      c.instagramSenderId === senderId ? { ...c, unreadCount: 0 } : c
    ));
  }, []);

  const selectContact = useCallback((senderId: string) => {
    setSelectedSenderId(senderId);
    fetchMessages(senderId);
    markAsRead(senderId);
  }, [fetchMessages, markAsRead]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('instagram-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'instagram_messages' }, (payload) => {
        const newMsg = mapRow(payload.new);
        if (newMsg.instagramSenderId === selectedSenderId) {
          setMessages(prev => [...prev, newMsg]);
        }
        if (newMsg.direction === 'incoming') {
          audioRef.current?.play().catch(() => {});
        }
        fetchContacts();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'instagram_messages' }, (payload) => {
        const updated = mapRow(payload.new);
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSenderId, fetchContacts]);

  const sendMessage = useCallback(async (senderId: string, leadName: string, leadId: string, text: string) => {
    const { data, error } = await supabase.functions.invoke('send-instagram', {
      body: { recipientId: senderId, leadName, leadId, messageBody: text },
    });
    if (error) throw error;
    return data;
  }, []);

  const toggleBotEnabled = useCallback(async (senderId: string, currentEnabled: boolean) => {
    const newValue = !currentEnabled;
    await supabase
      .from('instagram_bot_state')
      .update({ bot_enabled: newValue, updated_at: new Date().toISOString() })
      .eq('instagram_sender_id', senderId);

    setContacts(prev => prev.map(c =>
      c.instagramSenderId === senderId ? { ...c, botEnabled: newValue } : c
    ));
  }, []);

  const toggleStar = useCallback(async (messageId: string, currentStarred: boolean) => {
    await supabase
      .from('instagram_messages')
      .update({ starred: !currentStarred })
      .eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: !currentStarred } : m));
  }, []);

  return {
    contacts,
    messages,
    selectedSenderId,
    loading,
    messagesLoading,
    selectContact,
    sendMessage,
    toggleBotEnabled,
    toggleStar,
    fetchContacts,
  };
}
