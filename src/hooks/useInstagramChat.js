import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
function mapRow(row) {
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
    createdAt: row.created_at
  };
}
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2XjHVjWGJ0hZSdmpKCcGFfbX+QnZuUh3ZoYWp6i5iamZOGdmhlanqLmJqZk4Z2aA==";
function useInstagramChat() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const audioRef = useRef(null);
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);
  const fetchContacts = useCallback(async () => {
    const { data: allMessages } = await supabase.from("instagram_messages").select("*").order("created_at", { ascending: false });
    if (!allMessages) {
      setLoading(false);
      return;
    }
    const contactMap = /* @__PURE__ */ new Map();
    for (const m of allMessages) {
      const senderId = m.instagram_sender_id;
      if (m.direction !== "incoming") continue;
      if (!contactMap.has(senderId)) {
        const { data: botState } = await supabase.from("instagram_bot_state").select("bot_enabled").eq("instagram_sender_id", senderId).single();
        contactMap.set(senderId, {
          leadId: m.lead_id || "",
          leadName: m.lead_name,
          instagramUsername: m.instagram_username,
          instagramSenderId: senderId,
          leadStatus: "New Lead",
          lastMessage: m.message_body || "\u{1F4AC} Message",
          lastMessageTime: m.created_at,
          unreadCount: 0,
          botEnabled: botState?.bot_enabled !== false
        });
      }
      if (!m.read_at && m.direction === "incoming") {
        const contact = contactMap.get(senderId);
        contact.unreadCount++;
      }
    }
    const leadIds = [...contactMap.values()].map((c) => c.leadId).filter(Boolean);
    if (leadIds.length > 0) {
      const { data: leads } = await supabase.from("leads").select("id, status").in("id", leadIds);
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
  const fetchMessages = useCallback(async (senderId) => {
    setMessagesLoading(true);
    const { data: allMsgs } = await supabase.from("instagram_messages").select("*").eq("instagram_sender_id", senderId).order("created_at", { ascending: true });
    setMessages(allMsgs ? allMsgs.map(mapRow) : []);
    setMessagesLoading(false);
  }, []);
  const markAsRead = useCallback(async (senderId) => {
    await supabase.from("instagram_messages").update({ read_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("instagram_sender_id", senderId).eq("direction", "incoming").is("read_at", null);
    setContacts((prev) => prev.map(
      (c) => c.instagramSenderId === senderId ? { ...c, unreadCount: 0 } : c
    ));
  }, []);
  const selectContact = useCallback((senderId) => {
    setSelectedSenderId(senderId);
    fetchMessages(senderId);
    markAsRead(senderId);
  }, [fetchMessages, markAsRead]);
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  useEffect(() => {
    const channel = supabase.channel("instagram-messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "instagram_messages" }, (payload) => {
      const newMsg = mapRow(payload.new);
      if (newMsg.instagramSenderId === selectedSenderId) {
        setMessages((prev) => [...prev, newMsg]);
      }
      if (newMsg.direction === "incoming") {
        audioRef.current?.play().catch(() => {
        });
      }
      fetchContacts();
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "instagram_messages" }, (payload) => {
      const updated = mapRow(payload.new);
      setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSenderId, fetchContacts]);
  const sendMessage = useCallback(async (senderId, leadName, leadId, text) => {
    const { data, error } = await supabase.functions.invoke("send-instagram", {
      body: { recipientId: senderId, leadName, leadId, messageBody: text }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);
  const retryMessage = useCallback(async (message) => {
    await supabase.from("instagram_messages").delete().eq("id", message.id);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    const { data, error } = await supabase.functions.invoke("send-instagram", {
      body: {
        recipientId: message.instagramSenderId,
        leadName: message.leadName,
        leadId: message.leadId,
        messageBody: message.messageBody
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);
  const toggleBotEnabled = useCallback(async (senderId, currentEnabled) => {
    const newValue = !currentEnabled;
    await supabase.from("instagram_bot_state").update({ bot_enabled: newValue, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("instagram_sender_id", senderId);
    setContacts((prev) => prev.map(
      (c) => c.instagramSenderId === senderId ? { ...c, botEnabled: newValue } : c
    ));
  }, []);
  const toggleStar = useCallback(async (messageId, currentStarred) => {
    await supabase.from("instagram_messages").update({ starred: !currentStarred }).eq("id", messageId);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, starred: !currentStarred } : m));
  }, []);
  return {
    contacts,
    messages,
    selectedSenderId,
    loading,
    messagesLoading,
    selectContact,
    sendMessage,
    retryMessage,
    toggleBotEnabled,
    toggleStar,
    fetchContacts
  };
}
export {
  useInstagramChat
};
