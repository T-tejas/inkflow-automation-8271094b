import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, Image, FileText, MessageCircle, Star } from 'lucide-react';

interface SystemLog {
  id: string;
  log_type: string;
  category: string;
  message: string;
  details: Record<string, unknown>;
  lead_id: string | null;
  is_resolved: boolean;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, typeof AlertCircle> = {
  upload: Image,
  invoice: FileText,
  whatsapp: MessageCircle,
  review: Star
};

export function SystemLogsPanel() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.
    from('system_logs').
    select('*').
    order('created_at', { ascending: false }).
    limit(100);
    if (data) setLogs(data as SystemLog[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const ch = supabase.
    channel('system-logs-rt').
    on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (p) => {
      setLogs((prev) => [p.new as SystemLog, ...prev]);
    }).
    subscribe();
    return () => {supabase.removeChannel(ch);};
  }, []);

  const resolveLog = async (id: string) => {
    await supabase.from('system_logs').update({ is_resolved: true } as any).eq('id', id);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, is_resolved: true } : l));
  };

  const unresolvedCount = logs.filter((l) => !l.is_resolved && l.log_type === 'error').length;

  return (
    <div className="border rounded-lg p-4 space-y-3 border-accent">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-700">
          <AlertCircle className="h-4 w-4 text-red-400" />
          System Logs
          {unresolvedCount > 0 &&
          <Badge variant="destructive" className="text-[10px] px-1.5">{unresolvedCount}</Badge>
          }
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-neutral-400 hover:text-white">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {logs.length === 0 ?
      <p className="text-xs text-neutral-500">No logs yet</p> :

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {logs.map((log) => {
          const Icon = CATEGORY_ICONS[log.category] || AlertCircle;
          return (
            <div key={log.id} className={`flex items-start gap-2 p-2 rounded-md text-xs ${log.is_resolved ? 'bg-zinc-900/30 opacity-60' : 'bg-zinc-900/60'}`}>
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${log.log_type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-sans text-neutral-900 bg-accent">{log.message}</p>
                  <p className="text-[10px] bg-accent text-stone-600">
                    {log.category} · {new Date(log.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                {!log.is_resolved && log.log_type === 'error' &&
              <Button variant="ghost" size="sm" onClick={() => resolveLog(log.id)} className="text-green-500 hover:text-green-400 h-6 w-6 p-0">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
              }
              </div>);

        })}
        </div>
      }
    </div>);

}