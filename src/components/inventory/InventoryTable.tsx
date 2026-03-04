import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Minus, Info, Search } from 'lucide-react';
import { InventoryItem, NEEDLE_TYPES } from '@/hooks/useInventory';
import { InventoryFormDialog } from './InventoryFormDialog';
import { DeductDialog } from './DeductDialog';

interface Props {
  items: InventoryItem[];
  category: string;
  onUpdate: (id: string, updates: Partial<InventoryItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDeduct: (itemId: string, qty: number, leadId?: string, notes?: string) => Promise<boolean>;
}

export function InventoryTable({ items, category, onUpdate, onDelete, onDeduct }: Props) {
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deductItem, setDeductItem] = useState<InventoryItem | null>(null);
  const isNeedles = category === 'Needles';

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.grouping || '').toLowerCase().includes(search.toLowerCase())
  );

  const getNeedleTooltip = (type: string | null) => {
    const info = NEEDLE_TYPES.find(n => n.value === type);
    return info ? `${info.label} – ${info.desc}` : '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Item</TableHead>
              {isNeedles && <TableHead>Type</TableHead>}
              {isNeedles && <TableHead>Gauge</TableHead>}
              {isNeedles && <TableHead>Grouping</TableHead>}
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Min</TableHead>
              <TableHead className="text-right">Cost/Unit</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(item => {
              const isLow = item.quantity_in_stock <= item.minimum_required;
              return (
                <TableRow key={item.id} className={isLow ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  {isNeedles && (
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            <Badge variant="outline" className="text-xs">{item.needle_type}</Badge>
                            <Info className="h-3 w-3 text-muted" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">
                          {getNeedleTooltip(item.needle_type)}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  )}
                  {isNeedles && <TableCell className="text-xs text-muted-foreground">{item.gauge || '–'}</TableCell>}
                  {isNeedles && <TableCell><Badge variant="secondary" className="text-xs">{item.grouping || '–'}</Badge></TableCell>}
                  <TableCell className="text-center font-mono">{item.quantity_in_stock}</TableCell>
                  <TableCell className="text-center text-muted-foreground font-mono">{item.minimum_required}</TableCell>
                  <TableCell className="text-right font-mono">₹{Number(item.cost_per_unit).toFixed(0)}</TableCell>
                  <TableCell className="text-right font-mono">₹{(item.quantity_in_stock * item.cost_per_unit).toFixed(0)}</TableCell>
                  <TableCell className="text-center">
                    {isLow ? (
                      <Badge variant="destructive" className="text-[10px]">LOW</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-success text-success-foreground">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isNeedles && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeductItem(item)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(item)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isNeedles ? 10 : 7} className="text-center py-8 text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editItem && (
        <InventoryFormDialog
          open={!!editItem}
          onOpenChange={o => !o && setEditItem(null)}
          editItem={editItem}
          onSubmit={async data => {
            const ok = await onUpdate(editItem.id, data);
            if (ok) setEditItem(null);
            return ok;
          }}
        />
      )}

      {deductItem && (
        <DeductDialog
          open={!!deductItem}
          onOpenChange={o => !o && setDeductItem(null)}
          item={deductItem}
          onDeduct={async (qty, notes) => {
            const ok = await onDeduct(deductItem.id, qty, undefined, notes);
            if (ok) setDeductItem(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}
