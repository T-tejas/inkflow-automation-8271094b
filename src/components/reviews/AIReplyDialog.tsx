import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Copy, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Review } from '@/hooks/useReviews';

interface Props {
  review: Review | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSaved?: () => void;
}

export function AIReplyDialog({ review, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const generate = async () => {
    if (!review) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-review', {
        body: {
          mode: 'reply',
          rating: review.rating,
          reviewText: review.final_review_text || review.review_text || '',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReply(data?.reply || '');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!review) return;
    await supabase.from('reviews').update({ admin_reply: reply } as any).eq('id', review.id);
    toast.success('Reply saved');
    onSaved?.();
    onOpenChange(false);
  };

  const sendWhatsApp = async () => {
    if (!review?.client_phone || !reply.trim()) { toast.error('Missing phone or reply'); return; }
    setSending(true);
    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: { phone: review.client_phone, leadName: review.client_name || 'Client', leadId: review.lead_id, messageBody: reply },
      });
      await supabase.from('reviews').update({ admin_reply: reply } as any).eq('id', review.id);
      toast.success('Reply sent via WhatsApp');
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-400" /> AI Reply Generator
          </DialogTitle>
        </DialogHeader>
        {review && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-lg p-3 text-sm">
              <p className="text-slate-400 text-xs mb-1">{review.client_name} · {review.rating}★</p>
              <p className="italic text-slate-200">"{review.final_review_text || review.review_text}"</p>
            </div>
            <Button onClick={generate} disabled={loading} variant="outline" className="w-full gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate AI Reply
            </Button>
            <Textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={4}
              placeholder="Click generate to draft a reply..."
              className="bg-slate-800 border-slate-700 text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(reply); toast.success('Copied'); }} disabled={!reply} className="flex-1 gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button onClick={save} disabled={!reply} className="flex-1 bg-slate-700 hover:bg-slate-600">Save</Button>
              <Button onClick={sendWhatsApp} disabled={!reply || sending || !review.client_phone} className="flex-1 bg-green-500 hover:bg-green-600 gap-1.5">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
