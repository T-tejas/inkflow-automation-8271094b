import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DesignTask, DesignType, FeeStatus, DesignStatus } from '@/hooks/useDesignTasks';
import { DESIGN_STATUSES } from '@/hooks/useDesignTasks';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<boolean>;
  editTask?: DesignTask | null;
  defaultClientName?: string;
  defaultClientPhone?: string;
  defaultLeadId?: string;
}

export function DesignTaskFormDialog({ open, onOpenChange, onSubmit, editTask, defaultClientName, defaultClientPhone, defaultLeadId }: Props) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [artistName, setArtistName] = useState('');
  const [designType, setDesignType] = useState<DesignType>('paid');
  const [designFee, setDesignFee] = useState('0');
  const [feeStatus, setFeeStatus] = useState<FeeStatus>('pending');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [tattooDate, setTattooDate] = useState('');
  const [designStatus, setDesignStatus] = useState<DesignStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editTask) {
      setClientName(editTask.client_name);
      setClientPhone(editTask.client_phone);
      setArtistName(editTask.artist_name);
      setDesignType(editTask.design_type);
      setDesignFee(String(editTask.design_fee));
      setFeeStatus(editTask.fee_status);
      setStartDate(editTask.design_start_date);
      setDueDate(editTask.design_due_date);
      setTattooDate(editTask.final_tattoo_date || '');
      setDesignStatus(editTask.design_status);
      setNotes(editTask.notes || '');
    } else {
      setClientName(defaultClientName || '');
      setClientPhone(defaultClientPhone || '');
      setArtistName('');
      setDesignType('paid');
      setDesignFee('0');
      setFeeStatus('pending');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setTattooDate('');
      setDesignStatus('Pending');
      setNotes('');
    }
  }, [editTask, open, defaultClientName, defaultClientPhone]);

  const handleSubmit = async () => {
    if (!clientName || !clientPhone || !artistName || !dueDate) return;
    setSubmitting(true);
    const payload = {
      client_name: clientName,
      client_phone: clientPhone,
      artist_name: artistName,
      design_type: designType,
      design_fee: parseFloat(designFee) || 0,
      fee_status: designType === 'free' ? 'paid' as FeeStatus : feeStatus,
      design_start_date: startDate,
      design_due_date: dueDate,
      final_tattoo_date: tattooDate || null,
      design_status: designStatus,
      notes: notes || null,
      lead_id: defaultLeadId || editTask?.lead_id || null,
    };
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{editTask ? 'Edit Design Task' : 'New Design Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Name *</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+91..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tattoo Artist *</Label>
            <Input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Artist name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Design Type</Label>
              <Select value={designType} onValueChange={v => setDesignType(v as DesignType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">💰 Paid Design</SelectItem>
                  <SelectItem value="free">🎁 Free Design</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {designType === 'paid' && (
              <div>
                <Label className="text-xs">Design Fee (₹)</Label>
                <Input type="number" value={designFee} onChange={e => setDesignFee(e.target.value)} />
              </div>
            )}
          </div>
          {designType === 'paid' && (
            <div>
              <Label className="text-xs">Payment Status</Label>
              <Select value={feeStatus} onValueChange={v => setFeeStatus(v as FeeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="paid">✅ Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Due Date *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tattoo Date</Label>
              <Input type="date" value={tattooDate} onChange={e => setTattooDate(e.target.value)} />
            </div>
          </div>
          {editTask && (
            <div>
              <Label className="text-xs">Design Status</Label>
              <Select value={designStatus} onValueChange={v => setDesignStatus(v as DesignStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Design notes..." />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !clientName || !artistName || !dueDate} className="w-full">
            {submitting ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
