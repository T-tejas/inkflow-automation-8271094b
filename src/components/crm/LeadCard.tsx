import { Lead, LeadStatus, LEAD_STATUSES, parseBudget, getFollowupStatus } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, MessageCircle, IndianRupee, Pencil, StickyNote, ArrowRightLeft, Palette, Eye, Clock, PhoneCall, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onStatusChange?: (leadId: string, status: LeadStatus) => void;
  onTagClick?: (tag: string) => void;
  onAssignDesign?: (lead: Lead) => void;
  onViewDesign?: (leadId: string) => void;
  hasDesign?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (leadId: string) => void;
  selectMode?: boolean;
  onMarkContacted?: (leadId: string) => void;
  onRescheduleFollowup?: (lead: Lead) => void;
}

function getBorderColor(lead: Lead): string {
  const budget = parseBudget(lead.budget);
  if (lead.status === 'Artist Consultation') return 'border-l-orange-500';
  if (lead.status === 'Booked') return 'border-l-pipeline-booked';
  if (lead.status === 'Completed') return 'border-l-pipeline-completed';
  if (budget >= 5000) return 'border-l-warning';
  return 'border-l-transparent';
}

function isHotLead(lead: Lead): boolean {
  return lead.status === 'Artist Consultation';
}

export function LeadCard({ lead, onClick, onEdit, onStatusChange, onTagClick, onAssignDesign, onViewDesign, hasDesign, isSelected, onToggleSelect, selectMode, onMarkContacted, onRescheduleFollowup }: LeadCardProps) {
  const [stageOpen, setStageOpen] = useState(false);
  const followupStatus = getFollowupStatus(lead.nextFollowupDate);

  const handleQuickAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => onClick(lead)}
        className={`glass-card rounded-lg p-3 cursor-pointer transition-colors hover:border-primary/30 space-y-2 border-l-[3px] ${getBorderColor(lead)} group ${isHotLead(lead) ? 'ring-1 ring-orange-500/40 bg-orange-500/5' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''} ${followupStatus === 'overdue' ? 'ring-1 ring-destructive/40 bg-destructive/5' : followupStatus === 'today' ? 'ring-1 ring-warning/40 bg-warning/5' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {(selectMode || isSelected) && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.(lead.id)}
                onClick={e => e.stopPropagation()}
                className="h-3.5 w-3.5"
              />
            )}
            <h4 className="font-medium text-sm text-foreground truncate">{lead.fullName}</h4>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {lead.whatsappOptIn && (
              <MessageCircle className="h-3.5 w-3.5 text-success" />
            )}
          </div>
        </div>

        {/* Phone + Budget */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
          {lead.budget && (
            <div className="flex items-center gap-0.5 text-xs font-semibold text-warning">
              <IndianRupee className="h-3 w-3" />
              <span>{lead.budget.replace('₹', '')}</span>
            </div>
          )}
        </div>

        {/* Style + Size badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
            {lead.tattooStyle}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
            {lead.size}
          </Badge>
        </div>

        {/* Date + Source + Follow-up */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {lead.preferredDate ? new Date(lead.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          </span>
          <span>{lead.source}</span>
        </div>

        {/* Follow-up Indicator */}
        {followupStatus !== 'none' && (
          <div className={`flex items-center justify-between gap-1 text-[10px] font-medium px-2 py-1 rounded-md ${
            followupStatus === 'overdue' ? 'bg-destructive/10 text-destructive' :
            followupStatus === 'today' ? 'bg-warning/10 text-warning' :
            'bg-emerald-500/10 text-emerald-600'
          }`}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {followupStatus === 'overdue' ? '⚠ Overdue' : followupStatus === 'today' ? '📞 Follow-up Today' : '📅 Upcoming'}
            </span>
            <span>{lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
          </div>
        )}

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.tags.map(tag => (
              <button
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Hot Lead Indicator */}
        {isHotLead(lead) && (
          <div className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold animate-pulse">
            🔥 Artist Consultation Requested
          </div>
        )}

        {hasDesign && (
          <div className="flex items-center gap-1 text-[10px] text-purple-500 font-medium">
            <Palette className="h-3 w-3" />
            Design Assigned
          </div>
        )}

        {/* Quick Actions — visible on hover */}
        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleQuickAction(e, () => onEdit(lead))}
                  className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit lead"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Edit</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => handleQuickAction(e, () => onClick(lead))}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Add note"
              >
                <StickyNote className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">Add Note</TooltipContent>
          </Tooltip>
          {onStatusChange && (
            <Popover open={stageOpen} onOpenChange={setStageOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Change stage"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">Change Stage</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-40 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                {LEAD_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(lead.id, s);
                      setStageOpen(false);
                    }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 transition-colors ${
                      lead.status === s ? 'font-semibold text-primary' : 'text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          {lead.whatsappOptIn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-success/10 text-success transition-colors"
                  aria-label="WhatsApp chat"
                >
                  <MessageCircle className="h-3 w-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">WhatsApp</TooltipContent>
            </Tooltip>
          )}
          {/* Design Actions */}
          {hasDesign && onViewDesign ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleQuickAction(e, () => onViewDesign(lead.id))}
                  className="p-1.5 rounded-md hover:bg-purple-500/10 text-purple-500 transition-colors"
                  aria-label="View design"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">View Design</TooltipContent>
            </Tooltip>
          ) : onAssignDesign ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleQuickAction(e, () => onAssignDesign(lead))}
                  className="p-1.5 rounded-md hover:bg-purple-500/10 text-purple-500 transition-colors"
                  aria-label="Assign design"
                >
                  <Palette className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Assign Design 🎨</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
