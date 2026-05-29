import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Eye, Send, MessageCircle } from 'lucide-react';
import { MessageTemplate } from '@/hooks/useMessageTemplates';

interface Props {
  template: MessageTemplate;
  onPreview: () => void;
  onUse: () => void;
  onTest: () => void;
  onToggleFavorite: () => void;
  analytics?: { sent: number; readRate: number; replyRate: number };
}

const statusColor = (s: string) => s === 'approved' ? 'bg-green-100 text-green-700 border-green-300'
  : s === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
  : 'bg-red-100 text-red-700 border-red-300';

const categoryColor = (c: string) => c === 'marketing' ? 'bg-purple-100 text-purple-700 border-purple-300'
  : c === 'authentication' ? 'bg-blue-100 text-blue-700 border-blue-300'
  : 'bg-emerald-100 text-emerald-700 border-emerald-300';

export function TemplateCard({ template: t, onPreview, onUse, onTest, onToggleFavorite, analytics }: Props) {
  const snippet = t.body_text.replace(/\*/g, '').slice(0, 130);
  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow border-l-4 border-l-[#25d366]/70">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-semibold text-sm capitalize truncate">{t.name.replace(/_/g, ' ')}</h3>
            <Badge variant="outline" className={`text-[10px] uppercase ${categoryColor(t.category)}`}>{t.category}</Badge>
            <Badge variant="outline" className={`text-[10px] uppercase ${statusColor(t.status)}`}>{t.status}</Badge>
            {t.source === 'meta' && <Badge variant="outline" className="text-[10px]">Meta</Badge>}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{snippet}{t.body_text.length > 130 ? '…' : ''}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggleFavorite}>
          <Star className={`h-4 w-4 ${t.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </Button>
      </div>

      {t.variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.variables.map(v => (
            <Badge key={v} variant="secondary" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
          ))}
        </div>
      )}

      {analytics && analytics.sent > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t pt-2">
          <span>📤 {analytics.sent} sent</span>
          <span>👁 {analytics.readRate.toFixed(0)}% read</span>
          <span>💬 {analytics.replyRate.toFixed(0)}% reply</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button size="sm" variant="outline" onClick={onPreview} className="h-8 text-xs gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</Button>
        <Button size="sm" variant="outline" onClick={onTest} className="h-8 text-xs gap-1.5"><Send className="h-3.5 w-3.5" /> Send Test</Button>
        <Button size="sm" onClick={onUse} className="h-8 text-xs gap-1.5 bg-[#25d366] hover:bg-[#1ebe57] text-white ml-auto"><MessageCircle className="h-3.5 w-3.5" /> Use Template</Button>
      </div>
    </Card>
  );
}
