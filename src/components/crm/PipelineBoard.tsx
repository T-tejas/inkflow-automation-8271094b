import { Lead, LeadStatus, KANBAN_STATUSES, LEAD_SOURCES } from '@/types/lead';
import { LeadCard } from './LeadCard';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PipelineBoardProps {
  leads: Lead[];
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onEdit?: (lead: Lead) => void;
  onTagClick?: (tag: string) => void;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  'New Lead': 'bg-pipeline-new',
  'Contacted': 'bg-pipeline-contacted',
  'Interested': 'bg-pipeline-interested',
  'Negotiating': 'bg-pipeline-negotiating',
  'Booked': 'bg-pipeline-booked',
  'Completed': 'bg-pipeline-completed',
  'No Response': 'bg-pipeline-no-response',
  'Cancelled': 'bg-pipeline-cancelled',
};

const COLUMN_LABELS: Record<string, string> = {
  'No Response': 'No Response / Cancelled',
};

export function PipelineBoard({ leads, getLeadsByStatus, onLeadClick, onStatusChange, onEdit, onTagClick }: PipelineBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px] snap-x snap-mandatory md:snap-none">
      {KANBAN_STATUSES.map(status => {
        const statusLeads = getLeadsByStatus(status);
        const sourceBreakdown = LEAD_SOURCES
          .map(source => ({ source, count: statusLeads.filter(lead => lead.source === source).length }))
          .filter(item => item.count > 0);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-[260px] snap-start flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const leadId = e.dataTransfer.getData('leadId');
              if (leadId) onStatusChange(leadId, status);
            }}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status] || 'bg-muted'}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {COLUMN_LABELS[status] || status}
              </h3>
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {statusLeads.length}
              </span>
            </div>

            {sourceBreakdown.length > 0 && (
              <div className="mb-2 px-1 flex flex-wrap gap-1">
                {sourceBreakdown.map(({ source, count }) => (
                  <span
                    key={`${status}-${source}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
                  >
                    {source}: {count}
                  </span>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 rounded-lg bg-muted/30 p-2">
              <div className="space-y-2 min-h-[60px]">
                <AnimatePresence mode="popLayout">
                  {statusLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
                    >
                      <LeadCard
                        lead={lead}
                        onClick={onLeadClick}
                        onEdit={onEdit}
                        onStatusChange={onStatusChange}
                        onTagClick={onTagClick}
                      />
                    </div>
                  ))}
                </AnimatePresence>
                {statusLeads.length === 0 && (
                  <div className="flex items-center justify-center h-[60px] text-xs text-muted-foreground/50 border border-dashed border-border/30 rounded-lg">
                    Drop here
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
