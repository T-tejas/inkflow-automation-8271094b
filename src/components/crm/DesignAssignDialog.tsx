import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useDesignTasks, type DesignType, type FeeStatus } from '@/hooks/useDesignTasks';
import { useArtists } from '@/hooks/useArtists';
import { ArtistManagerDialog } from './ArtistManagerDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette } from 'lucide-react';

interface DesignAssignDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDesignAssigned: (leadId: string) => void;
}

export function DesignAssignDialog({ lead, open, onOpenChange, onDesignAssigned }: DesignAssignDialogProps) {
  const { addTask } = useDesignTasks();
  const { artistNames: existingArtists, addArtist } = useArtists();
  const [submitting, setSubmitting] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [designType, setDesignType] = useState<DesignType>('paid');
  const [designFee, setDesignFee] = useState('500');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [tattooDate, setTattooDate] = useState('');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [manageArtistsOpen, setManageArtistsOpen] = useState(false);

  if (!lead) return null;

  const resolvedArtist = artistName === '__custom__' ? customArtist : artistName;

  // Build comprehensive notes from lead data
  const buildNotes = () => {
    const parts: string[] = [];
    if (lead.tattooStyle && lead.tattooStyle !== 'Other') parts.push(`Style: ${lead.tattooStyle}`);
    if (lead.size) parts.push(`Size: ${lead.size}`);
    if (lead.placement) parts.push(`Placement: ${lead.placement}`);
    if (lead.budget) parts.push(`Budget: ${lead.budget}`);
    if (lead.notes) parts.push(`Lead Notes: ${lead.notes}`);
    if (referenceNotes.trim()) parts.push(`Reference: ${referenceNotes.trim()}`);
    return parts.join(' | ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedArtist.trim()) return;
    setSubmitting(true);
    // Auto-save custom artist
    if (artistName === '__custom__' && customArtist.trim()) {
      await addArtist(customArtist.trim());
    }

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
      final_tattoo_date: tattooDate || lead.preferredDate || null,
      design_status: 'Pending',
      notes: buildNotes(),
    });

    // Create CRM notification for design assignment
    if (success) {
      const notifBody = [
        `Artist: ${resolvedArtist.trim()}`,
        `Design Deadline: ${dueDate}`,
        tattooDate ? `Tattoo Date: ${tattooDate}` : null,
        lead.placement ? `Placement: ${lead.placement}` : null,
        lead.size ? `Size: ${lead.size}` : null,
        lead.budget ? `Budget: ${lead.budget}` : null,
        lead.notes ? `Notes: ${lead.notes}` : null,
      ].filter(Boolean).join(' | ');

      await supabase.from('crm_notifications').insert({
        lead_id: lead.id,
        lead_name: lead.fullName,
        lead_phone: lead.phone,
        notification_type: 'design_assigned',
        tattoo_idea: lead.tattooStyle || null,
        placement: lead.placement || null,
        size: lead.size || null,
        budget: lead.budget || null,
        chat_summary: notifBody,
        timeline: dueDate,
      } as any);
    }

    setSubmitting(false);
    if (success) {
      onDesignAssigned(lead.id);
      onOpenChange(false);
      setArtistName('');
      setCustomArtist('');
      setDesignType('paid');
      setDesignFee('500');
      setDueDate('');
      setTattooDate('');
      setReferenceNotes('');
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-500" />
            Assign Design
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Auto-filled client details */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Auto-filled from Lead</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Client Name</Label>
                <Input value={lead.fullName} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input value={lead.phone} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Style</Label>
                <Input value={lead.tattooStyle || '—'} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Size</Label>
                <Input value={lead.size || '—'} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Budget</Label>
                <Input value={lead.budget || '—'} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
            </div>
            {lead.placement && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Placement</Label>
                <Input value={lead.placement} readOnly className="bg-muted/30 text-xs h-7 cursor-default" tabIndex={-1} />
              </div>
            )}
            {lead.notes && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Lead Notes</Label>
                <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 border border-border/50">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Required user inputs */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Assign Artist *</Label>
              <Select value={artistName} onValueChange={v => {
                if (v === '__manage__') { setManageArtistsOpen(true); return; }
                setArtistName(v);
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent>
                  {existingArtists.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Artist</SelectItem>
                  <SelectItem value="__manage__">⚙ Manage Artists</SelectItem>
                </SelectContent>
              </Select>
              {artistName === '__custom__' && (
                <Input
                  placeholder="Enter artist name"
                  value={customArtist}
                  onChange={e => setCustomArtist(e.target.value)}
                  className="mt-1.5 h-8 text-xs"
                  autoFocus
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
                <Input
                  type="date"
                  value={tattooDate || (lead.preferredDate ? lead.preferredDate : '')}
                  onChange={e => setTattooDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Reference Notes</Label>
              <Textarea
                value={referenceNotes}
                onChange={e => setReferenceNotes(e.target.value)}
                placeholder="Additional design references or instructions..."
                rows={2}
                className="text-xs"
              />
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
    <ArtistManagerDialog open={manageArtistsOpen} onOpenChange={setManageArtistsOpen} />
    </>
  );
}
