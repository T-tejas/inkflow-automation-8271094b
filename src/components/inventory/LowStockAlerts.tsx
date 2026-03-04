import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';

interface Props {
  items: InventoryItem[];
}

export function LowStockAlerts({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Low Stock Alerts ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item.id} variant="destructive" className="text-xs gap-1">
              {item.item_name}: {item.quantity_in_stock}/{item.minimum_required}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
