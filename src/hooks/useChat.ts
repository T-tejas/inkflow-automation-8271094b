import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  leadPhone: string;
  leadName: string;
  leadId: string | null;
  templateName: string;
  templateType: string;
  status: string;
  deliveryStatus: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  metaMessageId: string | null;
  errorMessage: string | null;
  messageBody: string | null;
  isInternalNote: boolean;
  starred: boolean;
  createdAt: string;
}

export interface ChatContact {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  whatsappOptIn: boolean;
}

function mapRow(row: any): ChatMessage {
  return {
    id: row.id,
    leadPhone: row.lead_phone,
    leadName: row.lead_name,
    leadId: row.lead_id,
    templateName: row.template_name,
    templateType: row.template_type,
    status: row.status,
    deliveryStatus: row.delivery_status,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    metaMessageId: row.meta_message_id,
    errorMessage: row.error_message,
    messageBody: row.message_body,
    isInternalNote: row.is_internal_note,
    starred: row.starred,
    createdAt: row.created_at,
  };
}

// Notification sound as inline base64 (short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2XjHVjWGJ0hZSdmpKCcGFfbX+QnZuUh3ZoYWp6i5iamZOGdmhlanqLmJqZk4Z2aA==';

export function useChat() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Init audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  // Fetch contacts (all leads with their last message info)
  const fetchContacts = useCallback(async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, full_name, phone, status, whatsapp_opt_in')
      .order('updated_at', { ascending: false });

    if (!leads) { setLoading(false); return; }

    // Get last message and unread counts per phone
    const { data: allMessages } = await supabase
      .from('whatsapp_messages')
      .select('lead_phone, message_body, template_name, template_type, status, created_at')
      .order('created_at', { ascending: false });

    const msgMap = new Map<string, { lastMsg: string; lastTime: string; unread: number }>();

    if (allMessages) {
      for (const m of allMessages) {
        const phone = m.lead_phone;
        if (!msgMap.has(phone)) {
          msgMap.set(phone, {
            lastMsg: m.message_body || m.template_name,
            lastTime: m.created_at,
            unread: 0,
          });
        }
        if (m.status === 'received' || m.template_type === 'incoming') {
          const entry = msgMap.get(phone)!;
          entry.unread++;
        }
      }
    }

    const contactList: ChatContact[] = leads.map(l => {
      const info = msgMap.get(l.phone);
      return {
        leadId: l.id,
        leadName: l.full_name,
        leadPhone: l.phone,
        leadStatus: l.status,
        lastMessage: info?.lastMsg || null,
        lastMessageTime: info?.lastTime || null,
        unreadCount: info?.unread || 0,
        whatsappOptIn: l.whatsapp_opt_in,
      };
    });

    // Sort: contacts with messages first, then by last message time
    contactList.sort((a, b) => {
      if (a.lastMessageTime && !b.lastMessageTime) return -1;
      if (!a.lastMessageTime && b.lastMessageTime) return 1;
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      return a.leadName.localeCompare(b.leadName);
    });

    setContacts(contactList);
    setLoading(false);
  }, []);

  // Fetch messages for selected phone
  const fetchMessages = useCallback(async (phone: string) => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_phone', phone)
      .order('created_at', { ascending: true });

    setMessages(data ? data.map(mapRow) : []);
    setMessagesLoading(false);
  }, []);

  // Select a contact
  const selectContact = useCallback((phone: string) => {
    setSelectedPhone(phone);
    fetchMessages(phone);
  }, [fetchMessages]);

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMsg = mapRow(payload.new);

          // If it's for the currently selected contact, add to messages
          if (newMsg.leadPhone === selectedPhone) {
            setMessages(prev => [...prev, newMsg]);
          }

          // Play sound for incoming messages
          if (newMsg.templateType === 'incoming' || newMsg.status === 'received') {
            audioRef.current?.play().catch(() => {});
          }

          // Refresh contacts to update last message and unread
          fetchContacts();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const updated = mapRow(payload.new);
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedPhone, fetchContacts]);

  // Send template message
  const sendTemplate = useCallback(async (
    phone: string,
    leadName: string,
    leadId: string,
    templateType: 'confirmation' | 'reminder' | 'promo',
    templateName: string,
    parameters?: string[]
  ) => {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, leadName, templateType, templateName, parameters },
    });

    if (error) throw error;
    return data;
  }, []);

  // Add internal note
  const addNote = useCallback(async (phone: string, leadName: string, leadId: string, noteText: string) => {
    const { error } = await supabase.from('whatsapp_messages').insert({
      lead_phone: phone,
      lead_name: leadName,
      lead_id: leadId,
      template_name: 'internal_note',
      template_type: 'note',
      status: 'note',
      message_body: noteText,
      is_internal_note: true,
    } as any);

    if (error) throw error;
  }, []);

  // Toggle star
  const toggleStar = useCallback(async (messageId: string, currentStarred: boolean) => {
    await supabase
      .from('whatsapp_messages')
      .update({ starred: !currentStarred } as any)
      .eq('id', messageId);

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: !currentStarred } : m));
  }, []);

  return {
    contacts,
    messages,
    selectedPhone,
    loading,
    messagesLoading,
    selectContact,
    sendTemplate,
    addNote,
    toggleStar,
    fetchContacts,
  };
}
