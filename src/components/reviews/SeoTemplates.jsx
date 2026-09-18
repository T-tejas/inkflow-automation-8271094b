import { useMemo, useState } from "react";
import { ReviewSuggestionCard } from "./ReviewSuggestionCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Award, Layers, Heart, FileText, Star, Minimize2 } from "lucide-react";
const CATEGORIES = [
  { key: "premium", label: "Premium Experience", icon: Award },
  { key: "realistic", label: "Realism Tattoo", icon: Star },
  { key: "sleeve", label: "Sleeve Tattoo", icon: Layers },
  { key: "first", label: "First Tattoo", icon: Sparkles },
  { key: "emotional", label: "Emotional Story", icon: Heart },
  { key: "minimal", label: "Minimal Tattoo", icon: Minimize2 },
  { key: "detailed", label: "Detailed Long", icon: FileText }
];
function fullSet(cat, ctx) {
  const a = ctx.artist || "the artist";
  const s = ctx.studio;
  const sty = ctx.style ? ` ${ctx.style.toLowerCase()}` : "";
  const pl = ctx.placement ? ` on the ${ctx.placement.toLowerCase()}` : "";
  switch (cat) {
    case "premium":
      return [
        `Premium experience at ${s}. Loved it!`,
        `Absolutely premium experience at ${s}. The detailing, hygiene and professionalism were top class. ${a} understood exactly what I wanted and delivered way beyond expectations. Highly recommended for premium tattoo work in Pune.`,
        `One of the best tattoo studios in Pune. ${s} delivers a truly luxury experience \u2014 spotless hygiene, world-class equipment, and ${a}'s artistry is unmatched. Worth every rupee. Highly recommended for premium${sty} work${pl}.`,
        `If you want a premium tattoo done right, ${s} is the only place to go. ${a} is incredibly skilled, patient, and detail-oriented. The studio feels more like an art gallery than a tattoo shop. From consultation to aftercare everything was handled with class. My${sty} piece${pl} healed beautifully and looks flawless.`
      ];
    case "realistic":
      return [
        `Hyper-realistic work by ${a} at ${s}. Stunning!`,
        `Got a realistic${sty} tattoo${pl} from ${a} at ${s} and I'm completely blown away. The shading and depth are unbelievable.`,
        `${a} at ${s} is a realism genius. Every line, every shadow is perfect on my${sty} tattoo${pl}. People literally cannot believe it's a tattoo. Highest recommendation for anyone wanting realistic work in Pune.`,
        `If you want hyper-realistic tattoos in Pune, look no further than ${a} at ${s}. The portrait work is museum-quality. Insane attention to detail, perfect skin tones, flawless execution and zero issues during healing. ${s} is the realism capital of the city.`
      ];
    case "sleeve":
      return [
        `Loved my sleeve done at ${s} by ${a}.`,
        `Got my full sleeve done at ${s} by ${a} and it's a masterpiece. The flow and composition are brilliant.`,
        `${a} planned my sleeve like a true artist \u2014 every element connects, the negative space breathes, and the overall design is stunning. ${s} is the best place in Pune for big sleeve projects.`,
        `If you're planning a sleeve, trust ${a} at ${s}. The composition, perspective and detailing are world-class. Multiple long sittings handled comfortably, perfect colour packing, clean linework and amazing aftercare guidance. Worth every rupee.`
      ];
    case "first":
      return [
        `Great first tattoo experience at ${s} with ${a}.`,
        `This was my first tattoo and ${a} at ${s} made it super comfortable. Spotless studio, gentle hands, beautiful result.`,
        `As a nervous first-timer, I couldn't have chosen a better studio. ${s} is welcoming, calm and spotlessly clean. ${a} was patient, gentle and incredibly skilled. Pain was minimal and aftercare was clearly explained!`,
        `Best first tattoo experience anyone could ask for. ${a} explained pain, healing and aftercare \u2014 everything. ${s} is super clean, professional and friendly. My${sty} piece${pl} healed perfectly. Already planning my second tattoo here!`
      ];
    case "emotional":
      return [
        `Meaningful tattoo done with so much care at ${s}. Thank you ${a}!`,
        `This tattoo means everything to me and ${a} at ${s} brought it to life perfectly with so much care. Forever grateful.`,
        `${a} at ${s} doesn't just tattoo \u2014 they listen. My piece carries deep personal meaning and they captured it flawlessly. The whole experience was emotional and healing.`,
        `Words fall short. ${a} at ${s} created something I'll carry on my skin and in my heart forever. So much respect and care went into every line of my${sty} tattoo${pl}. Thank you for the patience, talent and humanity.`
      ];
    case "minimal":
      return [
        `Clean minimal tattoo by ${a} at ${s}. Perfect lines!`,
        `Got a minimal${sty} tattoo${pl} from ${a} at ${s} \u2014 flawless thin lines, perfect placement, healed beautifully.`,
        `${a} at ${s} nailed my minimal design. Crisp single-line work, no blowouts, perfect proportion. If you want subtle elegant tattoos in Pune, this is the studio.`,
        `For clean minimal tattoos there's no one better than ${a} at ${s}. The line weight is exact, placement is thoughtful, and the studio is spotless. Small tattoo, huge impression. Will definitely return for more pieces.`
      ];
    case "detailed":
      return [
        `Detailed, professional, premium \u2014 ${s} is the best in Pune.`,
        `${s} deserves every star. ${a} delivered exactly what I wanted on my${sty} tattoo${pl}. Clean hygiene, premium experience, perfect healing.`,
        `I want to thank ${s} and especially ${a}. From consultation to aftercare, everything was handled professionally. Spotless studio, medical-grade equipment, and ${a}'s artistry is unreal. My${sty} piece${pl} healed flawlessly.`,
        `I want to take a moment to genuinely thank ${s} and especially ${a} for the incredible experience. From the very first consultation, everything was handled with utmost professionalism. The studio is spotlessly clean, equipment is medical-grade, and the entire team makes you feel at home. ${a} took time to truly understand what I wanted and even improved the design with suggestions I hadn't thought of. The actual session was smooth \u2014 minimal discomfort, frequent breaks, and constant check-ins. The final${sty} piece${pl} is absolutely flawless: crisp linework, perfect shading, beautiful composition. Healing was smooth thanks to detailed aftercare instructions. ${s} is in a different league from any other tattoo studio in India. Highly recommended!`
      ];
  }
}
function pickByLength(items, len) {
  if (len === "short") return items.filter((t) => t.length <= 90);
  if (len === "medium") return items.filter((t) => t.length > 90 && t.length <= 260);
  return items.filter((t) => t.length > 260);
}
function SeoTemplates({ artist, style, placement, studio = "F19 Tattoo Studio", onSelect, selectedText }) {
  const [cat, setCat] = useState("premium");
  const [len, setLen] = useState("medium");
  const templates = useMemo(() => {
    const all = fullSet(cat, { artist, style, placement, studio });
    const filtered = pickByLength(all, len);
    return filtered.length ? filtered : all;
  }, [cat, len, artist, style, placement, studio]);
  return <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Sparkles className="h-4 w-4 text-green-400" />
        <span>Ready-made review templates — pick category & length</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
    const Icon = c.icon;
    const active = cat === c.key;
    return <Button
      key={c.key}
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={() => setCat(c.key)}
      className={active ? "bg-green-500 hover:bg-green-600 text-white gap-1.5 border-green-500" : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"}
    >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </Button>;
  })}
      </div>

      <div className="flex flex-wrap gap-2">
        {["short", "medium", "long"].map((l) => {
    const active = len === l;
    return <Button
      key={l}
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={() => setLen(l)}
      className={active ? "bg-purple-500 hover:bg-purple-600 text-white border-purple-500 capitalize" : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white capitalize"}
    >
              {l} {l === "long" && "(SEO)"}
            </Button>;
  })}
      </div>

      <div className="space-y-3 animate-fade-in">
        {templates.map((t, i) => <ReviewSuggestionCard
    key={`${cat}-${len}-${i}`}
    text={t}
    index={i}
    selected={selectedText === t}
    onSelect={() => onSelect(t)}
  />)}
      </div>
    </div>;
}
export {
  SeoTemplates
};
