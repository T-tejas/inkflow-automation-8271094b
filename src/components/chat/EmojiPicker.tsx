import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { useState } from 'react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀','😂','🥹','😊','😍','🤩','😘','😎','🤔','😏','😢','😭','😤','🥺','😱','🤗','🙏','👋','👍','👎','✌️','🤞','💪','❤️','🔥','⭐','✅','❌','💯','🎉'],
  },
  {
    name: 'Objects',
    emojis: ['📋','📌','📎','✂️','📝','💼','📱','💻','🖼️','📷','🎨','✏️','💰','💳','🏷️','📅','⏰','🔔','📢','💡','🔒','🔑','⚡','🎯','🏆','🎁','💎','🩹','💉','🪄'],
  },
  {
    name: 'Symbols',
    emojis: ['➡️','⬅️','⬆️','⬇️','↩️','🔄','ℹ️','❓','❗','⚠️','🚫','🆗','🆕','🔴','🟢','🔵','🟡','⚪','⬛','💬','💭','👁️','🫶','🤝','🫡','😶','🫠','🤌','🧿','🪬'],
  },
];

interface Props {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onEmojiSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40"
          disabled={disabled}
          style={{ color: '#54656f' }}
        >
          <Smile className="h-6 w-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 rounded-lg shadow-xl border"
        style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}
        side="top"
        align="center"
      >
        {/* Category tabs */}
        <div className="flex border-b" style={{ borderColor: '#e9edef' }}>
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              className="flex-1 py-2 text-[11px] font-medium transition-colors"
              style={{
                color: activeTab === i ? '#00a884' : '#8696a0',
                borderBottom: activeTab === i ? '2px solid #00a884' : '2px solid transparent',
              }}
              onClick={() => setActiveTab(i)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <div className="p-2 grid grid-cols-10 gap-0.5 max-h-[200px] overflow-y-auto">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
            <button
              key={emoji}
              className="w-7 h-7 flex items-center justify-center text-lg hover:bg-black/5 rounded transition-colors"
              onClick={() => {
                onEmojiSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
