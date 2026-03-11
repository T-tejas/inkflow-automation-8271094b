import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lead, LEAD_STATUSES } from '@/types/lead';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Phone, Calendar, MapPin, DollarSign, MessageCircle, Pencil, Trash2, Send, CheckCircle, AlertCircle, Loader2, Palette, Award } from 'lucide-react';
import type { LeadStatus } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadNotesTimeline } from './LeadNotesTimeline';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onAssignDesign?: (lead: Lead) => void;
}

type TemplateType = 'confirmation' | 'reminder' | 'promo';

export function LeadDetailDialog({ lead, open, onOpenChange, onStatusChange, onEdit, onDelete, onAssignDesign }: LeadDetailDialogProps) {
  const navigate = useNavigate();
  const [sending, setSending] = useState<TemplateType | null>(null);
  const [lastSent, setLastSent] = useState<TemplateType | null>(null);

  if (!lead) return null;

  const sendWhatsApp = async (templateType: TemplateType) => {
    if (!lead.whatsappOptIn) {
      toast.error('This lead has not opted in to WhatsApp messages');
      return;
    }

    setSending(templateType);
    setLastSent(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: lead.phone,
          leadName: lead.fullName,
          templateType,
          parameters: [lead.fullName],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastSent(templateType);
      toast.success(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template sent to ${lead.fullName}`);
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(null);
    }
  };

  const whatsappTemplates: { type: TemplateType; label: string; description: string }[] = [
    { type: 'confirmation', label: 'Booking Confirmation', description: 'Confirm their appointment' },
    { type: 'reminder', label: 'Appointment Reminder', description: '48h before session' },
    { type: 'promo', label: 'Promo Offer', description: 'Re-engagement or special deal' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            {lead.fullName}
            {lead.whatsappOptIn && <MessageCircle className="h-4 w-4 text-success" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={lead.status} onValueChange={v => onStatusChange(lead.id, v as LeadStatus)}>
              <SelectTrigger className="w-full bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Calendar} label="Preferred Date" value={lead.preferredDate ? new Date(lead.preferredDate).toLocaleDateString('en-IN') : '—'} />
            <InfoRow icon={MapPin} label="Placement" value={lead.placement || '—'} />
            <InfoRow icon={DollarSign} label="Budget" value={lead.budget || '—'} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">{lead.tattooStyle}</Badge>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">{lead.size}</Badge>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">{lead.source}</Badge>
          </div>

          {lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
              ))}
            </div>
          )}

          {/* Structured Notes Timeline */}
          <LeadNotesTimeline leadId={lead.id} />

          {/* WhatsApp Templates Section */}
          {lead.whatsappOptIn && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MessageCircle className="h-3.5 w-3.5 text-success" />
                Send WhatsApp Template
              </div>
              <div className="space-y-1.5">
                {whatsappTemplates.map(tpl => (
                  <button
                    key={tpl.type}
                    onClick={() => sendWhatsApp(tpl.type)}
                    disabled={sending !== null}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 border border-border/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{tpl.label}</p>
                      <p className="text-[10px] text-muted-foreground">{tpl.description}</p>
                    </div>
                    <div className="flex items-center">
                      {sending === tpl.type ? (
                        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                      ) : lastSent === tpl.type ? (
                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Send className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => { onDelete(lead.id); onOpenChange(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                onOpenChange(false);
                if (onAssignDesign) {
                  onAssignDesign(lead);
                } else {
                  navigate(`/designs?leadId=${lead.id}&name=${encodeURIComponent(lead.fullName)}&phone=${encodeURIComponent(lead.phone)}`);
                }
              }}>
                <Palette className="h-3.5 w-3.5" /> Design Task
              </Button>
            </div>
            <Button size="sm" onClick={() => { onEdit(lead); onOpenChange(false); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-foreground text-xs font-medium">{value}</p>
    </div>
  );
}
