import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lead, parseBudget } from '@/types/lead';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReviewRequestDialog } from '@/components/reviews/ReviewRequestDialog';

type ReviewStatus = 'not_sent' | 'sent' | 'opened' | 'submitted';

const STATUS_META: Record<ReviewStatus, { label: string; cls: string }> = {
  not_sent: { label: 'Not Sent', cls: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', cls: 'bg-blue-500/10 text-blue-500' },
  opened: { label: 'Opened', cls: 'bg-amber-500/10 text-amber-500' },
  submitted: { label: 'Submitted', cls: 'bg-success/10 text-success' },
};

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
  const [reviewLead, setReviewLead] = useState<Lead | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, ReviewStatus>>({});

  useEffect(() => {
    if (leads.length === 0) return;
    const ids = leads.map((l) => l.id);
    supabase
      .from('reviews')
      .select('lead_id, status, opened_at, rating, review_sent_at')
      .in('lead_id', ids)
      .then(({ data }) => {
        const map: Record<string, ReviewStatus> = {};
        (data || []).forEach((r: any) => {
          let s: ReviewStatus = 'not_sent';
          if (r.rating) s = 'submitted';
          else if (r.opened_at) s = 'opened';
          else if (r.review_sent_at || r.status === 'sent') s = 'sent';
          const cur = map[r.lead_id];
          const order: ReviewStatus[] = ['not_sent', 'sent', 'opened', 'submitted'];
          if (!cur || order.indexOf(s) > order.indexOf(cur)) map[r.lead_id] = s;
        });
        setStatusMap(map);
      });
  }, [leads]);

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
              <TableHead className="text-muted-foreground text-xs">Review</TableHead>
              <TableHead className="text-muted-foreground text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => {
              const status = statusMap[l.id] || 'not_sent';
              const meta = STATUS_META[status];
              return (
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-green-500/30 text-green-600 hover:bg-green-500/10"
                      onClick={() => setReviewLead(l)}
                    >
                      <Star className="h-3 w-3" /> Send Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ReviewRequestDialog
        lead={reviewLead}
        open={!!reviewLead}
        onOpenChange={(o) => { if (!o) setReviewLead(null); }}
      />
    </div>
  );
}
