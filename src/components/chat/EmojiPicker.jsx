import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { useState } from "react";
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["\u{1F600}", "\u{1F602}", "\u{1F979}", "\u{1F60A}", "\u{1F60D}", "\u{1F929}", "\u{1F618}", "\u{1F60E}", "\u{1F914}", "\u{1F60F}", "\u{1F622}", "\u{1F62D}", "\u{1F624}", "\u{1F97A}", "\u{1F631}", "\u{1F917}", "\u{1F64F}", "\u{1F44B}", "\u{1F44D}", "\u{1F44E}", "\u270C\uFE0F", "\u{1F91E}", "\u{1F4AA}", "\u2764\uFE0F", "\u{1F525}", "\u2B50", "\u2705", "\u274C", "\u{1F4AF}", "\u{1F389}"]
  },
  {
    name: "Objects",
    emojis: ["\u{1F4CB}", "\u{1F4CC}", "\u{1F4CE}", "\u2702\uFE0F", "\u{1F4DD}", "\u{1F4BC}", "\u{1F4F1}", "\u{1F4BB}", "\u{1F5BC}\uFE0F", "\u{1F4F7}", "\u{1F3A8}", "\u270F\uFE0F", "\u{1F4B0}", "\u{1F4B3}", "\u{1F3F7}\uFE0F", "\u{1F4C5}", "\u23F0", "\u{1F514}", "\u{1F4E2}", "\u{1F4A1}", "\u{1F512}", "\u{1F511}", "\u26A1", "\u{1F3AF}", "\u{1F3C6}", "\u{1F381}", "\u{1F48E}", "\u{1FA79}", "\u{1F489}", "\u{1FA84}"]
  },
  {
    name: "Symbols",
    emojis: ["\u27A1\uFE0F", "\u2B05\uFE0F", "\u2B06\uFE0F", "\u2B07\uFE0F", "\u21A9\uFE0F", "\u{1F504}", "\u2139\uFE0F", "\u2753", "\u2757", "\u26A0\uFE0F", "\u{1F6AB}", "\u{1F197}", "\u{1F195}", "\u{1F534}", "\u{1F7E2}", "\u{1F535}", "\u{1F7E1}", "\u26AA", "\u2B1B", "\u{1F4AC}", "\u{1F4AD}", "\u{1F441}\uFE0F", "\u{1FAF6}", "\u{1F91D}", "\u{1FAE1}", "\u{1F636}", "\u{1FAE0}", "\u{1F90C}", "\u{1F9FF}", "\u{1FAAC}"]
  }
];
function EmojiPicker({ onEmojiSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
    className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40"
    disabled={disabled}
    style={{ color: "#54656f" }}
  >
          <Smile className="h-6 w-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent
    className="w-[320px] p-0 rounded-lg shadow-xl border"
    style={{ backgroundColor: "#ffffff", borderColor: "#e9edef" }}
    side="top"
    align="center"
  >
        {
    /* Category tabs */
  }
        <div className="flex border-b" style={{ borderColor: "#e9edef" }}>
          {EMOJI_CATEGORIES.map((cat, i) => <button
    key={cat.name}
    className="flex-1 py-2 text-[11px] font-medium transition-colors"
    style={{
      color: activeTab === i ? "#00a884" : "#8696a0",
      borderBottom: activeTab === i ? "2px solid #00a884" : "2px solid transparent"
    }}
    onClick={() => setActiveTab(i)}
  >
              {cat.name}
            </button>)}
        </div>
        {
    /* Emoji grid */
  }
        <div className="p-2 grid grid-cols-10 gap-0.5 max-h-[200px] overflow-y-auto">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => <button
    key={emoji}
    className="w-7 h-7 flex items-center justify-center text-lg hover:bg-black/5 rounded transition-colors"
    onClick={() => {
      onEmojiSelect(emoji);
      setOpen(false);
    }}
  >
              {emoji}
            </button>)}
        </div>
      </PopoverContent>
    </Popover>;
}
export {
  EmojiPicker
};
