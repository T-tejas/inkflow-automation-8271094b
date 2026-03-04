import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap } from 'lucide-react';
import { useState } from 'react';

interface Template {
  label: string;
  type: 'confirmation' | 'reminder' | 'promo';
  name: string;
  description: string;
}

const TEMPLATES: Template[] = [
  { label: '✅ Booking Confirmation', type: 'confirmation', name: 'booking_confirmation', description: 'Confirm their tattoo appointment' },
  { label: '💰 Deposit Request', type: 'promo', name: 'promo_offer', description: 'Request deposit payment' },
  { label: '⏰ Appointment Reminder', type: 'reminder', name: 'appointment_reminder', description: 'Remind about upcoming session' },
  { label: '🩹 Aftercare Instructions', type: 'promo', name: 'promo_offer', description: 'Send aftercare tips' },
];

interface Props {
  onSelect: (template: Template) => void;
  disabled?: boolean;
}

export function QuickReplyTemplates({ onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-emerald-400" disabled={disabled}>
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1 bg-[#111] border-[#333]" side="top" align="start">
        <div className="text-[10px] text-neutral-500 px-3 py-1.5 uppercase tracking-wider font-semibold">Quick Templates</div>
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            className="w-full text-left px-3 py-2 hover:bg-[#1a1a2e] rounded text-sm transition-colors"
            onClick={() => { onSelect(t); setOpen(false); }}
          >
            <span className="text-neutral-200">{t.label}</span>
            <span className="block text-[11px] text-neutral-500">{t.description}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
