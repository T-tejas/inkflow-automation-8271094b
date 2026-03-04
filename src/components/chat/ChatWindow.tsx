import { useEffect, useRef } from 'react';
import { ChatMessage, ChatContact } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Calendar, CheckCircle2, MoreVertical, Search, MessageSquare } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  contact: ChatContact | null;
  messages: ChatMessage[];
  loading: boolean;
  onSendTemplate: (type: 'confirmation' | 'reminder' | 'promo', name: string) => void;
  onSendNote: (text: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
}

export function ChatWindow({ contact, messages, loading, onSendTemplate, onSendNote, onToggleStar }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMarkBooked = async () => {
    if (!contact) return;
    await supabase.from('leads').update({ status: 'Booked' }).eq('id', contact.leadId);
    toast({ title: 'Lead marked as Booked' });
  };

  const handleMarkCompleted = async () => {
    if (!contact) return;
    await supabase.from('leads').update({ status: 'Completed' }).eq('id', contact.leadId);
    toast({ title: 'Lead marked as Completed' });
  };

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

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const dateStr = format(parseISO(msg.createdAt), 'yyyy-MM-dd');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, msgs: [msg] });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: '#00a884' }}
          >
            {contact.leadName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-medium truncate" style={{ color: '#111b21' }}>
              {contact.leadName}
            </div>
            <div className="text-xs" style={{ color: '#667781' }}>
              {contact.leadPhone}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconBtn href={`tel:${contact.leadPhone}`} title="Call">
            <Phone className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={handleMarkBooked} title="Mark as Booked">
            <Calendar className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={handleMarkCompleted} title="Mark as Completed">
            <CheckCircle2 className="h-5 w-5" />
          </IconBtn>
          <IconBtn title="More options">
            <MoreVertical className="h-5 w-5" />
          </IconBtn>
        </div>
      </div>

      {/* Messages area */}
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
            No messages yet. Send a template to start the conversation.
          </p>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span
                  className="text-xs px-3 py-1 rounded-lg shadow-sm"
                  style={{ backgroundColor: '#ffffff', color: '#54656f', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}
                >
                  {isSameDay(parseISO(group.date), new Date())
                    ? 'TODAY'
                    : format(parseISO(group.date), 'dd/MM/yyyy')}
                </span>
              </div>
              {group.msgs.map(msg => (
                <MessageBubble key={msg.id} message={msg} onToggleStar={onToggleStar} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSendTemplate={onSendTemplate}
        onSendNote={(text) => onSendNote(text)}
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
