import { Lead, LEAD_STATUSES, STATUS_COLORS, STATUS_TEXT_COLORS, AUTOMATION_TAGS } from '@/types/lead';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Phone, Calendar, MapPin, DollarSign, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import type { LeadStatus } from '@/types/lead';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange, onStatusChange, onEdit, onDelete }: LeadDetailDialogProps) {
  if (!lead) return null;

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

          {lead.notes && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              {lead.notes}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="destructive" size="sm" onClick={() => { onDelete(lead.id); onOpenChange(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
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
