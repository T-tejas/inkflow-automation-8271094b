import { useState } from 'react';
import { CrmNotification } from '@/hooks/useCrmNotifications';
import { Bell, Flame, Phone, Palette, X, CheckCheck, Zap, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface HotLeadNotificationsProps {
  notifications: CrmNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLeadClick?: (leadId: string) => void;
}

function LeadScoreBadge({ score }: { score: string | null }) {
  if (!score) return null;
  const colors: Record<string, string> = {
    HOT: 'bg-orange-500 text-white',
    WARM: 'bg-amber-400 text-amber-900',
    COLD: 'bg-sky-200 text-sky-800',
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[score] || 'bg-muted text-muted-foreground'}`}>
      {score === 'HOT' ? '🔥 HOT' : score === 'WARM' ? '🌤 WARM' : '❄️ COLD'}
    </span>
  );
}

export function HotLeadNotifications({ notifications, unreadCount, onMarkRead, onMarkAllRead, onLeadClick }: HotLeadNotificationsProps) {
  const [open, setOpen] = useState(false);

  const getNotifLabel = (n: CrmNotification) => {
    if (n.notification_type === 'lead_qualified') return '📊 New Lead Captured';
    if (n.notification_type === 'design_assigned') return '🎨 Design Assigned';
    if (n.notification_type === 'website_lead') return '🌐 New Website Lead';
    return '🔥 Artist Consultation Requested';
  };

  const getNotifIcon = (n: CrmNotification) => {
    if (n.notification_type === 'design_assigned') {
      return <Palette className={`h-4 w-4 ${!n.is_read ? 'text-purple-500' : 'text-muted-foreground'}`} />;
    }
    if (n.notification_type === 'website_lead') {
      return <Zap className={`h-4 w-4 ${!n.is_read ? 'text-blue-500' : 'text-muted-foreground'}`} />;
    }
    if (n.lead_score === 'HOT') {
      return <Flame className={`h-4 w-4 ${!n.is_read ? 'text-orange-500' : 'text-muted-foreground'}`} />;
    }
    return <Zap className={`h-4 w-4 ${!n.is_read ? 'text-amber-500' : 'text-muted-foreground'}`} />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Lead Alerts</h3>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={onMarkAllRead}>
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[450px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No lead alerts yet</div>
          ) : (
            <div className="divide-y divide-border">
              <AnimatePresence>
                {notifications.map(n => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-orange-500/5' : ''}`}
                    onClick={() => {
                      if (!n.is_read) onMarkRead(n.id);
                      if (n.lead_id) onLeadClick?.(n.lead_id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? (n.notification_type === 'design_assigned' ? 'bg-purple-500/20' : 'bg-orange-500/20') : 'bg-muted'}`}>
                        {getNotifIcon(n)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{n.lead_name}</span>
                          <LeadScoreBadge score={n.lead_score} />
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{getNotifLabel(n)}</p>

                        {/* Chat Summary */}
                        {n.chat_summary && (
                          <p className="text-[11px] text-foreground/70 bg-muted/50 rounded px-2 py-1">
                            {n.chat_summary}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {n.tattoo_idea && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Palette className="h-2.5 w-2.5 mr-0.5" />{n.tattoo_idea.slice(0, 30)}
                            </Badge>
                          )}
                          {n.size && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{n.size}</Badge>
                          )}
                          {n.placement && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{n.placement}</Badge>
                          )}
                          {n.timeline && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />{n.timeline}
                            </Badge>
                          )}
                          {n.budget && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <DollarSign className="h-2.5 w-2.5 mr-0.5" />{n.budget}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{n.lead_phone}</span>
                          <span>·</span>
                          <span>{new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
