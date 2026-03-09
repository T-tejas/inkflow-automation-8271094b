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
  messageType: string | null;
  mediaUrl: string | null;
  fileName: string | null;
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
  botEnabled: boolean;
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
    messageType: row.message_type || null,
    mediaUrl: row.media_url || null,
    fileName: row.file_name || null,
  };
}

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2XjHVjWGJ0hZSdmpKCcGFfbX+QnZuUh3ZoYWp6i5iamZOGdmhlanqLmJqZk4Z2aA==';

export function useChat() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  const fetchContacts = useCallback(async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, full_name, phone, status, whatsapp_opt_in, bot_enabled')
      .order('updated_at', { ascending: false });

    if (!leads) { setLoading(false); return; }

    const { data: allMessages } = await supabase
      .from('whatsapp_messages')
      .select('lead_phone, message_body, template_name, template_type, status, created_at, read_at, message_type')
      .order('created_at', { ascending: false });

    const msgMap = new Map<string, { lastMsg: string; lastTime: string; unread: number }>();

    if (allMessages) {
      for (const m of allMessages) {
        const phone = m.lead_phone;
        if (!msgMap.has(phone)) {
          let lastMsg = m.message_body || m.template_name;
          // Show media type indicator for media messages
          if ((m as any).message_type && (m as any).message_type !== 'text' && !m.message_body) {
            const typeMap: Record<string, string> = { image: '📷 Photo', video: '🎥 Video', audio: '🎵 Audio', document: '📄 Document', sticker: '🏷️ Sticker' };
            lastMsg = typeMap[(m as any).message_type] || m.template_name;
          }
          msgMap.set(phone, {
            lastMsg,
            lastTime: m.created_at,
            unread: 0,
          });
        }
        if ((m.status === 'received' || m.template_type === 'incoming') && !m.read_at) {
          const entry = msgMap.get(phone)!;
          entry.unread++;
        }
      }
    }

    const contactList: ChatContact[] = leads.map((l: any) => {
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
        botEnabled: l.bot_enabled !== false,
      };
    });

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

  const markAsRead = useCallback(async (phone: string) => {
    await supabase
      .from('whatsapp_messages')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('lead_phone', phone)
      .in('template_type', ['incoming'])
      .is('read_at', null);

    setContacts(prev => prev.map(c => c.leadPhone === phone ? { ...c, unreadCount: 0 } : c));
  }, []);

  const selectContact = useCallback((phone: string) => {
    setSelectedPhone(phone);
    fetchMessages(phone);
    markAsRead(phone);
  }, [fetchMessages, markAsRead]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const newMsg = mapRow(payload.new);
        if (newMsg.leadPhone === selectedPhone) {
          setMessages(prev => [...prev, newMsg]);
        }
        if (newMsg.templateType === 'incoming' || newMsg.status === 'received') {
          audioRef.current?.play().catch(() => {});
        }
        fetchContacts();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const updated = mapRow(payload.new);
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedPhone, fetchContacts]);

  const sendTemplate = useCallback(async (
    phone: string, leadName: string, leadId: string,
    templateType: 'confirmation' | 'reminder' | 'promo',
    templateName: string, parameters?: string[]
  ) => {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, leadName, templateType, templateName, parameters },
    });
    if (error) throw error;
    return data;
  }, []);

  const sendMessage = useCallback(async (phone: string, leadName: string, leadId: string, text: string) => {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, leadName, type: 'text', messageBody: text },
    });
    if (error) throw error;
    return data;
  }, []);

  const sendAttachment = useCallback(async (phone: string, leadName: string, leadId: string, url: string, fileName: string, isImage: boolean) => {
    const msgType = isImage ? 'image' : (fileName.endsWith('.pdf') ? 'document' : 'document');
    const { error } = await supabase.from('whatsapp_messages').insert({
      lead_phone: phone,
      lead_name: leadName,
      lead_id: leadId,
      template_name: 'attachment',
      template_type: 'confirmation',
      status: 'sent',
      message_body: `[file]${url}`,
      message_type: msgType,
      media_url: url,
      file_name: fileName,
    } as any);
    if (error) throw error;
  }, []);

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
      message_type: 'text',
    } as any);
    if (error) throw error;
  }, []);

  const toggleStar = useCallback(async (messageId: string, currentStarred: boolean) => {
    await supabase
      .from('whatsapp_messages')
      .update({ starred: !currentStarred } as any)
      .eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: !currentStarred } : m));
  }, []);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: string, oldStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    if (error) throw error;
    await supabase.from('lead_interactions').insert({
      lead_id: leadId,
      action_type: 'status_change',
      old_value: oldStatus,
      new_value: newStatus,
    });
    await fetchContacts();
  }, [fetchContacts]);

  const toggleBotEnabled = useCallback(async (leadId: string, currentBotEnabled: boolean) => {
    const newValue = !currentBotEnabled;
    const { error } = await supabase.from('leads').update({ bot_enabled: newValue } as any).eq('id', leadId);
    if (error) throw error;
    setContacts(prev => prev.map(c => c.leadId === leadId ? { ...c, botEnabled: newValue } : c));
    await supabase.from('lead_interactions').insert({
      lead_id: leadId,
      action_type: 'bot_toggle',
      old_value: currentBotEnabled ? 'enabled' : 'disabled',
      new_value: newValue ? 'enabled' : 'disabled',
    });
  }, []);

  const retryMessage = useCallback(async (message: ChatMessage) => {
    if (!message.messageBody) return;
    await supabase.from('whatsapp_messages').delete().eq('id', message.id);
    setMessages(prev => prev.filter(m => m.id !== message.id));
    const { error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone: message.leadPhone,
        leadName: message.leadName,
        type: 'text',
        messageBody: message.messageBody,
      },
    });
    if (error) throw error;
  }, []);

  return {
    contacts,
    messages,
    selectedPhone,
    loading,
    messagesLoading,
    selectContact,
    sendTemplate,
    sendMessage,
    sendAttachment,
    addNote,
    toggleStar,
    fetchContacts,
    updateLeadStatus,
    toggleBotEnabled,
    retryMessage,
  };
}
