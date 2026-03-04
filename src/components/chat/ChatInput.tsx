import { useState, useRef, useCallback } from 'react';
import { Paperclip, Send, StickyNote, X, FileText } from 'lucide-react';
import { QuickReplyTemplates } from './QuickReplyTemplates';
import { EmojiPicker } from './EmojiPicker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onSendTemplate: (type: 'confirmation' | 'reminder' | 'promo', name: string) => void;
  onSendNote: (text: string) => void;
  onSendMessage: (text: string) => void;
  onSendAttachment: (url: string, fileName: string, isImage: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendTemplate, onSendNote, onSendMessage, onSendAttachment, disabled }: Props) {
  const [text, setText] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File; preview: string; isImage: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSend = async () => {
    // Handle attachment send
    if (attachment) {
      setUploading(true);
      try {
        const ext = attachment.file.name.split('.').pop();
        const path = `chat/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('f19').upload(path, attachment.file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('f19').getPublicUrl(path);
        onSendAttachment(urlData.publicUrl, attachment.file.name, attachment.isImage);
        setAttachment(null);
      } catch {
        // error handled by parent
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!text.trim()) return;
    if (noteMode) {
      onSendNote(text.trim());
    } else {
      onSendMessage(text.trim());
    }
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText(prev => prev + emoji);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + emoji.length;
      el.focus();
      autoResize();
    });
  };

  const handleTemplateSelect = (type: 'confirmation' | 'reminder' | 'promo', name: string, templateText: string) => {
    setText(templateText);
    setNoteMode(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResize();
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : '';
    setAttachment({ file, preview, isImage });
    e.target.value = '';
  };

  const canSend = attachment ? !uploading : text.trim().length > 0;

  return (
    <div style={{ backgroundColor: '#f0f2f5', borderTop: '1px solid #e9edef' }}>
      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#e9edef' }}>
          {attachment.isImage ? (
            <img src={attachment.preview} alt="" className="h-16 w-16 object-cover rounded-lg" />
          ) : (
            <div className="h-16 w-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#d9fdd3' }}>
              <FileText className="h-8 w-8" style={{ color: '#00a884' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#111b21' }}>{attachment.file.name}</p>
            <p className="text-xs" style={{ color: '#667781' }}>{(attachment.file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setAttachment(null)} className="p-1.5 rounded-full hover:bg-black/5">
            <X className="h-5 w-5" style={{ color: '#54656f' }} />
          </button>
        </div>
      )}

      {/* Note mode banner */}
      {noteMode && (
        <div className="flex items-center gap-2 text-xs px-4 py-1.5 font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          <StickyNote className="h-3.5 w-3.5" />
          Private note mode — not sent to client
          <button onClick={() => setNoteMode(false)} className="ml-auto text-[11px] underline">
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-2.5">
        <QuickReplyTemplates
          onSelect={(t) => handleTemplateSelect(t.type, t.name, t.text)}
          disabled={disabled}
        />

        <button
          className={cn('p-2 rounded-full transition-colors', noteMode ? 'bg-amber-100' : 'hover:bg-black/5')}
          onClick={() => setNoteMode(!noteMode)}
          disabled={disabled}
          title={noteMode ? 'Switch to message mode' : 'Switch to note mode'}
          style={{ color: noteMode ? '#92400e' : '#54656f' }}
        >
          <StickyNote className="h-5 w-5" />
        </button>

        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />

        <button
          className="p-2 rounded-full hover:bg-black/5 transition-colors"
          style={{ color: '#54656f' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 rotate-45" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
            style={{
              backgroundColor: '#ffffff',
              color: '#111b21',
              border: '1px solid #e9edef',
              minHeight: '40px',
              maxHeight: '120px',
            }}
            rows={1}
            placeholder={noteMode ? 'Type a private note...' : 'Type a message...'}
            value={text}
            onChange={(e) => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={disabled || !!attachment}
          />
        </div>

        <button
          className="p-2.5 rounded-full transition-colors disabled:opacity-40"
          onClick={handleSend}
          disabled={disabled || !canSend}
          style={{
            backgroundColor: canSend ? '#00a884' : 'transparent',
            color: canSend ? '#ffffff' : '#54656f',
          }}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
