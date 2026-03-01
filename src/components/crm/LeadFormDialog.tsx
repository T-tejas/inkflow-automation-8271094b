import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Lead, LeadSource, TattooStyle, TattooSize, LeadStatus,
  LEAD_SOURCES, TATTOO_STYLES, TATTOO_SIZES, LEAD_STATUSES, AUTOMATION_TAGS, AutomationTag,
} from '@/types/lead';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editLead?: Lead | null;
}

export function LeadFormDialog({ open, onOpenChange, onSubmit, editLead }: LeadFormDialogProps) {
  const [form, setForm] = useState({
    fullName: editLead?.fullName ?? '',
    phone: editLead?.phone ?? '+91 ',
    source: editLead?.source ?? ('Instagram' as LeadSource),
    whatsappOptIn: editLead?.whatsappOptIn ?? true,
    tattooStyle: editLead?.tattooStyle ?? ('Minimalist' as TattooStyle),
    size: editLead?.size ?? ('Small (2-4 in)' as TattooSize),
    placement: editLead?.placement ?? '',
    budget: editLead?.budget ?? '',
    preferredDate: editLead?.preferredDate ?? '',
    status: editLead?.status ?? ('New Lead' as LeadStatus),
    tags: editLead?.tags ?? ([] as AutomationTag[]),
    notes: editLead?.notes ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  const toggleTag = (tag: AutomationTag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{editLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required placeholder="Full Name" className="bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone (+91)</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="+91 98765 43210" className="bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v as LeadSource }))}>
                <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tattoo Style</Label>
              <Select value={form.tattooStyle} onValueChange={v => setForm(f => ({ ...f, tattooStyle: v as TattooStyle }))}>
                <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{TATTOO_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v as TattooSize }))}>
                <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{TATTOO_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Placement</Label>
              <Input value={form.placement} onChange={e => setForm(f => ({ ...f, placement: e.target.value }))} placeholder="e.g. Forearm" className="bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Budget</Label>
              <Input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="₹5,000 - ₹10,000" className="bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Preferred Date</Label>
              <Input type="date" value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} className="bg-muted/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.whatsappOptIn} onCheckedChange={v => setForm(f => ({ ...f, whatsappOptIn: v }))} />
            <Label className="text-xs text-muted-foreground">WhatsApp Opt-in</Label>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Automation Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {AUTOMATION_TAGS.map(tag => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    form.tags.includes(tag)
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} className="bg-muted/50 border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editLead ? 'Update' : 'Add Lead'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
