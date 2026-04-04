import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Instagram, Send, Bot, UserRound, Star, AlertCircle, RotateCcw, CheckCheck } from 'lucide-react';
import { InstagramContact, InstagramMessage } from '@/hooks/useInstagramChat';
import { format } from 'date-fns';

interface Props {
  contact: InstagramContact | null;
  messages: InstagramMessage[];
  loading: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onToggleStar: (messageId: string, currentStarred: boolean) => void;
  onToggleBot: (senderId: string, currentEnabled: boolean) => void;
  onRetryMessage?: (message: InstagramMessage) => Promise<void>;
}

export function InstagramChatWindow({ contact, messages, loading, onSendMessage, onToggleStar, onToggleBot, onRetryMessage }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#f0f2f5' }}>
        <Instagram className="h-16 w-16 text-pink-300 mb-4" />
        <h3 className="text-xl font-medium" style={{ color: '#41525d' }}>Instagram DM Inbox</h3>
        <p className="text-sm mt-1" style={{ color: '#667781' }}>Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#efeae2' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center text-white font-semibold">
          {contact.leadName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: '#111b21' }}>{contact.leadName}</span>
            <Badge className="bg-pink-500/10 text-pink-600 text-[10px]">@{contact.instagramUsername}</Badge>
          </div>
          <span className="text-xs" style={{ color: '#667781' }}>{contact.leadStatus}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleBot(contact.instagramSenderId, contact.botEnabled)}
          className={`gap-1.5 text-xs ${contact.botEnabled ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          {contact.botEnabled ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          {contact.botEnabled ? 'Bot ON' : 'Manual'}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-3" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: '#667781' }}>No messages yet</div>
        ) : (
          <div className="space-y-1">
            {messages.map(msg => {
              const isOutgoing = msg.direction === 'outgoing';
              const isFailed = msg.status === 'failed';

              return (
                <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[65%] rounded-lg px-3 py-1.5 relative group ${
                      isOutgoing ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                    style={{
                      backgroundColor: isOutgoing ? '#d9fdd3' : '#ffffff',
                      boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
                    }}
                  >
                    {!isOutgoing && (
                      <div className="text-[11px] font-medium mb-0.5 text-pink-600">
                        @{msg.instagramUsername}
                      </div>
                    )}

                    {msg.mediaUrl && (
                      <img src={msg.mediaUrl} alt="media" className="max-w-full rounded mb-1" />
                    )}

                    <p className="text-sm break-words whitespace-pre-wrap" style={{ color: '#111b21' }}>
                      {msg.messageBody}
                    </p>

                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {isFailed && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-[10px] text-red-500">Failed</span>
                          {onRetryMessage && (
                            <button
                              onClick={() => onRetryMessage(msg)}
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 ml-1"
                            >
                              <RotateCcw className="h-2.5 w-2.5" /> Retry
                            </button>
                          )}
                        </span>
                      )}
                      {isOutgoing && !isFailed && (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      )}
                      <span className="text-[11px]" style={{ color: '#667781' }}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                      {msg.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                    </div>

                    <button
                      onClick={() => onToggleStar(msg.id, msg.starred)}
                      className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow"
                    >
                      <Star className={`h-3 w-3 ${msg.starred ? 'text-amber-400 fill-amber-400' : 'text-zinc-400'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: '#f0f2f5' }}>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border-0 h-[42px]"
          style={{ backgroundColor: '#ffffff', color: '#111b21' }}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          size="icon"
          className="h-[42px] w-[42px] rounded-full bg-pink-500 hover:bg-pink-600 text-white"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
