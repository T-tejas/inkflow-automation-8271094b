import { ChatMessage } from '@/hooks/useChat';
import { Check, CheckCheck, AlertCircle, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface Props {
  message: ChatMessage;
  onToggleStar: (id: string, starred: boolean) => void;
}

function DeliveryTicks({ message }: { message: ChatMessage }) {
  const status = message.deliveryStatus || message.status;

  if (status === 'failed') return <AlertCircle className="h-3 w-3 text-red-400" />;
  if (status === 'read' || message.readAt) return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === 'delivered' || message.deliveredAt) return <CheckCheck className="h-3 w-3 text-neutral-400" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-neutral-400" />;
  return null;
}

export function MessageBubble({ message, onToggleStar }: Props) {
  const isOutgoing = message.templateType !== 'incoming' && message.status !== 'received' && !message.isInternalNote;
  const isNote = message.isInternalNote;
  const isIncoming = !isOutgoing && !isNote;

  const body = message.messageBody || `📋 Template: ${message.templateName}`;
  const time = format(parseISO(message.createdAt), 'HH:mm');

  return (
    <div className={cn('flex mb-1.5 group', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
          isOutgoing && 'bg-emerald-800/80 text-emerald-50 rounded-tr-none',
          isIncoming && 'bg-[#1a1a2e] text-neutral-200 rounded-tl-none border border-[#2a2a3e]',
          isNote && 'bg-amber-900/40 text-amber-100 rounded-tl-none border border-amber-800/50'
        )}
      >
        {isNote && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 mb-1 font-medium">
            <Lock className="h-2.5 w-2.5" /> Internal Note
          </div>
        )}

        <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>

        <div className={cn('flex items-center gap-1 mt-1', isOutgoing ? 'justify-end' : 'justify-between')}>
          <button
            onClick={() => onToggleStar(message.id, message.starred)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star className={cn('h-3 w-3', message.starred ? 'fill-amber-400 text-amber-400' : 'text-neutral-500')} />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400">{time}</span>
            {isOutgoing && <DeliveryTicks message={message} />}
          </div>
        </div>

        {message.errorMessage && (
          <p className="text-[10px] text-red-400 mt-1">⚠ {message.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
