import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO } from 'date-fns';

export function CompletedTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-[#222]">
        <h3 className="text-sm font-medium text-neutral-300">Completed Tattoos</h3>
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
