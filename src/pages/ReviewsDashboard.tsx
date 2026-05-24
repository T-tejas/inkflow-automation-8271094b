import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReviews, Review } from '@/hooks/useReviews';
import { ReviewAnalytics } from '@/components/reviews/ReviewAnalytics';
import { AIReplyDialog } from '@/components/reviews/AIReplyDialog';
import { StarRating } from '@/components/reviews/StarRating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, ExternalLink, Search, Loader2, Settings as SettingsIcon, Send, Copy, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QRCode from 'qrcode';

export default function ReviewsDashboard() {
  const { reviews, loading, refetch } = useReviews({ realtimeToast: true });
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [postedFilter, setPostedFilter] = useState('all');
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendWhatsApp = async (r: Review) => {
    if (!r.client_phone) { toast.error('No phone number on this review'); return; }
    const { data: settings } = await supabase.from('whatsapp_settings').select('setting_key,setting_value')
      .in('setting_key', ['google_review_url', 'google_business_name']);
    const map: Record<string, string> = {};
    settings?.forEach((s: any) => { map[s.setting_key] = s.setting_value; });
    const businessName = map.google_business_name || 'F19 Tattoo Studio';
    const link = map.google_review_url || `${window.location.origin}/review/${r.token}`;
    if (!map.google_review_url && !r.token) { toast.error('Set Google Review URL in Settings'); return; }
    setSendingId(r.id);
    try {
      const msg = `Thank you for choosing *${businessName}* ❤️\n\nIf you enjoyed your experience, you can simply tap below and leave a quick review.\n\n⭐ *What you can mention:*\n• Tattoo quality & design\n• Artist experience\n• Studio hygiene\n• Overall experience\n\n👉 *Tap here to review:*\n${link}\n\nYour feedback helps us grow 🙌`;
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone: r.client_phone, leadName: r.client_name || 'Client', leadId: r.lead_id, messageBody: msg },
      });
      if (error) throw error;
      await supabase.from('reviews').update({ review_link: link, review_sent_at: new Date().toISOString(), status: 'sent' } as any).eq('id', r.id);
      toast.success('Review request sent on WhatsApp');
      refetch();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSendingId(null);
    }
  };

  const copyLink = async (r: Review) => {
    const { data: s } = await supabase.from('whatsapp_settings').select('setting_value').eq('setting_key', 'google_review_url').maybeSingle();
    const link = (s?.setting_value as string) || (r.token ? `${window.location.origin}/review/${r.token}` : '');
    if (!link) { toast.error('No link available'); return; }
    await navigator.clipboard.writeText(link);
    toast.success('Review link copied');
  };

  const downloadQr = async (r: Review) => {
    const { data: s } = await supabase.from('whatsapp_settings').select('setting_value').eq('setting_key', 'google_review_url').maybeSingle();
    const link = (s?.setting_value as string) || (r.token ? `${window.location.origin}/review/${r.token}` : '');
    if (!link) { toast.error('No link available'); return; }
    const dataUrl = await QRCode.toDataURL(link, { width: 320, margin: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `review-qr-${r.client_name || r.id}.png`;
    a.click();
    toast.success('QR downloaded');
  };

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      if (search && !(`${r.client_name} ${r.artist_name} ${r.final_review_text || r.review_text || ''}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (ratingFilter !== 'all' && String(r.rating) !== ratingFilter) return false;
      if (postedFilter === 'posted' && !r.posted_to_google) return false;
      if (postedFilter === 'not-posted' && r.posted_to_google) return false;
      return true;
    });
  }, [reviews, search, ratingFilter, postedFilter]);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Reviews & Reputation</h1>
              <p className="text-[11px] sm:text-sm text-slate-400 truncate">AI-powered review collection · {reviews.length} total</p>
            </div>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5">
              <SettingsIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Google Review </span>Settings
            </Button>
          </Link>
        </div>

        <ReviewAnalytics reviews={reviews} />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." className="pl-9 bg-slate-900 border-slate-700" />
          </div>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
              <SelectItem value="4">4 stars</SelectItem>
              <SelectItem value="3">3 stars</SelectItem>
              <SelectItem value="2">2 stars</SelectItem>
              <SelectItem value="1">1 star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={postedFilter} onValueChange={setPostedFilter}>
            <SelectTrigger className="w-[160px] bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="posted">Posted on Google</SelectItem>
              <SelectItem value="not-posted">Not posted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-green-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">No reviews yet. Complete a tattoo to send your first review request.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{r.client_name || 'Anonymous'}</p>
                      {r.artist_name && <Badge variant="outline" className="border-slate-700 text-slate-300">Artist: {r.artist_name}</Badge>}
                      {r.tattoo_style && <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">{r.tattoo_style}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.rating ? <StarRating value={r.rating} readOnly size={16} /> : <Badge variant="outline" className="border-amber-500/40 text-amber-400">Pending</Badge>}
                    {r.posted_to_google && <Badge className="bg-green-500/15 text-green-400 border-green-500/30 gap-1"><ExternalLink className="h-3 w-3" /> Posted</Badge>}
                    {(r.rating || 0) > 0 && (r.rating || 0) <= 3 && <Badge variant="destructive">Low rating</Badge>}
                  </div>
                </div>
                {(r.final_review_text || r.review_text) && (
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/40 rounded-md p-3 mt-2">"{r.final_review_text || r.review_text}"</p>
                )}
                {r.admin_reply && (
                  <p className="text-xs text-slate-400 mt-2 pl-3 border-l-2 border-green-500/40">Reply: {r.admin_reply}</p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => sendWhatsApp(r)}
                    disabled={sendingId === r.id || !r.client_phone}
                    className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
                  >
                    {sendingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send Review
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(r)} className="border-slate-700 text-slate-200 gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadQr(r)} className="border-slate-700 text-slate-200 gap-1.5">
                    <QrCode className="h-3.5 w-3.5" /> QR
                  </Button>
                  {r.token && (
                    <Button asChild variant="outline" size="sm" className="border-slate-700 text-slate-300">
                      <a href={`/review/${r.token}`} target="_blank" rel="noreferrer">Open link</a>
                    </Button>
                  )}
                  {(r.final_review_text || r.review_text) && (
                    <Button size="sm" onClick={() => setReplyTarget(r)} className="bg-blue-500 hover:bg-blue-600 gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> AI Reply
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AIReplyDialog review={replyTarget} open={!!replyTarget} onOpenChange={o => !o && setReplyTarget(null)} onSaved={refetch} />
    </div>
  );
}
