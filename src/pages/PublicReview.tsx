import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/reviews/StarRating';
import { ReviewSuggestionCard } from '@/components/reviews/ReviewSuggestionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ExternalLink, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { sendAdminAlert } from '@/lib/adminNotifications';

const TONES = [
  { key: 'professional', label: 'Professional' },
  { key: 'friendly', label: 'Friendly' },
  { key: 'short', label: 'Short' },
  { key: 'detailed', label: 'Detailed' },
  { key: 'emotional', label: 'Emotional' },
];

export default function PublicReview() {
  const { token } = useParams();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [tone, setTone] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [finalText, setFinalText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reviews').select('*').eq('token', token!).maybeSingle();
      setReview(data);
      const { data: s } = await supabase.from('whatsapp_settings').select('setting_value').eq('setting_key', 'google_review_url').maybeSingle();
      setGoogleUrl(s?.setting_value || 'https://g.page/r/');
      if (data?.status && data.status !== 'pending') setSubmitted(true);
      // Track first open
      if (data && !data.opened_at) {
        await supabase.from('reviews').update({ opened_at: new Date().toISOString(), status: data.status === 'pending' ? 'opened' : data.status } as any).eq('token', token!);
      }
      setLoading(false);
    })();
  }, [token]);

  const generate = async (newRating: number, newTone = tone) => {
    if (!review) return;
    setGenerating(true);
    setSelectedIdx(null);
    setFinalText('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-review', {
        body: {
          mode: 'suggestions',
          rating: newRating,
          tone: newTone,
          artist: review.artist_name,
          style: review.tattoo_style,
          placement: review.placement,
          studio: 'F19 Tattoo Studio',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: string[] = data?.reviews || [];
      setSuggestions(list);
      if (list[0]) { setSelectedIdx(0); setFinalText(list[0]); }
    } catch (e: any) {
      toast.error(`AI failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const onRate = (r: number) => {
    setRating(r);
    if (r <= 3) setShowRecovery(true);
    generate(r);
  };

  const onToneChange = (t: string) => {
    setTone(t);
    if (rating > 0) generate(rating, t);
  };

  const submit = async (postToGoogle = false) => {
    if (!finalText.trim() || !rating) { toast.error('Please write a review and select a rating'); return; }
    setSubmitting(true);
    try {
      await supabase.from('reviews').update({
        rating,
        review_text: finalText,
        final_review_text: finalText,
        generated_reviews: suggestions,
        tone,
        status: postToGoogle ? 'posted' : 'submitted',
        posted_to_google: postToGoogle,
        google_redirected_at: postToGoogle ? new Date().toISOString() : null,
      } as any).eq('token', token!);

      if (rating <= 3) {
        await sendAdminAlert({
          leadId: review.lead_id,
          leadName: review.client_name || 'Client',
          leadPhone: review.client_phone || '',
          notificationType: 'Low Rating Alert',
          message: `Client gave ${rating}★ rating. Please follow up.\n\nReview: "${finalText}"`,
        });
      }
      setSubmitted(true);
      if (postToGoogle && googleUrl) window.open(googleUrl, '_blank');
      toast.success('Thank you for your review!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;
  }
  if (!review) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Review link not found or expired.</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <div className="h-16 w-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <Heart className="h-8 w-8 text-green-500 fill-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Thank you!</h2>
          <p className="text-slate-300">Your feedback means the world to us at F19 Tattoo Studio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 items-center justify-center mb-4 shadow-lg shadow-green-500/30">
            <span className="text-2xl font-black text-white">F19</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">F19 Tattoo Studio</h1>
          <p className="text-slate-400 mt-1">Thank you for choosing us ❤️ Rate your experience</p>
        </div>

        {/* Main card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {review.client_name && (
            <p className="text-center text-sm text-slate-400">
              Hi <span className="text-white font-semibold">{review.client_name}</span>
              {review.artist_name && <> — your tattoo by <span className="text-green-400">{review.artist_name}</span></>}
            </p>
          )}

          {/* Stars */}
          <div className="flex justify-center py-4">
            <StarRating value={rating} onChange={onRate} size={44} />
          </div>

          {rating > 0 && (
            <>
              {/* Tone tabs */}
              <Tabs value={tone} onValueChange={onToneChange}>
                <TabsList className="bg-slate-900 border border-slate-700 w-full grid grid-cols-5 h-auto">
                  {TONES.map(t => (
                    <TabsTrigger key={t.key} value={t.key} className="text-[11px] sm:text-xs data-[state=active]:bg-green-500 data-[state=active]:text-white">
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  <span>AI-generated suggestions — tap to use</span>
                </div>
                {generating ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Crafting suggestions...
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    {suggestions.map((s, i) => (
                      <ReviewSuggestionCard
                        key={i}
                        text={s}
                        index={i}
                        selected={selectedIdx === i}
                        onSelect={() => { setSelectedIdx(i); setFinalText(s); }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Edit */}
              {!generating && suggestions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Your review (edit freely)</label>
                  <Textarea
                    value={finalText}
                    onChange={e => setFinalText(e.target.value)}
                    rows={4}
                    className="bg-slate-900/60 border-slate-700 text-slate-100 text-sm resize-none focus-visible:ring-green-500"
                  />
                </div>
              )}

              {/* Submit */}
              {finalText && (
                <div className="space-y-3 pt-2">
                  {rating === 5 ? (
                    <>
                      <p className="text-center text-sm text-slate-300">Ready to share your review with the world?</p>
                      <Button onClick={() => submit(true)} disabled={submitting} className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold gap-2 shadow-lg shadow-green-500/30">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Post on Google Reviews
                      </Button>
                      <Button onClick={() => submit(false)} variant="ghost" disabled={submitting} className="w-full text-slate-400 hover:text-white hover:bg-slate-700">
                        Skip — just save privately
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => submit(false)} disabled={submitting} className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold">
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Submit Review
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">Powered by F19 Tattoo Studio</p>
      </div>

      {/* Recovery popup */}
      {showRecovery && rating > 0 && rating <= 3 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">We're sorry 💚</h3>
            <p className="text-sm text-slate-300">We're sorry your experience wasn't perfect. Our team will reach out to make it right.</p>
            <Button onClick={() => setShowRecovery(false)} className="w-full bg-green-500 hover:bg-green-600">Okay, continue</Button>
          </div>
        </div>
      )}
    </div>
  );
}
