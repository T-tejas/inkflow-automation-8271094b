import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InventoryItem } from '@/hooks/useInventory';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: InventoryItem;
  onDeduct: (qty: number, notes?: string) => Promise<boolean>;
}

export function DeductDialog({ open, onOpenChange, item, onDeduct }: Props) {
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const q = parseInt(qty);
    if (!q || q < 1) return;
    setSubmitting(true);
    await onDeduct(q, notes || undefined);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Deduct Needle Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>{item.item_name}</strong> — Current stock: <strong>{item.quantity_in_stock}</strong>
          </p>
          <div>
            <Label>Quantity to deduct</Label>
            <Input type="number" min="1" max={item.quantity_in_stock} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Used for client session" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || parseInt(qty) < 1}>
            {submitting ? 'Deducting...' : `Deduct ${qty} unit(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
