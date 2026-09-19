import { useState, forwardRef } from "react";
import { LEAD_STATUSES } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowRightLeft, X } from "lucide-react";
import { motion } from "framer-motion";
const BulkActionBar = forwardRef(function BulkActionBar({ selectedCount, onMoveToStage, onDeleteSelected, onClearSelection }, ref) {
  const [moveStage, setMoveStage] = useState("");
  if (selectedCount === 0) return null;
  return <motion.div
    ref={ref}
    initial={{ y: 80, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 80, opacity: 0 }}
    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3"
  >
      <span className="text-sm font-semibold text-foreground">
        {selectedCount} selected
      </span>

      <div className="flex items-center gap-2">
        <Select value={moveStage} onValueChange={(v) => {
    setMoveStage(v);
    onMoveToStage(v);
    setMoveStage("");
  }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Move to stage..." />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="destructive" size="sm" className="h-8 text-xs gap-1" onClick={onDeleteSelected}>
          <Trash2 className="h-3 w-3" /> Delete
        </Button>

        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={onClearSelection}>
          <X className="h-3 w-3" /> Clear
        </Button>
      </div>
    </motion.div>;
});
export {
  BulkActionBar
};
