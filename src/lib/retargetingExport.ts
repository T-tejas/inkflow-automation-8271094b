import { supabase } from '@/integrations/supabase/client';

export interface RetargetingSegment {
  name: string;
  status: string;
  count: number;
}

export async function getRetargetingSegments(): Promise<RetargetingSegment[]> {
  const statuses = ['New Lead', 'Interested', 'Contacted', 'Booked', 'Completed', 'No Response'];
  
  const segments: RetargetingSegment[] = [];
  
  for (const status of statuses) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    
    segments.push({
      name: status === 'New Lead' ? 'New Leads' :
            status === 'No Response' ? 'Not Responded' :
            status,
      status,
      count: count || 0,
    });
  }
  
  return segments;
}

export async function exportRetargetingCSV(status: string): Promise<string> {
  const { data } = await supabase
    .from('leads')
    .select('full_name, phone, source, tattoo_style, size, placement, budget, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return '';

  const headers = ['Name', 'Phone', 'Source', 'Tattoo Style', 'Size', 'Placement', 'Budget', 'Status', 'Created At'];
  const rows = data.map(l => [
    l.full_name,
    l.phone,
    l.source,
    l.tattoo_style || '',
    l.size || '',
    l.placement || '',
    l.budget || '',
    l.status,
    l.created_at,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
