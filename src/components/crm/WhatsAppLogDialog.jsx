import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Check, CheckCheck, AlertCircle, Clock, ArrowDownLeft } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
function StatusTicks({ status }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-[hsl(var(--wa-read))]" />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60" />;
    case "sent":
      return <Check className="h-3.5 w-3.5 text-muted-foreground/60" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    case "received":
      return <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground/60" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />;
  }
}
const TEMPLATE_LABELS = {
  confirmation: "\u{1F4CB} Booking Confirmation",
  reminder: "\u23F0 Appointment Reminder",
  promo: "\u{1F389} Promo Offer",
  incoming: "\u{1F4AC} Incoming Message"
};
function formatMessageTime(dateStr) {
  const d = new Date(dateStr);
  return format(d, "h:mm a");
}
function formatDateHeader(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yyyy");
}
function groupMessagesByDate(messages) {
  const groups = [];
  const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (const msg of sorted) {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
  }
  return groups;
}
function WhatsAppLogDialog({ open, onOpenChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase.from("whatsapp_messages").select("*").order("created_at", { ascending: false }).limit(50);
        if (error) console.error("WhatsApp log fetch error:", error);
        setMessages(data || []);
      } catch (err) {
        console.error("WhatsApp log error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [open]);
  const groups = groupMessagesByDate(messages);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-border overflow-hidden max-h-[85vh] flex flex-col bg-[hsl(var(--wa-bg))]">
        <DialogDescription className="sr-only">WhatsApp message history</DialogDescription>
        {
    /* WhatsApp-style header */
  }
        <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--wa-header))] border-b border-border/40">
          <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">WhatsApp Messages</h3>
            <p className="text-[11px] text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {
    /* Chat area */
  }
        {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div> : messages.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-success/40" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Send a template from a lead's detail view</p>
          </div> : <ScrollArea className="flex-1">
            <div className="px-3 py-2 space-y-1">
              {groups.map((group) => <div key={group.date}>
                  {
    /* Date pill */
  }
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 backdrop-blur-sm rounded-md px-3 py-1">
                      {formatDateHeader(group.messages[0].created_at)}
                    </span>
                  </div>

                  {group.messages.map((msg) => {
    const isIncoming = msg.template_type === "incoming";
    return <div
      key={msg.id}
      className={`flex mb-1 ${isIncoming ? "justify-start" : "justify-end"}`}
    >
                        <div
      className={`relative max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${isIncoming ? "bg-card border border-border/50 rounded-tl-none" : "bg-[hsl(var(--wa-outgoing))] rounded-tr-none"}`}
    >
                          {
      /* Contact name for incoming */
    }
                          {isIncoming && <p className="text-[11px] font-semibold text-success mb-0.5">
                              {msg.lead_name}
                            </p>}

                          {
      /* Outgoing: show recipient */
    }
                          {!isIncoming && <p className="text-[11px] font-medium text-foreground/70 mb-0.5">
                              To: {msg.lead_name}
                            </p>}

                          {
      /* Template label */
    }
                          <p className="text-xs text-foreground">
                            {TEMPLATE_LABELS[msg.template_type] || msg.template_name}
                          </p>

                          {
      /* Template name detail */
    }
                          {!isIncoming && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {msg.template_name}
                            </p>}

                          {
      /* Error message */
    }
                          {msg.error_message && <p className="text-[10px] text-destructive mt-1 leading-snug">
                              ⚠️ {msg.error_message}
                            </p>}

                          {
      /* Time + status ticks */
    }
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {!isIncoming && <StatusTicks status={msg.status} />}
                          </div>
                        </div>
                      </div>;
  })}
                </div>)}
            </div>
          </ScrollArea>}
      </DialogContent>
    </Dialog>;
}
export {
  WhatsAppLogDialog
};
