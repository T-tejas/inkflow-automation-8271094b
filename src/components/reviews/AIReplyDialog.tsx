import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Copy, Send, MessageSquareReply } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Review } from '@/hooks/useReviews';

interface Props {
  review: Review | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSaved?: () => void;
}

const QUICK_REPLIES = (name: string, studio = 'F19 Tattoo Studio') => [
  {
    label: 'Thank you (5★)',
    text: `Thank you so much ${name}! 💚 We are absolutely thrilled you loved your tattoo experience at ${studio}. Your kind words inspire our entire team. Looking forward to your next piece!`,
  },
  {
    label: 'Heartfelt thanks',
    text: `${name}, thank you for trusting ${studio} with something so personal. Reviews like yours mean the world to our artists. Wear it with pride and stay in touch! ❤️`,
  },
  {
    label: 'Apology (low rating)',
    text: `Hi ${name}, we're truly sorry your experience wasn't up to ${studio}'s standard. Our owner would personally like to make this right. We'll reach out on WhatsApp within the hour.`,
  },
  {
    label: 'Invite back',
    text: `Thank you ${name}! We'd love to see you again at ${studio} — your next session gets a small loyalty discount. Drop us a message anytime to plan it.`,
  },
];

export function AIReplyDialog({ review, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (open) setReply(review?.admin_reply || ''); }, [open, review]);

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
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareReply className="h-4 w-4 text-orange-400" /> Reply to Review
          </DialogTitle>
        </DialogHeader>
        {review && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-lg p-3 text-sm border border-slate-700/60">
              <p className="text-slate-400 text-xs mb-1">{review.client_name} · {review.rating}★</p>
              <p className="italic text-slate-200">"{review.final_review_text || review.review_text || '—'}"</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Quick replies</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_REPLIES(review.client_name || 'there').map(q => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setReply(q.text)}
                    className="text-left text-xs bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-lg p-2.5 text-slate-300 transition-colors"
                  >
                    <span className="block text-purple-400 font-semibold mb-1">{q.label}</span>
                    <span className="line-clamp-2 text-slate-400">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={generate} disabled={loading} variant="outline" className="w-full gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate AI Reply
            </Button>

            <Textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={5}
              placeholder="Pick a quick reply, generate one with AI, or write manually..."
              className="bg-slate-800 border-slate-700 text-sm focus-visible:ring-orange-500"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(reply); toast.success('Copied'); }} disabled={!reply} className="flex-1 gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/10">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button onClick={save} disabled={!reply} className="flex-1 bg-slate-700 hover:bg-slate-600">Save</Button>
              <Button onClick={sendWhatsApp} disabled={!reply || sending || !review.client_phone} className="flex-1 bg-orange-500 hover:bg-orange-600 gap-1.5 text-white">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
