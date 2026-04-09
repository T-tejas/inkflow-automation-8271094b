import { useState } from 'react';
import { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserPlus } from 'lucide-react';
import { TATTOO_STYLES, TATTOO_SIZES } from '@/types/lead';
import { useArtists } from '@/hooks/useArtists';

interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
}

export function WalkInDialog({ open, onOpenChange, onSubmit }: WalkInDialogProps) {
  const { artistNames: artists } = useArtists();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tattooIdea, setTattooIdea] = useState('');
  const [placement, setPlacement] = useState('');
  const [budget, setBudget] = useState('');
  const [artist, setArtist] = useState('');
  const [tattooStyle, setTattooStyle] = useState('Other');
  const [size, setSize] = useState('Medium (4-6 in)');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit({
      fullName: name.trim(),
      phone: phone.trim(),
      source: 'Walk-in',
      whatsappOptIn: true,
      tattooStyle: tattooStyle as any,
      size: size as any,
      placement: placement.trim(),
      budget: budget.trim(),
      preferredDate: appointmentDate,
      status: 'New Lead',
      tags: [],
      notes: `Walk-in client. Tattoo idea: ${tattooIdea}. Artist: ${artist}`,
      nextFollowupDate: null,
      lastContactedAt: null,
    });
    if (ok) {
      setName(''); setPhone(''); setTattooIdea(''); setPlacement(''); setBudget(''); setArtist(''); setAppointmentDate('');
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="h-5 w-5" /> New Walk-in Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Client name" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tattoo Idea</Label>
            <Textarea value={tattooIdea} onChange={e => setTattooIdea(e.target.value)} placeholder="What tattoo does the client want?" className="text-xs min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <Select value={tattooStyle} onValueChange={setTattooStyle}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TATTOO_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TATTOO_SIZES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Placement</Label>
              <Input value={placement} onChange={e => setPlacement(e.target.value)} placeholder="e.g. Forearm" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Budget (₹)</Label>
              <Input value={budget} onChange={e => setBudget(e.target.value)} placeholder="5000" className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Artist</Label>
              <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name" list="walkin-artists" className="h-8 text-xs" />
              {artists.length > 0 && (
                <datalist id="walkin-artists">
                  {artists.map(a => <option key={a} value={a} />)}
                </datalist>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Appointment Date</Label>
              <Input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Button className="w-full gap-1.5" onClick={handleSubmit} disabled={submitting || !name.trim() || !phone.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Walk-in Client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
