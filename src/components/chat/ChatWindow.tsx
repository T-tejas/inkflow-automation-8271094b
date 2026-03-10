import { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatContact } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Phone, MoreVertical, Search, MessageSquare, ArrowLeft, AlertTriangle, X, CalendarPlus, Bot, BotOff, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STATUS_OPTIONS = [
  { label: 'New Lead', color: '#6b7280' },
  { label: 'Contacted', color: '#3b82f6' },
  { label: 'Interested', color: '#8b5cf6' },
  { label: 'Negotiating', color: '#f59e0b' },
  { label: 'Booked', color: '#22c55e' },
  { label: 'Completed', color: '#15803d' },
  { label: 'No Response', color: '#ef4444' },
];

function getStatusColor(status: string) {
  return STATUS_OPTIONS.find(s => s.label.toLowerCase() === status.toLowerCase())?.color || '#6b7280';
}

interface Props {
  contact: ChatContact | null;
  messages: ChatMessage[];
  loading: boolean;
  onSendTemplate: (type: 'confirmation' | 'reminder' | 'promo', name: string) => void;
  onSendNote: (text: string) => void;
  onSendMessage: (text: string) => void;
  onSendAttachment: (url: string, fileName: string, isImage: boolean) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onStatusChange: (leadId: string, newStatus: string, oldStatus: string) => void;
  onRetryMessage: (message: ChatMessage) => void;
  onBookAppointment?: () => void;
  onToggleBot?: (leadId: string, currentStatus: boolean) => void;
  onClearChat?: (phone: string) => Promise<void>;
}

export function ChatWindow({ contact, messages, loading, onSendTemplate, onSendNote, onSendMessage, onSendAttachment, onToggleStar, onStatusChange, onRetryMessage, onBookAppointment, onToggleBot, onClearChat }: Props) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearingChat, setClearingChat] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const recentFailed = messages.filter(m => (m.status === 'failed' || m.deliveryStatus === 'failed'));
  const tokenExpired = recentFailed.some(m => m.errorMessage?.toLowerCase().includes('token') || m.errorMessage?.toLowerCase().includes('expired') || m.errorMessage?.toLowerCase().includes('oauth'));
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#f0f2f5' }}>
        <div className="mb-8">
          <img
            src="https://web.whatsapp.com/img/intro-connection-light_c98cc75f2aa905314d74571a2573d4ff.jpg"
            alt=""
            className="w-[320px] h-auto opacity-60"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <h3 className="text-3xl font-light mb-3" style={{ color: '#41525d' }}>WhatsApp Web</h3>
        <p className="text-sm text-center max-w-sm" style={{ color: '#667781' }}>
          Send and receive messages. Select a conversation from the left panel to get started.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs" style={{ color: '#8696a0' }}>
          <MessageSquare className="h-4 w-4" />
          End-to-end encrypted
        </div>
      </div>
    );
  }

  // Filter messages by search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.messageBody?.toLowerCase().includes(searchQuery.toLowerCase()) || m.templateName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of filteredMessages) {
    const dateStr = format(parseISO(msg.createdAt), 'yyyy-MM-dd');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, msgs: [msg] });
    }
  }

  const statusColor = getStatusColor(contact.leadStatus);
  const botActive = contact.botEnabled !== false;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Error banner */}
      {tokenExpired && !bannerDismissed && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          WhatsApp token expired — update in settings to continue sending messages
          <button onClick={() => setBannerDismissed(true)} className="ml-auto p-1 rounded hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bot disabled banner */}
      {!botActive && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#fff3cd', color: '#856404', borderBottom: '1px solid #ffc107' }}>
          <BotOff className="h-3.5 w-3.5" />
          AI Bot Disabled — Only human staff messages will be sent to this contact
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
        <div className="flex items-center gap-2 min-w-0">
          <IconBtn onClick={() => navigate('/')} title="Back to CRM">
            <ArrowLeft className="h-5 w-5" />
          </IconBtn>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: '#00a884' }}
          >
            {contact.leadName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium truncate" style={{ color: '#111b21' }}>
                {contact.leadName}
              </span>
              {/* Status badge with dropdown */}
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide transition-opacity hover:opacity-80"
                    style={{ backgroundColor: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}
                  >
                    {contact.leadStatus}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-48 p-1 rounded-lg shadow-xl border"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}
                  side="bottom"
                  align="start"
                >
                  <div className="text-[10px] px-3 py-1.5 uppercase tracking-wider font-semibold" style={{ color: '#8696a0' }}>
                    Change Status
                  </div>
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.label}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 transition-colors hover:bg-gray-50',
                        contact.leadStatus === s.label && 'font-semibold'
                      )}
                      onClick={() => {
                        if (contact.leadStatus !== s.label) {
                          onStatusChange(contact.leadId, s.label, contact.leadStatus);
                        }
                        setStatusOpen(false);
                      }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span style={{ color: '#111b21' }}>{s.label}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <div className="text-xs" style={{ color: '#667781' }}>
              {contact.leadPhone}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Bot toggle */}
          {onToggleBot && (
            <div className="flex items-center gap-1.5 mr-2 px-2 py-1 rounded-lg" style={{ backgroundColor: botActive ? '#dcfce7' : '#fee2e2' }}>
              {botActive ? <Bot className="h-4 w-4" style={{ color: '#16a34a' }} /> : <BotOff className="h-4 w-4" style={{ color: '#dc2626' }} />}
              <span className="text-[11px] font-semibold" style={{ color: botActive ? '#16a34a' : '#dc2626' }}>
                {botActive ? 'Bot Active' : 'Bot Off'}
              </span>
              <Switch
                checked={botActive}
                onCheckedChange={() => onToggleBot(contact.leadId, botActive)}
                className="scale-75"
              />
            </div>
          )}
          {onBookAppointment && (
            <IconBtn title="Book Appointment" onClick={onBookAppointment}>
              <CalendarPlus className="h-5 w-5" style={{ color: '#22c55e' }} />
            </IconBtn>
          )}
          <IconBtn title="Call" onClick={() => window.open(`tel:${contact.leadPhone}`, '_self')}>
            <Phone className="h-5 w-5" />
          </IconBtn>
          <IconBtn title="Search" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}>
            <Search className="h-5 w-5" />
          </IconBtn>
          {/* Three-dot menu */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-full hover:bg-black/5 transition-colors" style={{ color: '#54656f' }} title="More options">
                <MoreVertical className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-52 p-1 rounded-lg shadow-xl border"
              style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}
              side="bottom"
              align="end"
            >
              <button
                className="w-full text-left px-3 py-2.5 text-sm rounded flex items-center gap-2 transition-colors hover:bg-gray-50"
                style={{ color: '#ef4444' }}
                disabled={clearingChat}
                onClick={async () => {
                  if (!contact) return;
                  const confirmed = window.confirm(`Clear all chat messages with ${contact.leadName}? This cannot be undone.`);
                  if (!confirmed) return;
                  setClearingChat(true);
                  try {
                    if (onClearChat) {
                      await onClearChat(contact.leadPhone);
                      toast({ title: 'Chat cleared' });
                    }
                  } catch {
                    toast({ title: 'Failed to clear chat', variant: 'destructive' });
                  } finally {
                    setClearingChat(false);
                    setMenuOpen(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {clearingChat ? 'Clearing...' : 'Clear Chat'}
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: '#8696a0' }} />
          <Input
            autoFocus
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 text-sm border-none shadow-none focus-visible:ring-0"
            style={{ backgroundColor: '#ffffff' }}
          />
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-1 rounded hover:bg-black/5">
            <X className="h-4 w-4" style={{ color: '#54656f' }} />
          </button>
        </div>
      )}
      <ScrollArea
        className="flex-1 px-16 py-4"
        style={{
          backgroundColor: '#efeae2',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 2a2 2 0 110 4 2 2 0 010-4z' fill='%23d4cfc6' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00a884', borderTopColor: 'transparent' }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-center py-20" style={{ color: '#8696a0' }}>
            No messages yet. Send a message or template to start the conversation.
          </p>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span
                  className="text-xs px-3 py-1 rounded-lg shadow-sm"
                  style={{ backgroundColor: '#ffffff', color: '#54656f', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}
                >
                  {isSameDay(parseISO(group.date), new Date()) ? 'TODAY' : format(parseISO(group.date), 'dd/MM/yyyy')}
                </span>
              </div>
              {group.msgs.map(msg => (
                <MessageBubble key={msg.id} message={msg} onToggleStar={onToggleStar} onRetry={onRetryMessage} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSendTemplate={onSendTemplate}
        onSendNote={onSendNote}
        onSendMessage={onSendMessage}
        onSendAttachment={onSendAttachment}
        disabled={false}
      />
    </div>
  );
}

function IconBtn({ children, onClick, href, title }: { children: React.ReactNode; onClick?: () => void; href?: string; title?: string }) {
  const cls = "p-2 rounded-full hover:bg-black/5 transition-colors";
  const style = { color: '#54656f' };
  if (href) {
    return <a href={href} className={cls} style={style} title={title}>{children}</a>;
  }
  return <button onClick={onClick} className={cls} style={style} title={title}>{children}</button>;
}
