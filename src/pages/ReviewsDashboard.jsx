import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useReviews } from "@/hooks/useReviews";
import { ReviewAnalytics } from "@/components/reviews/ReviewAnalytics";
import { AIReplyDialog } from "@/components/reviews/AIReplyDialog";
import { ReviewTimeline } from "@/components/reviews/ReviewTimeline";
import { StarRating } from "@/components/reviews/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Search, Loader2, Settings as SettingsIcon, Send, Copy, QrCode, MessageSquareReply, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
function statusPill(r) {
  if (r.posted_to_google) return { label: "Posted on Google", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" };
  if (r.final_review_text) return { label: "Reviewed", cls: "bg-green-500/15 text-green-300 border-green-500/40" };
  if (r.rating) return { label: `Rated ${r.rating}\u2605 (no text)`, cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" };
  if (r.opened_at) return { label: "Opened", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" };
  if (r.review_sent_at) return { label: "Sent", cls: "bg-purple-500/15 text-purple-300 border-purple-500/40" };
  return { label: "Pending", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" };
}
function ReviewsDashboard() {
  const { reviews, loading, refetch } = useReviews({ realtimeToast: true });
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [postedFilter, setPostedFilter] = useState("all");
  const [artistFilter, setArtistFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [replyTarget, setReplyTarget] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deleteReview = async (r) => {
    setDeletingId(r.id);
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", r.id);
      if (error) throw error;
      toast.success("Review deleted");
      refetch();
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    } finally {
      setDeletingId(null);
    }
  };
  const artists = useMemo(() => Array.from(new Set(reviews.map((r) => r.artist_name).filter(Boolean))), [reviews]);
  const styles = useMemo(() => Array.from(new Set(reviews.map((r) => r.tattoo_style).filter(Boolean))), [reviews]);
  const sendWhatsApp = async (r) => {
    if (!r.client_phone) {
      toast.error("No phone number on this review");
      return;
    }
    const { data: settings } = await supabase.from("whatsapp_settings").select("setting_key,setting_value").in("setting_key", ["google_review_url", "google_business_name"]);
    const map = {};
    settings?.forEach((s) => {
      map[s.setting_key] = s.setting_value;
    });
    const businessName = map.google_business_name || "F19 Tattoo Studio";
    const link = map.google_review_url || `${window.location.origin}/review/${r.token}`;
    if (!map.google_review_url && !r.token) {
      toast.error("Set Google Review URL in Settings");
      return;
    }
    setSendingId(r.id);
    try {
      const msg = `Thank you for choosing *${businessName}* \u2764\uFE0F

If you enjoyed your experience, you can simply tap below and leave a quick review.

\u2B50 *What you can mention:*
\u2022 Tattoo quality & design
\u2022 Artist experience
\u2022 Studio hygiene
\u2022 Overall experience

\u{1F449} *Tap here to review:*
${link}

Your feedback helps us grow \u{1F64C}`;
      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone: r.client_phone, leadName: r.client_name || "Client", leadId: r.lead_id, messageBody: msg }
      });
      if (error) throw error;
      await supabase.from("reviews").update({ review_link: link, review_sent_at: (/* @__PURE__ */ new Date()).toISOString(), status: "sent" }).eq("id", r.id);
      toast.success("Review request sent on WhatsApp");
      refetch();
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSendingId(null);
    }
  };
  const copyLink = async (r) => {
    const { data: s } = await supabase.from("whatsapp_settings").select("setting_value").eq("setting_key", "google_review_url").maybeSingle();
    const link = s?.setting_value || (r.token ? `${window.location.origin}/review/${r.token}` : "");
    if (!link) {
      toast.error("No link available");
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Review link copied");
  };
  const downloadQr = async (r) => {
    const { data: s } = await supabase.from("whatsapp_settings").select("setting_value").eq("setting_key", "google_review_url").maybeSingle();
    const link = s?.setting_value || (r.token ? `${window.location.origin}/review/${r.token}` : "");
    if (!link) {
      toast.error("No link available");
      return;
    }
    const dataUrl = await QRCode.toDataURL(link, { width: 320, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `review-qr-${r.client_name || r.id}.png`;
    a.click();
    toast.success("QR downloaded");
  };
  const filtered = useMemo(() => {
    const now = Date.now();
    return reviews.filter((r) => {
      if (search && !`${r.client_name} ${r.artist_name} ${r.final_review_text || r.review_text || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (ratingFilter !== "all" && String(r.rating) !== ratingFilter) return false;
      if (postedFilter === "posted" && !r.posted_to_google) return false;
      if (postedFilter === "not-posted" && r.posted_to_google) return false;
      if (artistFilter !== "all" && r.artist_name !== artistFilter) return false;
      if (styleFilter !== "all" && r.tattoo_style !== styleFilter) return false;
      if (dateFilter !== "all") {
        const created = new Date(r.created_at).getTime();
        const days = { "7": 7, "30": 30, "90": 90 }[dateFilter] || 0;
        if (days && now - created > days * 864e5) return false;
      }
      return true;
    });
  }, [reviews, search, ratingFilter, postedFilter, artistFilter, styleFilter, dateFilter]);
  return <div className="min-h-[100dvh] bg-slate-950 text-slate-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {
    /* Header */
  }
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Reviews & Reputation</h1>
              <p className="text-[11px] sm:text-sm text-slate-400 truncate">Realtime · {reviews.length} total · {reviews.filter((r) => r.posted_to_google).length} on Google</p>
            </div>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5">
              <SettingsIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Google Review </span>Settings
            </Button>
          </Link>
        </div>

        <ReviewAnalytics reviews={reviews} />

        {
    /* Filters */
  }
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." className="pl-9 bg-slate-900 border-slate-700" />
          </div>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[130px] bg-slate-900 border-slate-700"><SelectValue placeholder="Rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stars</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={postedFilter} onValueChange={setPostedFilter}>
            <SelectTrigger className="w-[150px] bg-slate-900 border-slate-700"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="posted">Posted on Google</SelectItem>
              <SelectItem value="not-posted">Not posted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={artistFilter} onValueChange={setArtistFilter}>
            <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700"><SelectValue placeholder="Artist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All artists</SelectItem>
              {artists.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700"><SelectValue placeholder="Style" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All styles</SelectItem>
              {styles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[130px] bg-slate-900 border-slate-700"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {
    /* List */
  }
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-green-500" /></div> : filtered.length === 0 ? <div className="text-center py-20 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">No reviews match your filters.</div> : <div className="space-y-3">
            {filtered.map((r) => {
    const pill = statusPill(r);
    return <div
      key={r.id}
      className="group bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-200"
    >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{r.client_name || "Anonymous"}</p>
                        {r.artist_name && <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">Artist: {r.artist_name}</Badge>}
                        {r.tattoo_style && <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">{r.tattoo_style}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.rating ? <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2.5 py-1">
                          <StarRating value={r.rating} readOnly size={16} />
                          <span className="text-yellow-300 font-bold text-sm">{r.rating.toFixed(1)}</span>
                        </div> : null}
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold border", pill.cls)}>{pill.label}</span>
                      {(r.rating || 0) > 0 && (r.rating || 0) <= 3 && <Badge variant="destructive">Low rating</Badge>}
                    </div>
                  </div>

                  {(r.final_review_text || r.review_text) && <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/40 rounded-md p-3 mt-2 border border-slate-800">"{r.final_review_text || r.review_text}"</p>}

                  {r.admin_reply && <p className="text-xs text-slate-300 mt-2 pl-3 border-l-2 border-orange-500/50 bg-orange-500/5 py-1.5 pr-2 rounded-r">
                      <span className="text-orange-400 font-semibold">Studio reply:</span> {r.admin_reply}
                    </p>}

                  <ReviewTimeline r={r} />

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
      size="sm"
      onClick={() => sendWhatsApp(r)}
      disabled={sendingId === r.id || !r.client_phone}
      className="bg-green-500 hover:bg-green-600 text-white gap-1.5 shadow-md shadow-green-500/20"
    >
                      {sendingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Review
                    </Button>
                    {r.token && <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 shadow-md shadow-blue-500/20">
                        <a href={`/review/${r.token}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Open Link
                        </a>
                      </Button>}
                    <Button size="sm" onClick={() => copyLink(r)} className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5 shadow-md shadow-purple-500/20">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadQr(r)} className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5">
                      <QrCode className="h-3.5 w-3.5" /> QR
                    </Button>
                    <Button size="sm" onClick={() => setReplyTarget(r)} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 shadow-md shadow-orange-500/20 ml-auto">
                      <MessageSquareReply className="h-3.5 w-3.5" /> Reply
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" disabled={deletingId === r.id} className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 gap-1.5">
                          {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this review request?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This will permanently delete the review record for <span className="text-white font-medium">{r.client_name || "this client"}</span>. This helps avoid sending duplicate messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReview(r)} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>;
  })}
          </div>}
      </div>

      <AIReplyDialog review={replyTarget} open={!!replyTarget} onOpenChange={(o) => !o && setReplyTarget(null)} onSaved={refetch} />
    </div>;
}
export {
  ReviewsDashboard as default
};
