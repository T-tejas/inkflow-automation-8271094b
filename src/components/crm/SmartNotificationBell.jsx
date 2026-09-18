import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Palette, AlertCircle, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
function SmartNotificationBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 6e4);
    return () => clearInterval(interval);
  }, []);
  async function fetchAlerts() {
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = new Date(now.getTime() + 864e5).toISOString().split("T")[0];
    const result = [];
    const { data: appts } = await supabase.from("appointments").select("*").in("appointment_date", [todayStr, tomorrowStr]).in("status", ["confirmed", "pending"]).order("appointment_date");
    appts?.forEach((a) => {
      result.push({
        id: `apt-${a.id}`,
        type: "appointment",
        title: `${a.lead_name} \u2014 ${a.time_slot}`,
        detail: a.appointment_date === todayStr ? "Today" : "Tomorrow",
        date: a.appointment_date
      });
    });
    const { data: designs } = await supabase.from("design_tasks").select("*").lt("design_due_date", todayStr).in("design_status", ["Pending", "In Progress"]);
    designs?.forEach((d) => {
      result.push({
        id: `design-${d.id}`,
        type: "overdue_design",
        title: `${d.client_name} \u2014 ${d.artist_name}`,
        detail: `Due: ${d.design_due_date}`,
        date: d.design_due_date
      });
    });
    const { data: payments } = await supabase.from("design_tasks").select("*").eq("fee_status", "pending").gte("design_fee", 1);
    payments?.forEach((p) => {
      result.push({
        id: `pay-${p.id}`,
        type: "pending_payment",
        title: `${p.client_name} \u2014 \u20B9${p.design_fee}`,
        detail: `${p.design_type} design fee`,
        date: p.created_at
      });
    });
    setAlerts(result);
  }
  const getIcon = (type) => {
    switch (type) {
      case "appointment":
        return <Calendar className="h-3.5 w-3.5 text-emerald-500" />;
      case "overdue_design":
        return <Palette className="h-3.5 w-3.5 text-red-500" />;
      case "pending_payment":
        return <IndianRupee className="h-3.5 w-3.5 text-amber-500" />;
    }
  };
  const getLabel = (type) => {
    switch (type) {
      case "appointment":
        return "Upcoming";
      case "overdue_design":
        return "Overdue";
      case "pending_payment":
        return "Payment";
    }
  };
  const getBadgeClass = (type) => {
    switch (type) {
      case "appointment":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "overdue_design":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "pending_payment":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          <AlertCircle className="h-4 w-4" />
          {alerts.length > 0 && <motion.span
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
  >
              {alerts.length > 9 ? "9+" : alerts.length}
            </motion.span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[360px] max-w-[360px] p-0" align="end" sideOffset={8} collisionPadding={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Smart Alerts
          </h3>
          <span className="text-[10px] text-muted-foreground">{alerts.length} active</span>
        </div>
        <ScrollArea className="max-h-[400px]">
          {alerts.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">All clear! No pending alerts.</div> : <div className="divide-y divide-border">
              {alerts.map((alert) => <div key={alert.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground">{alert.detail}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ${getBadgeClass(alert.type)}`}>
                    {getLabel(alert.type)}
                  </Badge>
                </div>)}
            </div>}
        </ScrollArea>
      </PopoverContent>
    </Popover>;
}
export {
  SmartNotificationBell
};
