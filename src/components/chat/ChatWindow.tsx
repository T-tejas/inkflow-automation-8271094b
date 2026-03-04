import { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatContact } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, User, Calendar, CheckCircle2, MessageSquare } from 'lucide-react';
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
          <MessageSquare className="h-16 w-16 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-500">Select a conversation</h3>
          <p className="text-xs text-neutral-600 mt-1">Choose a contact from the left panel to start</p>
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a2e] bg-[#0a0a0f]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {contact.leadName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-200 truncate">{contact.leadName}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-800 text-emerald-400">
                {contact.leadStatus}
              </Badge>
            </div>
            <span className="text-[11px] text-neutral-500">{contact.leadPhone}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-emerald-400" asChild>
            <a href={`tel:${contact.leadPhone}`}><Phone className="h-3.5 w-3.5" /></a>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-blue-400" onClick={handleMarkBooked}>
            <Calendar className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-amber-400" onClick={handleMarkCompleted}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-neutral-600 text-center py-16">No messages yet. Send a template to start.</p>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-neutral-500 bg-[#111] px-3 py-0.5 rounded-full">
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
