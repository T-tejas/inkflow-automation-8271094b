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
        <button
          className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40"
          disabled={disabled}
          style={{ color: '#54656f' }}
        >
          <Zap className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-1 rounded-lg shadow-xl border"
        style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}
        side="top"
        align="start"
      >
        <div className="text-[11px] px-3 py-2 uppercase tracking-wider font-semibold" style={{ color: '#8696a0' }}>
          Quick Templates
        </div>
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded text-sm transition-colors"
            onClick={() => { onSelect(t); setOpen(false); }}
          >
            <span style={{ color: '#111b21' }}>{t.label}</span>
            <span className="block text-[11px] mt-0.5" style={{ color: '#667781' }}>{t.description}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
