import { useEffect, useRef } from 'react';
import { ChatMessage, ChatContact } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, CheckCircle2, MessageSquare } from 'lucide-react';
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
      <div className="flex-1 flex items-center justify-center bg-[#060610]">
        <div className="text-center">
          <MessageSquare className="h-20 w-20 text-neutral-700 mx-auto mb-5" />
          <h3 className="text-xl font-semibold text-neutral-500">Select a conversation</h3>
          <p className="text-sm text-neutral-600 mt-2">Choose a contact from the left panel to start</p>
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
    <div className="flex-1 flex flex-col bg-[#060610] min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a2e] bg-[#0a0a0f]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-11 w-11 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {contact.leadName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-neutral-200 truncate">{contact.leadName}</span>
              <Badge variant="outline" className="text-[10px] h-5 px-2 border-emerald-800 text-emerald-400">
                {contact.leadStatus}
              </Badge>
            </div>
            <span className="text-xs text-neutral-500">{contact.leadPhone}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-emerald-400" asChild>
            <a href={`tel:${contact.leadPhone}`}><Phone className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-blue-400" onClick={handleMarkBooked} title="Mark as Booked">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-amber-400" onClick={handleMarkCompleted} title="Mark as Completed">
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area with wallpaper-like subtle pattern */}
      <ScrollArea className="flex-1 px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-20">No messages yet. Send a template to start the conversation.</p>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-4">
                <span className="text-[11px] text-neutral-500 bg-[#111] px-4 py-1 rounded-full shadow-sm">
                  {isSameDay(parseISO(group.date), new Date())
                    ? 'Today'
                    : format(parseISO(group.date), 'dd MMM yyyy')}
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
