import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, CheckCircle, AlertCircle, Clock, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WhatsAppMessage {
  id: string;
  lead_phone: string;
  lead_name: string;
  template_name: string;
  template_type: string;
  status: string;
  meta_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

interface WhatsAppLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  sent: { icon: Clock, color: 'text-muted-foreground', label: 'Sent' },
  delivered: { icon: CheckCircle, color: 'text-primary', label: 'Delivered' },
  read: { icon: Eye, color: 'text-success', label: 'Read' },
  failed: { icon: AlertCircle, color: 'text-destructive', label: 'Failed' },
  received: { icon: MessageCircle, color: 'text-chart-4', label: 'Received' },
};

const TYPE_COLORS: Record<string, string> = {
  confirmation: 'bg-success/15 text-success border-success/30',
  reminder: 'bg-primary/15 text-primary border-primary/30',
  promo: 'bg-accent/15 text-accent-foreground border-accent/30',
  incoming: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
};

export function WhatsAppLogDialog({ open, onOpenChange }: WhatsAppLogDialogProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setMessages((data as WhatsAppMessage[]) || []);
        setLoading(false);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MessageCircle className="h-4.5 w-4.5 text-success" />
            WhatsApp Message Log
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No messages sent yet</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Send a template from a lead's detail view</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-2">
              {messages.map((msg) => {
                const cfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.sent;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{msg.lead_name}</p>
                        <p className="text-[11px] text-muted-foreground">{msg.lead_phone}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${TYPE_COLORS[msg.template_type] || 'border-border text-muted-foreground'}`}>
                        {msg.template_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{msg.template_name}</span>
                    </div>

                    {msg.error_message && (
                      <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1">{msg.error_message}</p>
                    )}

                    <p className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
