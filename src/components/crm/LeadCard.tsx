import { Lead, STATUS_TEXT_COLORS } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onClick(lead)}
      className="glass-card rounded-lg p-3 cursor-pointer transition-colors hover:border-primary/30 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-foreground truncate">{lead.fullName}</h4>
        {lead.whatsappOptIn && (
          <MessageCircle className="h-3.5 w-3.5 text-success shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone className="h-3 w-3" />
        <span>{lead.phone}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
          {lead.tattooStyle}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
          {lead.size}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {lead.preferredDate ? new Date(lead.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
        </span>
        <span>{lead.source}</span>
      </div>

      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
