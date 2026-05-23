import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, QrCode, Copy, Download, Printer, Loader2, Star, CheckCircle2 } from 'lucide-react';
import { logSystemError, logSystemInfo } from '@/lib/systemLogger';

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistName?: string;
  /** Optional existing review row id; if absent, dialog creates one */
  reviewId?: string | null;
  reviewToken?: string | null;
}

export function ReviewRequestDialog({ lead, open, onOpenChange, artistName, reviewId, reviewToken }: Props) {
  const [googleUrl, setGoogleUrl] = useState('');
  const [businessName, setBusinessName] = useState('F19 Tattoo Studio');
  const [internalToken, setInternalToken] = useState<string | null>(reviewToken || null);
  const [internalReviewId, setInternalReviewId] = useState<string | null>(reviewId || null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from('whatsapp_settings').select('setting_key,setting_value')
        .in('setting_key', ['google_review_url', 'google_business_name']);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.setting_key] = s.setting_value; });
      setGoogleUrl(map.google_review_url || '');
      if (map.google_business_name) setBusinessName(map.google_business_name);

      // Ensure a review row exists for this lead
      if (lead && !internalReviewId) {
        const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        const { data: row } = await supabase.from('reviews').insert({
          lead_id: lead.id,
          source: 'whatsapp',
          status: 'pending',
          token,
          client_name: lead.fullName,
          client_phone: lead.phone,
          artist_name: artistName || null,
          tattoo_style: lead.tattooStyle || null,
          placement: lead.placement || null,
        } as any).select('id, token').maybeSingle();
        if (row) {
          setInternalReviewId(row.id);
          setInternalToken(row.token);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  const reviewLink = internalToken ? `${window.location.origin}/review/${internalToken}` : '';
  const linkForQr = googleUrl || reviewLink;

  const generateQr = async () => {
    if (!linkForQr) { toast.error('No review URL available'); return; }
    try {
      const dataUrl = await QRCode.toDataURL(linkForQr, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
      setShowQr(true);
      if (internalReviewId) {
        await supabase.from('reviews').update({
          qr_code_url: dataUrl,
          qr_generated_at: new Date().toISOString(),
          review_link: linkForQr,
        } as any).eq('id', internalReviewId);
      }
      await logSystemInfo('review', `QR generated for ${lead?.fullName}`, { link: linkForQr }, lead?.id);
    } catch (e: any) {
      await logSystemError('review', `QR generation failed: ${e.message}`, {}, lead?.id);
      toast.error('QR generation failed');
    }
  };

  const copyLink = async () => {
    const url = googleUrl || reviewLink;
    if (!url) { toast.error('No link to copy'); return; }
    await navigator.clipboard.writeText(url);
    toast.success('Review link copied');
  };

  const sendWhatsApp = async () => {
    if (!lead?.phone) { toast.error('No phone number'); return; }
    if (!googleUrl && !reviewLink) { toast.error('Set Google Review URL in Settings'); return; }
    setSending(true);
    try {
      const link = googleUrl || reviewLink;
      const msg = `Thank you for choosing *${businessName}* ❤️\n\nWe hope you loved your tattoo experience.\n\nPlease leave us a review here:\n${link}\n\nYour support means a lot 🙌`;
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone: lead.phone, leadName: lead.fullName, leadId: lead.id, messageBody: msg },
      });
      if (error) throw error;
      if (internalReviewId) {
        await supabase.from('reviews').update({
          review_link: link,
          review_sent_at: new Date().toISOString(),
          status: 'sent',
        } as any).eq('id', internalReviewId);
      }
      await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() } as any).eq('id', lead.id);
      setSent(true);
      toast.success(`Review link sent to ${lead.fullName}`);
      await logSystemInfo('review', `Review request sent to ${lead.fullName}`, { link }, lead.id);
    } catch (e: any) {
      await logSystemError('review', `Review send failed: ${e.message}`, {}, lead?.id);
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `review-qr-${lead?.fullName || 'client'}.png`;
    a.click();
  };

  const printQr = () => {
    if (!qrDataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Review QR - ${lead?.fullName}</title></head>
      <body style="text-align:center;font-family:sans-serif;padding:40px">
        <h2>${businessName}</h2>
        <p>Scan to leave a review</p>
        <img src="${qrDataUrl}" style="width:300px;height:300px" />
        <p style="margin-top:20px;color:#555">${lead?.fullName || ''}</p>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Star className="h-5 w-5 text-yellow-400" /> Send Review Request?
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Collect a Google review from <span className="text-white font-medium">{lead.fullName}</span>
          </DialogDescription>
        </DialogHeader>

        {!googleUrl && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
            Google Review URL not set. Add it in Settings → Google My Business.
          </div>
        )}

        {showQr && qrDataUrl ? (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
              <img src={qrDataUrl} alt="Review QR Code" className="w-56 h-56" />
            </div>
            <p className="text-center text-xs text-slate-400 break-all">{linkForQr}</p>
            <div className="flex gap-2">
              <Button onClick={downloadQr} variant="outline" size="sm" className="flex-1 border-slate-700 text-slate-200">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
              <Button onClick={printQr} variant="outline" size="sm" className="flex-1 border-slate-700 text-slate-200">
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
              </Button>
              <Button onClick={() => setShowQr(false)} variant="ghost" size="sm" className="text-slate-400">Back</Button>
            </div>
          </div>
        ) : sent ? (
          <div className="text-center py-6 space-y-2 animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-white font-medium">Review request sent!</p>
            <p className="text-xs text-slate-400">We'll notify you when the client responds.</p>
            <Button onClick={() => onOpenChange(false)} className="bg-green-500 hover:bg-green-600 mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <Button onClick={sendWhatsApp} disabled={sending || !lead.phone} className="w-full h-11 bg-green-500 hover:bg-green-600 text-white justify-start gap-3">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send WhatsApp Link
            </Button>
            <Button onClick={generateQr} variant="outline" className="w-full h-11 border-slate-700 text-slate-100 hover:bg-slate-800 justify-start gap-3">
              <QrCode className="h-4 w-4 text-yellow-400" /> Generate QR Code
            </Button>
            <Button onClick={copyLink} variant="outline" className="w-full h-11 border-slate-700 text-slate-100 hover:bg-slate-800 justify-start gap-3">
              <Copy className="h-4 w-4 text-blue-400" /> Copy Review Link
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-800">
              Skip for now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
