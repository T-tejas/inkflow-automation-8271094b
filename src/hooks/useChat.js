import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
function mapRow(row) {
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
    fileName: row.file_name || null
  };
}
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2XjHVjWGJ0hZSdmpKCcGFfbX+QnZuUh3ZoYWp6i5iamZOGdmhlanqLmJqZk4Z2aA==";
function phoneKey(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10) || digits;
}
function phoneVariants(phone) {
  const raw = String(phone || "").trim();
  const compact = raw.replace(/[\s\-\(\)]/g, "");
  const digits = compact.replace(/^\+/, "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return Array.from(new Set([
    raw,
    compact,
    compact.replace(/^\+/, ""),
    digits,
    digits ? `+${digits}` : "",
    last10 ? `+91${last10}` : "",
    last10 ? `+91 ${last10}` : ""
  ].filter(Boolean)));
}
function useChat() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const audioRef = useRef(null);
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);
  const fetchContacts = useCallback(async () => {
    const { data: leads } = await supabase.from("leads").select("id, full_name, phone, status, whatsapp_opt_in, bot_enabled").order("updated_at", { ascending: false });
    if (!leads) {
      setLoading(false);
      return;
    }
    const { data: allMessages } = await supabase.from("whatsapp_messages").select("lead_phone, message_body, template_name, template_type, status, created_at, read_at, message_type").order("created_at", { ascending: false });
    const msgMap = /* @__PURE__ */ new Map();
    if (allMessages) {
      for (const m of allMessages) {
        const phone = phoneKey(m.lead_phone);
        if (!msgMap.has(phone)) {
          let lastMsg = m.message_body || m.template_name;
          if (m.message_type && m.message_type !== "text" && !m.message_body) {
            const typeMap = { image: "\u{1F4F7} Photo", video: "\u{1F3A5} Video", audio: "\u{1F3B5} Audio", document: "\u{1F4C4} Document", sticker: "\u{1F3F7}\uFE0F Sticker" };
            lastMsg = typeMap[m.message_type] || m.template_name;
          }
          msgMap.set(phone, {
            lastMsg,
            lastTime: m.created_at,
            unread: 0
          });
        }
        if ((m.status === "received" || m.template_type === "incoming") && !m.read_at) {
          const entry = msgMap.get(phone);
          entry.unread++;
        }
      }
    }
    const contactList = leads.map((l) => {
      const info = msgMap.get(phoneKey(l.phone));
      return {
        leadId: l.id,
        leadName: l.full_name,
        leadPhone: l.phone,
        leadStatus: l.status,
        lastMessage: info?.lastMsg || null,
        lastMessageTime: info?.lastTime || null,
        unreadCount: info?.unread || 0,
        whatsappOptIn: l.whatsapp_opt_in,
        botEnabled: l.bot_enabled !== false
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
  const fetchMessages = useCallback(async (phone) => {
    setMessagesLoading(true);
    const { data } = await supabase.from("whatsapp_messages").select("*").in("lead_phone", phoneVariants(phone)).order("created_at", { ascending: true });
    setMessages(data ? data.map(mapRow) : []);
    setMessagesLoading(false);
  }, []);
  const markAsRead = useCallback(async (phone) => {
    await supabase.from("whatsapp_messages").update({ read_at: (/* @__PURE__ */ new Date()).toISOString() }).in("lead_phone", phoneVariants(phone)).in("template_type", ["incoming"]).is("read_at", null);
    setContacts((prev) => prev.map((c) => c.leadPhone === phone ? { ...c, unreadCount: 0 } : c));
  }, []);
  const selectContact = useCallback((phone) => {
    setSelectedPhone(phone);
    fetchMessages(phone);
    markAsRead(phone);
  }, [fetchMessages, markAsRead]);
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  useEffect(() => {
    const channel = supabase.channel("chat-messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
      const newMsg = mapRow(payload.new);
      if (phoneKey(newMsg.leadPhone) === phoneKey(selectedPhone)) {
        setMessages((prev) => [...prev, newMsg]);
      }
      if (newMsg.templateType === "incoming" || newMsg.status === "received") {
        audioRef.current?.play().catch(() => {
        });
      }
      fetchContacts();
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_messages" }, (payload) => {
      const updated = mapRow(payload.new);
      setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPhone, fetchContacts]);
  const sendTemplate = useCallback(async (phone, leadName, leadId, templateType, templateName, parameters) => {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone, leadName, templateType, templateName, parameters }
    });
    if (error) throw error;
    return data;
  }, []);
  const sendMessage = useCallback(async (phone, leadName, leadId, text) => {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone, leadName, type: "text", messageBody: text }
    });
    if (error) throw error;
    return data;
  }, []);
  const sendAttachment = useCallback(async (phone, leadName, leadId, url, fileName, isImage) => {
    const msgType = isImage ? "image" : fileName.endsWith(".pdf") ? "document" : "document";
    const { error } = await supabase.from("whatsapp_messages").insert({
      lead_phone: phone,
      lead_name: leadName,
      lead_id: leadId,
      template_name: "attachment",
      template_type: "confirmation",
      status: "sent",
      message_body: `[file]${url}`,
      message_type: msgType,
      media_url: url,
      file_name: fileName
    });
    if (error) throw error;
  }, []);
  const addNote = useCallback(async (phone, leadName, leadId, noteText) => {
    const { error } = await supabase.from("whatsapp_messages").insert({
      lead_phone: phone,
      lead_name: leadName,
      lead_id: leadId,
      template_name: "internal_note",
      template_type: "note",
      status: "note",
      message_body: noteText,
      is_internal_note: true,
      message_type: "text"
    });
    if (error) throw error;
  }, []);
  const toggleStar = useCallback(async (messageId, currentStarred) => {
    await supabase.from("whatsapp_messages").update({ starred: !currentStarred }).eq("id", messageId);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, starred: !currentStarred } : m));
  }, []);
  const updateLeadStatus = useCallback(async (leadId, newStatus, oldStatus) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) throw error;
    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      action_type: "status_change",
      old_value: oldStatus,
      new_value: newStatus
    });
    await fetchContacts();
  }, [fetchContacts]);
  const toggleBotEnabled = useCallback(async (leadId, currentBotEnabled) => {
    const newValue = !currentBotEnabled;
    const { error } = await supabase.from("leads").update({ bot_enabled: newValue }).eq("id", leadId);
    if (error) throw error;
    setContacts((prev) => prev.map((c) => c.leadId === leadId ? { ...c, botEnabled: newValue } : c));
    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      action_type: "bot_toggle",
      old_value: currentBotEnabled ? "enabled" : "disabled",
      new_value: newValue ? "enabled" : "disabled"
    });
  }, []);
  const retryMessage = useCallback(async (message) => {
    if (!message.messageBody) return;
    await supabase.from("whatsapp_messages").delete().eq("id", message.id);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        phone: message.leadPhone,
        leadName: message.leadName,
        type: "text",
        messageBody: message.messageBody
      }
    });
    if (error) throw error;
  }, []);
  const clearChat = useCallback(async (phone) => {
    const { error } = await supabase.from("whatsapp_messages").delete().in("lead_phone", phoneVariants(phone));
    if (error) throw error;
    setMessages([]);
    await fetchContacts();
  }, [fetchContacts]);
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
    clearChat
  };
}
export {
  useChat
};
