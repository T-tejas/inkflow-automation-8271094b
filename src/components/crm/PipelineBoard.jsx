import { KANBAN_STATUSES, LEAD_SOURCES, parseBudget } from "@/types/lead";
import { LeadCard } from "./LeadCard";
import { AnimatePresence } from "framer-motion";
import { formatINRShort } from "@/lib/currency";
const STATUS_DOT_COLORS = {
  "New Lead": "bg-pipeline-new",
  "Contacted": "bg-pipeline-contacted",
  "Interested": "bg-pipeline-interested",
  "Artist Consultation": "bg-orange-500",
  "Negotiating": "bg-pipeline-negotiating",
  "Booked": "bg-pipeline-booked",
  "Completed": "bg-pipeline-completed",
  "No Response": "bg-pipeline-no-response",
  "Cancelled": "bg-pipeline-cancelled",
  "Out of City": "bg-sky-500",
  "Student Inquiry": "bg-violet-500",
  "Low Budget": "bg-amber-500"
};
const COLUMN_LABELS = {
  "No Response": "No Response / Cancelled",
  "Out of City": "Out of City / External"
};
function PipelineBoard({ leads, getLeadsByStatus, onLeadClick, onStatusChange, onEdit, onTagClick, onAssignDesign, onViewDesign, designLeadIds, selectedIds, onToggleSelect, selectMode, onMarkContacted, onRescheduleFollowup }) {
  const COLUMNS = [
    { key: "Instagram", status: "Instagram", label: "Instagram Inquiries" },
    ...KANBAN_STATUSES.map((s) => ({ key: s, status: s, label: COLUMN_LABELS[s] || s }))
  ];
  return <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none" style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}>
      {COLUMNS.map(({ key, status, label }) => {
    const isInstagramCol = status === "Instagram";
    const statusLeads = leads.filter((l) => {
      if (isInstagramCol) return l.source === "Instagram";
      if (l.source === "Instagram") return false;
      if (status === "No Response") return l.status === "No Response" || l.status === "Cancelled";
      return l.status === status;
    });
    const sourceBreakdown = LEAD_SOURCES.map((source) => ({ source, count: statusLeads.filter((lead) => lead.source === source).length })).filter((item) => item.count > 0);
    const totalValue = statusLeads.reduce((sum, l) => sum + parseBudget(l.budget), 0);
    const avgValue = statusLeads.length > 0 ? totalValue / statusLeads.length : 0;
    return <div
      key={key}
      className={`flex-shrink-0 w-[260px] snap-start flex flex-col h-full ${isInstagramCol ? "rounded-lg p-0.5 bg-gradient-to-br from-pink-500/40 via-purple-500/30 to-orange-400/30" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (isInstagramCol) return;
        const leadId = e.dataTransfer.getData("leadId");
        if (leadId) onStatusChange(leadId, status);
      }}
    >
            <div className="flex items-center gap-2 mb-1 px-1 sticky top-0 z-10 bg-background py-1 rounded-md">
              {isInstagramCol ? <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400" /> : <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status] || "bg-muted"}`} />}
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isInstagramCol ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 bg-clip-text text-transparent" : "text-muted-foreground"}`}>
                {label}
              </h3>
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {statusLeads.length}
              </span>
            </div>

            {
      /* Price Analytics */
    }
            {statusLeads.length > 0 && totalValue > 0 && <div className="mx-1 mb-2 px-2 py-1.5 rounded-md bg-card border border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-xs font-bold text-foreground">{formatINRShort(totalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Avg</p>
                  <p className="text-xs font-semibold text-primary">{formatINRShort(avgValue)}</p>
                </div>
              </div>}

            {sourceBreakdown.length > 0 && <div className="mb-2 px-1 flex flex-wrap gap-1">
                {sourceBreakdown.map(({ source, count }) => <span
      key={`${status}-${source}`}
      className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
    >
                    {source}: {count}
                  </span>)}
              </div>}

            <div className="flex-1 rounded-lg bg-muted/30 p-2 overflow-y-auto">
              <div className="space-y-2 min-h-[60px]">
                <AnimatePresence mode="popLayout">
                  {statusLeads.map((lead) => <div
      key={lead.id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)}
    >
                      <LeadCard
      lead={lead}
      onClick={onLeadClick}
      onEdit={onEdit}
      onStatusChange={onStatusChange}
      onTagClick={onTagClick}
      onAssignDesign={onAssignDesign}
      onViewDesign={onViewDesign}
      hasDesign={designLeadIds?.has(lead.id)}
      isSelected={selectedIds?.has(lead.id)}
      onToggleSelect={onToggleSelect}
      selectMode={selectMode}
      onMarkContacted={onMarkContacted}
      onRescheduleFollowup={onRescheduleFollowup}
    />
                    </div>)}
                </AnimatePresence>
                {statusLeads.length === 0 && <div className="flex items-center justify-center h-[60px] text-xs text-muted-foreground/50 border border-dashed border-border/30 rounded-lg">
                    Drop here
                  </div>}
              </div>
            </div>
          </div>;
  })}
    </div>;
}
export {
  PipelineBoard
};
