import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, Image, FileText, MessageCircle, Star } from "lucide-react";
const CATEGORY_ICONS = {
  upload: Image,
  invoice: FileText,
  whatsapp: MessageCircle,
  review: Star
};
function SystemLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };
  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel("system-logs-rt").on("postgres_changes", { event: "INSERT", schema: "public", table: "system_logs" }, (p) => {
      setLogs((prev) => [p.new, ...prev]);
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  const resolveLog = async (id) => {
    await supabase.from("system_logs").update({ is_resolved: true }).eq("id", id);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, is_resolved: true } : l));
  };
  const unresolvedCount = logs.filter((l) => !l.is_resolved && l.log_type === "error").length;
  return <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <AlertCircle className="h-4 w-4 text-destructive" />
          System Logs
          {unresolvedCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5">{unresolvedCount}</Badge>}
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {logs.length === 0 ? <p className="text-xs text-muted-foreground">No logs yet</p> : <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {logs.map((log) => {
    const Icon = CATEGORY_ICONS[log.category] || AlertCircle;
    return <div key={log.id} className={`flex items-start gap-2 p-2 rounded-md text-xs ${log.is_resolved ? "bg-muted/30 opacity-60" : "bg-muted/50"}`}>
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${log.log_type === "error" ? "text-destructive" : "text-info"}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-sans text-foreground">{log.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {log.category} · {new Date(log.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                {!log.is_resolved && log.log_type === "error" && <Button variant="ghost" size="sm" onClick={() => resolveLog(log.id)} className="text-success hover:text-success h-6 w-6 p-0">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>}
              </div>;
  })}
        </div>}
    </div>;
}
export {
  SystemLogsPanel
};
