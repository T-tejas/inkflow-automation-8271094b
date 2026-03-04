import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, StickyNote } from 'lucide-react';
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
    <div className="border-t border-[#222] bg-[#0a0a0f] px-5 py-3">
      {/* Note mode indicator */}
      {noteMode && (
        <div className="flex items-center gap-2 text-xs text-amber-400 mb-2 px-1">
          <StickyNote className="h-3.5 w-3.5" />
          Private note mode — not sent to client
        </div>
      )}

      <div className="flex items-center gap-3">
        <QuickReplyTemplates
          onSelect={(t) => onSendTemplate(t.type, t.name)}
          disabled={disabled}
        />

        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10', noteMode ? 'text-amber-400 bg-amber-900/20' : 'text-neutral-400 hover:text-amber-400')}
          onClick={() => setNoteMode(!noteMode)}
          disabled={disabled}
          title="Toggle private note mode"
        >
          <StickyNote className="h-4.5 w-4.5" />
        </Button>

        <input
          className="flex-1 bg-[#111] border border-[#2a2a3e] rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-emerald-700 transition-colors"
          placeholder={noteMode ? 'Type a private note...' : 'Select a template to send, or switch to note mode...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || !noteMode}
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-emerald-400 hover:text-emerald-300 disabled:text-neutral-600"
          onClick={handleSend}
          disabled={disabled || !text.trim() || !noteMode}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
