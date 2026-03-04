import { ChatMessage } from '@/hooks/useChat';
import { Check, CheckCheck, AlertCircle, Lock, Star, RotateCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface Props {
  message: ChatMessage;
  onToggleStar: (id: string, starred: boolean) => void;
  onRetry?: (message: ChatMessage) => void;
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

function isFileMessage(body: string) {
  return body.startsWith('[file]') || (body.startsWith('http') && (isImageUrl(body) || isPdfUrl(body)));
}

function DeliveryTicks({ message }: { message: ChatMessage }) {
  const status = message.deliveryStatus || message.status;
  if (status === 'failed') return <AlertCircle className="h-3 w-3" style={{ color: '#ea0038' }} />;
  if (status === 'read' || message.readAt) return <CheckCheck className="h-3.5 w-3.5" style={{ color: '#53bdeb' }} />;
  if (status === 'delivered' || message.deliveredAt) return <CheckCheck className="h-3.5 w-3.5" style={{ color: '#8696a0' }} />;
  if (status === 'sent') return <Check className="h-3.5 w-3.5" style={{ color: '#8696a0' }} />;
  return null;
}

function renderFileContent(body: string) {
  const url = body.startsWith('[file]') ? body.replace('[file]', '').trim() : body;
  
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="attachment" className="max-w-[250px] max-h-[200px] rounded-lg object-cover" />
      </a>
    );
  }
  if (isPdfUrl(url)) {
    const filename = url.split('/').pop()?.split('?')[0] || 'document.pdf';
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
      >
        <FileText className="h-8 w-8 flex-shrink-0" style={{ color: '#ea4335' }} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#111b21' }}>{filename}</p>
          <p className="text-[11px]" style={{ color: '#667781' }}>PDF Document</p>
        </div>
      </a>
    );
  }
  return null;
}

export function MessageBubble({ message, onToggleStar, onRetry }: Props) {
  const isOutgoing = message.templateType !== 'incoming' && message.status !== 'received' && !message.isInternalNote;
  const isNote = message.isInternalNote;
  const isIncoming = !isOutgoing && !isNote;
  const isFailed = message.status === 'failed' || message.deliveryStatus === 'failed';

  const body = message.messageBody || `📋 Template: ${message.templateName}`;
  const time = format(parseISO(message.createdAt), 'HH:mm');
  const fileMsg = body && isFileMessage(body);

  const bubbleStyle: React.CSSProperties = isNote
    ? { backgroundColor: '#fef3c7', border: '1px solid #fde68a' }
    : isOutgoing
    ? { backgroundColor: '#d9fdd3' }
    : { backgroundColor: '#ffffff' };

  return (
    <div className={cn('flex mb-1 group', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[65%] px-2 pt-1.5 pb-1 text-[14.2px] leading-[19px]',
          isOutgoing && 'rounded-lg rounded-tr-none',
          isIncoming && 'rounded-lg rounded-tl-none',
          isNote && 'rounded-lg'
        )}
        style={{ ...bubbleStyle, boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}
      >
        {/* Tail */}
        {(isOutgoing || isIncoming) && (
          <div
            className={cn('absolute top-0 w-2 h-3', isOutgoing ? '-right-2' : '-left-2')}
            style={{
              backgroundImage: isOutgoing
                ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 8 13' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z' fill='%23d9fdd3'/%3E%3C/svg%3E")`
                : `url("data:image/svg+xml,%3Csvg viewBox='0 0 8 13' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.812 1H8v11.193L1.533 3.568C.474 2.156 1.042 1 2.812 1z' fill='%23ffffff'/%3E%3C/svg%3E")`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {isNote && (
          <div className="flex items-center gap-1 text-[11px] mb-1 font-medium" style={{ color: '#92400e' }}>
            <Lock className="h-3 w-3" /> Internal Note (Not visible to client)
          </div>
        )}

        {fileMsg ? renderFileContent(body) : (
          <p className="whitespace-pre-wrap break-words" style={{ color: '#111b21' }}>{body}</p>
        )}

        {message.errorMessage && (
          <p className="text-[11px] mt-1 break-words line-clamp-2" style={{ color: '#ea0038' }}>
            ⚠ {message.errorMessage}
          </p>
        )}

        {/* Retry button for failed messages */}
        {isFailed && onRetry && (
          <button
            onClick={() => onRetry(message)}
            className="flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-1 rounded hover:bg-black/5 transition-colors"
            style={{ color: '#ea0038' }}
          >
            <RotateCw className="h-3 w-3" /> Retry
          </button>
        )}

        <div className={cn('flex items-center gap-1 mt-0.5 float-right ml-3 -mb-0.5 relative top-[3px]')}>
          <button
            onClick={() => onToggleStar(message.id, message.starred)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star className={cn('h-3 w-3', message.starred ? 'fill-amber-400 text-amber-400' : '')} style={!message.starred ? { color: '#8696a0' } : {}} />
          </button>
          <span className="text-[11px]" style={{ color: '#667781' }}>{time}</span>
          {isOutgoing && <DeliveryTicks message={message} />}
        </div>
        <div className="clear-both" />
      </div>
    </div>
  );
}
