import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

function exportCSV(leads: Lead[]) {
  const headers = ['Client', 'Phone', 'Style', 'Price', 'Date', 'Status'];
  const rows = leads.map(l => [
    l.fullName,
    l.phone,
    l.tattooStyle,
    parseBudget(l.budget).toString(),
    format(parseISO(l.createdAt), 'dd MMM yyyy'),
    'Paid',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
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
    <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Completed Tattoos</h3>
        {leads.length > 0 && (
          <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-1.5 h-7 text-xs" onClick={() => exportCSV(leads)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>
      {leads.length === 0 ? (
        <p className="text-xs text-neutral-500 p-8 text-center">No completed tattoos found</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[#222] hover:bg-transparent">
              <TableHead className="text-neutral-500 text-xs">Client</TableHead>
              <TableHead className="text-neutral-500 text-xs">Phone</TableHead>
              <TableHead className="text-neutral-500 text-xs">Style</TableHead>
              <TableHead className="text-neutral-500 text-xs text-right">Price</TableHead>
              <TableHead className="text-neutral-500 text-xs">Date</TableHead>
              <TableHead className="text-neutral-500 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(l => (
              <TableRow key={l.id} className="border-[#222] hover:bg-[#1a1a1a]">
                <TableCell className="text-sm text-neutral-200 font-medium">{l.fullName}</TableCell>
                <TableCell className="text-sm text-neutral-400">{l.phone}</TableCell>
                <TableCell className="text-sm text-neutral-400">{l.tattooStyle}</TableCell>
                <TableCell className="text-sm text-emerald-400 text-right font-mono">
                  ₹{new Intl.NumberFormat('en-IN').format(parseBudget(l.budget))}
                </TableCell>
                <TableCell className="text-sm text-neutral-400">
                  {format(parseISO(l.createdAt), 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
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
