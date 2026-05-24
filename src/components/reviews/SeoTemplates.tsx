import { useMemo, useState } from 'react';
import { ReviewSuggestionCard } from './ReviewSuggestionCard';
import { Button } from '@/components/ui/button';
import { Sparkles, Award, Brush, Layers, Heart, FileText, Star } from 'lucide-react';

interface Props {
  artist?: string | null;
  style?: string | null;
  placement?: string | null;
  studio?: string;
  onSelect: (text: string) => void;
  selectedText?: string;
}

const CATEGORIES = [
  { key: 'premium', label: 'Premium Experience', icon: Award },
  { key: 'realistic', label: 'Realistic Tattoo', icon: Star },
  { key: 'sleeve', label: 'Sleeve Tattoo', icon: Layers },
  { key: 'first', label: 'First Tattoo', icon: Sparkles },
  { key: 'emotional', label: 'Emotional', icon: Heart },
  { key: 'detailed', label: 'Detailed Long Review', icon: FileText },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];

function buildTemplates(cat: CatKey, ctx: { artist?: string | null; style?: string | null; placement?: string | null; studio: string; }): string[] {
  const a = ctx.artist || 'the artist';
  const s = ctx.studio;
  const sty = ctx.style ? ` ${ctx.style.toLowerCase()}` : '';
  const pl = ctx.placement ? ` on the ${ctx.placement.toLowerCase()}` : '';

  switch (cat) {
    case 'premium':
      return [
        `Absolutely premium experience at ${s}. The detailing, hygiene and professionalism were top class. ${a} understood exactly what I wanted and delivered way beyond expectations. Highly recommended for premium tattoo work in Pune.`,
        `One of the best tattoo studios in Pune. ${s} delivers a truly luxury experience — spotless hygiene, world-class equipment, and ${a}'s artistry is unmatched. Worth every rupee.`,
        `If you want a premium tattoo done right, ${s} is the only place to go. ${a} is incredibly skilled, patient, and detail-oriented. The studio feels more like an art gallery than a tattoo shop.`,
        `Outstanding premium service at ${s}. From consultation to aftercare, everything was handled professionally. ${a} created a flawless${sty} piece${pl} that I'll cherish forever.`,
        `Hands down the most premium tattoo studio in the city. ${s} combines sterile medical-grade hygiene with elite artistry. ${a} is a true master of the craft.`,
      ];
    case 'realistic':
      return [
        `Got a realistic${sty} tattoo${pl} from ${a} at ${s} and I'm completely blown away. The shading, depth and lifelike detail are unbelievable — looks like a photograph on skin.`,
        `${a} at ${s} is a realism genius. Every line, every shadow is perfect. People literally cannot believe it's a tattoo. Highest recommendation for anyone wanting realistic work in Pune.`,
        `If you want hyper-realistic tattoos, look no further than ${a} at ${s}. The portrait work is museum-quality. Insane attention to detail, perfect skin tones, flawless execution.`,
        `Realism done right. ${a} captured every fine detail in my${sty} tattoo${pl}. Crisp lines, smooth gradients, photo-real finish. ${s} is the realism capital of Pune.`,
        `Words can't describe how realistic the tattoo turned out. ${a} at ${s} is a true artist — patient, precise, and gifted. The result is jaw-dropping.`,
      ];
    case 'sleeve':
      return [
        `Got my full sleeve done at ${s} by ${a} and it's a masterpiece. The flow, composition and storytelling across the sleeve is brilliant. Multiple sittings, zero discomfort, perfect healing.`,
        `${a} planned my sleeve like a true artist — every element connects, the negative space breathes, and the overall design is stunning. ${s} is the best place in Pune for big sleeve projects.`,
        `Best decision ever to get my sleeve at ${s}. ${a} took time to design something completely custom and the result is unbelievable. Comfortable sittings, professional staff, amazing aftercare guidance.`,
        `Half-sleeve completed and I'm in love. ${a} understood my vision and made it 10x better. Smooth colour packing, clean linework, perfect cohesion. ${s} is sleeve heaven.`,
        `If you're planning a sleeve, trust ${a} at ${s}. The composition, perspective and detailing are world-class. Worth every long sitting.`,
      ];
    case 'first':
      return [
        `This was my first tattoo and ${a} at ${s} made it the most comfortable experience possible. Explained every step, super hygienic setup, and the final result is gorgeous. Highly recommend ${s} for first-timers!`,
        `As a nervous first-timer, I couldn't have chosen a better studio. ${s} is welcoming, calm and spotlessly clean. ${a} was patient, gentle and incredibly skilled. Pain was minimal!`,
        `First tattoo done and I'm obsessed. ${a} guided me through everything — placement, design, aftercare. ${s} truly cares about first-time clients. Will definitely come back for my next one.`,
        `${s} made my first tattoo unforgettable. ${a} was so reassuring and the studio vibe is amazing. The tattoo healed perfectly. 100% recommend for anyone getting inked for the first time in Pune.`,
        `Best first tattoo experience anyone could ask for. ${a} explained pain, healing, aftercare — everything. ${s} is super clean, professional and friendly. Already planning my second!`,
      ];
    case 'emotional':
      return [
        `This tattoo means everything to me and ${a} at ${s} brought it to life perfectly. They understood the emotion behind the design and treated it with so much care. Forever grateful.`,
        `Got a memorial tattoo at ${s} and ${a} was incredibly compassionate throughout. The piece is beautiful and meaningful. Thank you for honouring something so important to me.`,
        `${a} at ${s} doesn't just tattoo — they listen. My piece carries deep personal meaning and they captured it flawlessly. The whole experience was emotional and healing.`,
        `Words fall short. ${a} at ${s} created something that I'll carry on my skin and in my heart forever. So much respect and care went into every line.`,
        `A truly emotional and beautiful experience at ${s}. ${a} understood the story behind my tattoo and translated it into art. Thank you for the patience, talent and humanity.`,
      ];
    case 'detailed':
      return [
        `I want to take a moment to genuinely thank ${s} and especially ${a} for the incredible experience. From the very first consultation, everything was handled with utmost professionalism. The studio is spotlessly clean, equipment is medical-grade, and the entire team makes you feel at home. ${a} took time to truly understand what I wanted and even improved the design with suggestions I hadn't thought of. The actual session was smooth — minimal discomfort, frequent breaks, and constant check-ins. The final${sty} piece${pl} is absolutely flawless: crisp linework, perfect shading, beautiful composition. Healing was smooth thanks to detailed aftercare instructions. Honestly, ${s} is in a different league from any other tattoo studio I've visited in India. If you care about quality, hygiene and artistry, this is THE place. Highly recommended!`,
        `${s} deserves every star and more. I researched tattoo studios across Pune for months and finally chose them — best decision ever. The booking process was smooth, consultation was detailed, and ${a} was an absolute professional from start to finish. The studio environment is calm, clean and premium. They use top-quality inks and disposable needles for every client. My${sty} tattoo${pl} turned out exactly as I envisioned — actually better. Every detail was perfect: line weight, shading depth, ink saturation. Aftercare instructions were thorough and the healing was textbook perfect. ${s} sets the gold standard for tattoo artistry in Pune. Will absolutely return for my next piece.`,
        `Where do I even begin? ${s} is hands down the most professional tattoo studio in Pune. From the moment I walked in, the vibe was elite — clean, modern, welcoming. ${a} sat with me for over an hour discussing design, placement, size, healing — nothing rushed. During the session, they explained every step, offered breaks, and made sure I was comfortable throughout. The artistry is unreal — fine lines, smooth gradients, perfect proportions. My friends and family can't stop complimenting it. ${s} also offers excellent aftercare support and follow-up. They genuinely care about the long-term quality of their work. This place isn't just a tattoo shop — it's an art studio. Truly recommended for anyone serious about tattoos.`,
        `Detailed honest review: ${s} is exceptional. Booking was easy, the team is responsive on WhatsApp, and pricing is transparent. ${a}'s portfolio spoke for itself but the real experience was even better. The studio follows strict hygiene protocols — sealed needles, sterile gloves, single-use cartridges, disinfected stations. ${a} was patient with every question and offered honest professional input on design. The tattoo itself is a work of art — beautifully composed, technically flawless. Healing was smooth with zero issues. I've already recommended ${s} to multiple friends and they've all had equally amazing experiences. Best tattoo studio in Pune, period.`,
        `Long overdue review for ${s} — simply the best tattoo experience I've had. After several consultations elsewhere, I knew this was the studio for me. ${a}'s design skills are exceptional — they redesigned my concept to flow better with my body and the result is stunning. The studio is luxurious yet welcoming, hygiene is hospital-grade, and the whole team treats you like family. The tattoo session was surprisingly comfortable thanks to their technique and care. Aftercare was clearly explained and they're always available for follow-up questions. ${s} delivers premium service at honest pricing. If you're investing in body art, invest in the best — ${s} is it.`,
      ];
  }
}

export function SeoTemplates({ artist, style, placement, studio = 'F19 Tattoo Studio', onSelect, selectedText }: Props) {
  const [cat, setCat] = useState<CatKey>('premium');
  const templates = useMemo(() => buildTemplates(cat, { artist, style, placement, studio }), [cat, artist, style, placement, studio]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Sparkles className="h-4 w-4 text-green-400" />
        <span>Ready-made review templates — tap a category, then pick one</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => {
          const Icon = c.icon;
          const active = cat === c.key;
          return (
            <Button
              key={c.key}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setCat(c.key)}
              className={
                active
                  ? 'bg-green-500 hover:bg-green-600 text-white gap-1.5 border-green-500'
                  : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5'
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {c.label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-3 animate-fade-in">
        {templates.map((t, i) => (
          <ReviewSuggestionCard
            key={`${cat}-${i}`}
            text={t}
            index={i}
            selected={selectedText === t}
            onSelect={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}
