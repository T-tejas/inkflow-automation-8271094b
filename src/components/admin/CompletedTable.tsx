import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

function exportCSV(leads: Lead[]) {
  const headers = ['Client', 'Phone', 'Style', 'Price', 'Date', 'Status'];
  const rows = leads.map((l) => [
    l.fullName,
    l.phone,
    l.tattooStyle,
    parseBudget(l.budget).toString(),
    format(parseISO(l.createdAt), 'dd MMM yyyy'),
    'Paid'
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `completed-tattoos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CompletedTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Completed Tattoos</h3>
        {leads.length > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 h-7 text-xs" onClick={() => exportCSV(leads)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>
      {leads.length === 0 ? (
        <p className="text-xs text-muted-foreground p-8 text-center">No completed tattoos found</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs">Client</TableHead>
              <TableHead className="text-muted-foreground text-xs">Phone</TableHead>
              <TableHead className="text-muted-foreground text-xs">Style</TableHead>
              <TableHead className="text-muted-foreground text-xs text-right">Price</TableHead>
              <TableHead className="text-muted-foreground text-xs">Date</TableHead>
              <TableHead className="text-muted-foreground text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} className="border-border hover:bg-muted/30">
                <TableCell className="text-sm text-foreground font-medium">{l.fullName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.tattooStyle}</TableCell>
                <TableCell className="text-sm text-success text-right font-mono">
                  ₹{new Intl.NumberFormat('en-IN').format(parseBudget(l.budget))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(parseISO(l.createdAt), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                    Paid
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
