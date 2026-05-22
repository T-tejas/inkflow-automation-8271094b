import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

export function ReviewSuggestionCard({ text, index, selected, onSelect }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      onClick={onSelect}
      className={cn(
        'p-4 cursor-pointer transition-all duration-300 bg-slate-800/60 border-slate-700 hover:border-green-500/60 hover:bg-slate-800',
        selected && 'border-green-500 ring-2 ring-green-500/30 bg-slate-800',
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="text-xs text-green-400 font-semibold mb-2">Suggestion {index + 1}</p>
          <p className="text-sm text-slate-100 leading-relaxed">{text}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={copy} className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-slate-700">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
