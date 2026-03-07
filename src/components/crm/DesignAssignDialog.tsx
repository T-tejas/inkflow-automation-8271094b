import { useState } from 'react';
import { Lead } from '@/types/lead';
import { useDesignTasks, type DesignType, type FeeStatus } from '@/hooks/useDesignTasks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette } from 'lucide-react';

interface DesignAssignDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDesignAssigned: (leadId: string) => void;
  existingArtists: string[];
}

export function DesignAssignDialog({ lead, open, onOpenChange, onDesignAssigned, existingArtists }: DesignAssignDialogProps) {
  const { addTask } = useDesignTasks();
  const [submitting, setSubmitting] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [designType, setDesignType] = useState<DesignType>('paid');
  const [designFee, setDesignFee] = useState('500');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [tattooDate, setTattooDate] = useState('');

  if (!lead) return null;

  const resolvedArtist = artistName === '__custom__' ? customArtist : artistName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedArtist.trim()) return;
    setSubmitting(true);

    const success = await addTask({
      lead_id: lead.id,
      client_name: lead.fullName,
      client_phone: lead.phone,
      artist_name: resolvedArtist.trim(),
      design_type: designType,
      design_fee: Number(designFee) || 0,
      fee_status: 'pending' as FeeStatus,
      design_start_date: startDate,
      design_due_date: dueDate,
      final_tattoo_date: tattooDate || null,
      design_status: 'Pending',
      notes: `Auto-assigned from CRM lead. Style: ${lead.tattooStyle}`,
    });

    setSubmitting(false);
    if (success) {
      onDesignAssigned(lead.id);
      onOpenChange(false);
      // Reset form
      setArtistName('');
      setCustomArtist('');
      setDesignType('paid');
      setDesignFee('500');
      setDueDate('');
      setTattooDate('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-500" />
            Assign Design
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-filled read-only fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Client Name</Label>
              <Input value={lead.fullName} readOnly className="bg-muted/30 text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input value={lead.phone} readOnly className="bg-muted/30 text-xs h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tattoo Style</Label>
              <Input value={lead.tattooStyle} readOnly className="bg-muted/30 text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Est. Price</Label>
              <Input value={lead.budget || '—'} readOnly className="bg-muted/30 text-xs h-8" />
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <Label className="text-xs text-muted-foreground">Assign Artist *</Label>
            <Select value={artistName} onValueChange={setArtistName}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select artist" />
              </SelectTrigger>
              <SelectContent>
                {existingArtists.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
                <SelectItem value="__custom__">+ New Artist</SelectItem>
              </SelectContent>
            </Select>
            {artistName === '__custom__' && (
              <Input
                placeholder="Enter artist name"
                value={customArtist}
                onChange={e => setCustomArtist(e.target.value)}
                className="mt-1.5 h-8 text-xs"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Design Type</Label>
              <Select value={designType} onValueChange={v => setDesignType(v as DesignType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">💰 Paid Design</SelectItem>
                  <SelectItem value="free">🎁 Free Design</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Design Fee (₹)</Label>
              <Input
                type="number"
                value={designFee}
                onChange={e => setDesignFee(e.target.value)}
                className="h-8 text-xs"
                disabled={designType === 'free'}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-xs" required />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tattoo Date</Label>
              <Input type="date" value={tattooDate} onChange={e => setTattooDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting || !resolvedArtist.trim() || !dueDate} className="gap-1.5">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Palette className="h-3.5 w-3.5" />}
              Assign Design
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
