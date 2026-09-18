import { useMemo } from "react";
import { differenceInHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
function ConversationTimer({ lastIncomingAt }) {
  const status = useMemo(() => {
    if (!lastIncomingAt) return "template";
    const hours = differenceInHours(/* @__PURE__ */ new Date(), new Date(lastIncomingAt));
    return hours < 24 ? "active" : "template";
  }, [lastIncomingAt]);
  if (status === "active") {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Active Window
      </Badge>;
  }
  return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] gap-1 font-semibold">
      <Clock className="h-3 w-3" />
      Template Only
    </Badge>;
}
export {
  ConversationTimer
};
