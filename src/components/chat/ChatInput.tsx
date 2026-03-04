import { useState } from 'react';
import { Smile, Paperclip, Send, StickyNote } from 'lucide-react';
import { QuickReplyTemplates } from './QuickReplyTemplates';
import { cn } from '@/lib/utils';

interface Props {
  onSendTemplate: (type: 'confirmation' | 'reminder' | 'promo', name: string) => void;
  onSendNote: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendTemplate, onSendNote, disabled }: Props) {
  const [text, setText] = useState('');
  const [noteMode, setNoteMode] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    if (noteMode) {
      onSendNote(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ backgroundColor: '#f0f2f5', borderTop: '1px solid #e9edef' }}>
      {/* Note mode banner */}
      {noteMode && (
        <div className="flex items-center gap-2 text-xs px-4 py-1.5 font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          <StickyNote className="h-3.5 w-3.5" />
          Private note mode — not sent to client
          <button
            onClick={() => setNoteMode(false)}
            className="ml-auto text-[11px] underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2.5">
        <QuickReplyTemplates
          onSelect={(t) => onSendTemplate(t.type, t.name)}
          disabled={disabled}
        />

        <button
          className={cn(
            'p-2 rounded-full transition-colors',
            noteMode ? 'bg-amber-100' : 'hover:bg-black/5'
          )}
          onClick={() => setNoteMode(!noteMode)}
          disabled={disabled}
          title="Toggle private note mode"
          style={{ color: noteMode ? '#92400e' : '#54656f' }}
        >
          <StickyNote className="h-5 w-5" />
        </button>

        <button className="p-2 rounded-full hover:bg-black/5 transition-colors" style={{ color: '#54656f' }}>
          <Smile className="h-6 w-6" />
        </button>

        <button className="p-2 rounded-full hover:bg-black/5 transition-colors" style={{ color: '#54656f' }}>
          <Paperclip className="h-5 w-5 rotate-45" />
        </button>

        <div className="flex-1">
          <input
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: '#ffffff',
              color: '#111b21',
              border: '1px solid #e9edef',
            }}
            placeholder={noteMode ? 'Type a private note...' : 'Select a template to send, or switch to note mode...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || !noteMode}
          />
        </div>

        <button
          className="p-2.5 rounded-full transition-colors disabled:opacity-40"
          onClick={handleSend}
          disabled={disabled || !text.trim() || !noteMode}
          style={{ backgroundColor: text.trim() && noteMode ? '#00a884' : 'transparent', color: text.trim() && noteMode ? '#ffffff' : '#54656f' }}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
