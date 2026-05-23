import { useState } from 'react';
import { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2, Send, X, RotateCw, Eye } from 'lucide-react';
import { generateClientId } from '@/hooks/useTattooCompletions';
import { useTattooCompletions } from '@/hooks/useTattooCompletions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useArtists } from '@/hooks/useArtists';
import { ArtistManagerDialog } from './ArtistManagerDialog';
import { InvoicePreviewDialog } from './InvoicePreviewDialog';
import { logSystemError, logSystemInfo } from '@/lib/systemLogger';
import { sendAdminAlert } from '@/lib/adminNotifications';
import { ReviewRequestDialog } from '@/components/reviews/ReviewRequestDialog';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_AFTERCARE = `*DRY HEALING*

• Clean the tattoo 3 times in a day with sterile water or RO water for 7-10 days after the tattoo is done.

• Do not apply any kind of moisturisers or cream on the tattoo for the next 7-10 days.

• Avoid chlorine water, swimming, beaches, direct sunlight and wear loose full sleeves to protect your tattoo from the sun.

• Don't apply soap on tattoo while bathing. Wash the tattoo separately.

• Do not peel the scabs, let it come off on its own.

• No exercise/gym or any other sweat related activity for first 2 weeks.

• After 3 days you can start applying *Calendula* cream on the tattoo.

• Antibiotic is mandatory after every tattoo. Please note that the artist is not supposed to suggest any kind of antibiotic. Let the doctors do their job.`;

interface TattooCompletionDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function TattooCompletionDialog({ lead, open, onOpenChange, onCompleted }: TattooCompletionDialogProps) {
  const { addCompletion } = useTattooCompletions();
  const { artistNames: artists, addArtist } = useArtists();
  const [artistName, setArtistName] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [tattooPrice, setTattooPrice] = useState('');
  const [aftercareNotes, setAftercareNotes] = useState(DEFAULT_AFTERCARE);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [failedFiles, setFailedFiles] = useState<{ name: string; file: File }[]>([]);
  const [manageArtistsOpen, setManageArtistsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [clientIdCode] = useState(() => generateClientId());
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  if (!lead) return null;

  const finalArtistName = artistName === '__custom__' ? customArtist.trim() : artistName;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      return `${file.name}: Only JPG, PNG, WEBP allowed`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: Max 10MB per image`;
    }
    return null;
  };

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `completions/${lead.id}/${fileName}`;

    const { error } = await supabase.storage.from('f19').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      await logSystemError('upload', `Upload failed: ${file.name} - ${error.message}`, { fileName: file.name, leadId: lead.id }, lead.id);
      return null;
    }
    const { data: urlData } = supabase.storage.from('f19').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    const newFailed: { name: string; file: File }[] = [];

    for (const file of Array.from(files)) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      const url = await uploadSingleFile(file);
      if (url) {
        newUrls.push(url);
      } else {
        newFailed.push({ name: file.name, file });
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    if (newUrls.length > 0) {
      setPhotoUrls(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} photo(s) uploaded`);
    }
    if (newFailed.length > 0) {
      setFailedFiles(prev => [...prev, ...newFailed]);
    }
    setUploading(false);
    e.target.value = '';
  };

  const retryUpload = async (index: number) => {
    const item = failedFiles[index];
    setUploading(true);
    const url = await uploadSingleFile(item.file);
    if (url) {
      setPhotoUrls(prev => [...prev, url]);
      setFailedFiles(prev => prev.filter((_, i) => i !== index));
      toast.success(`${item.name} uploaded successfully`);
    } else {
      toast.error(`Retry failed: ${item.name}`);
    }
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!finalArtistName || !tattooPrice) {
      toast.error('Please fill artist name and tattoo price');
      return;
    }
    if (!clientIdCode) {
      toast.error('Client ID is missing — cannot save');
      return;
    }
    if (photoUrls.length === 0) {
      toast.error('Please upload at least one tattoo photo');
      return;
    }
    setSubmitting(true);
    if (artistName === '__custom__' && customArtist.trim()) {
      await addArtist(customArtist.trim());
    }

    await supabase.from('leads').update({ client_id_code: clientIdCode } as any).eq('id', lead.id);

    const ok = await addCompletion({
      lead_id: lead.id,
      client_id_code: clientIdCode,
      artist_name: finalArtistName,
      tattoo_price: parseFloat(tattooPrice),
      photo_urls: photoUrls,
      aftercare_notes: aftercareNotes.trim(),
      invoice_url: null,
    });

    if (ok) {
      await logSystemInfo('general', `Tattoo completed for ${lead.fullName}`, { clientId: clientIdCode, artist: finalArtistName }, lead.id);

      // Send admin notification
      await sendAdminAlert({
        leadId: lead.id,
        leadName: lead.fullName,
        leadPhone: lead.phone,
        notificationType: 'Tattoo Completion',
        message: `Tattoo completed for ${lead.fullName}.\nArtist: ${finalArtistName}\nPrice: ₹${tattooPrice}`,
      });

      // Open review request dialog (user chooses WhatsApp / QR / Copy)
      setReviewDialogOpen(true);
      onCompleted?.();
    }
    setSubmitting(false);
  };




  const handleInvoicePreview = () => {
    if (!tattooPrice) {
      toast.error('Enter tattoo price first');
      return;
    }
    setInvoicePreviewOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!lead.phone) {
      toast.error('No phone number available');
      return;
    }
    setSendingWhatsApp(true);
    try {
      const message = `🎨 *F19 TATTOO STUDIO*\n\nHi ${lead.fullName}! Your tattoo session is complete! 🎉\n\n📋 *Details:*\n• Client ID: ${clientIdCode}\n• Artist: ${finalArtistName || 'N/A'}\n• Price: ₹${tattooPrice || '0'}\n• Style: ${lead.tattooStyle || 'N/A'}\n• Placement: ${lead.placement || 'N/A'}\n\n📝 *Aftercare Instructions:*\n${aftercareNotes}\n\nThank you for choosing F19 Tattoo Studio! 🙏`;

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: lead.phone,
          leadName: lead.fullName,
          leadId: lead.id,
          messageBody: message,
        },
      });
      if (error) throw error;
      toast.success(`Details sent to ${lead.fullName} on WhatsApp`);
    } catch (err: any) {
      await logSystemError('whatsapp', `Aftercare WhatsApp failed: ${err.message}`, {}, lead.id);
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const invoiceData = {
    clientName: lead.fullName,
    clientId: clientIdCode,
    phone: lead.phone,
    artistName: finalArtistName || 'N/A',
    tattooPrice: parseFloat(tattooPrice) || 0,
    tattooStyle: lead.tattooStyle,
    placement: lead.placement,
    date: new Date().toLocaleDateString('en-IN'),
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Mark Tattoo Completed</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-2.5 text-xs">
              <p className="font-semibold text-foreground">{lead.fullName}</p>
              <p className="text-muted-foreground">Client ID: <span className="font-mono text-primary">{clientIdCode}</span></p>
            </div>

            {/* Artist Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Artist Name *</Label>
              <Select value={artistName} onValueChange={v => {
                if (v === '__manage__') { setManageArtistsOpen(true); return; }
                setArtistName(v);
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ Add New Artist</SelectItem>
                  <SelectItem value="__manage__">⚙ Manage Artists</SelectItem>
                </SelectContent>
              </Select>
              {artistName === '__custom__' && (
                <Input value={customArtist} onChange={e => setCustomArtist(e.target.value)} placeholder="Enter artist name" className="h-8 text-xs mt-1" />
              )}
            </div>

            {/* Tattoo Price */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tattoo Price (₹) *</Label>
              <Input type="number" value={tattooPrice} onChange={e => setTattooPrice(e.target.value)} placeholder="5000" className="h-8 text-xs" />
            </div>

            {/* Photo Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tattoo Photos <span className="text-muted-foreground">(JPG, PNG, WEBP · max 10MB)</span></Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</> : 'Upload Photos'}
                  <input type="file" multiple accept=".jpg,.jpeg,.png,.webp" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                </label>
              </div>

              {/* Photo Thumbnails */}
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group">
                      <img src={url} alt={`Tattoo ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed uploads with retry */}
              {failedFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {failedFiles.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-destructive/10 border border-destructive/20 text-xs">
                      <span className="text-destructive truncate">{item.name} — failed</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-primary" onClick={() => retryUpload(i)} disabled={uploading}>
                        <RotateCw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aftercare */}
            <div className="space-y-1.5">
              <Label className="text-xs">Aftercare Instructions</Label>
              <Textarea value={aftercareNotes} onChange={e => setAftercareNotes(e.target.value)} className="text-xs min-h-[120px]" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={handleInvoicePreview} disabled={!tattooPrice}>
                <Eye className="h-3.5 w-3.5" /> Invoice Preview
              </Button>
              <Button variant="outline" size="sm" className="gap-1 flex-1 border-green-500/30 text-green-600 hover:bg-green-500/10" onClick={handleSendWhatsApp} disabled={sendingWhatsApp || !lead.phone}>
                {sendingWhatsApp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                WhatsApp
              </Button>
              <Button size="sm" className="gap-1 flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={invoicePreviewOpen}
        onOpenChange={setInvoicePreviewOpen}
        data={invoiceData}
        leadId={lead.id}
        onEdit={() => setInvoicePreviewOpen(false)}
      />

      <ArtistManagerDialog open={manageArtistsOpen} onOpenChange={setManageArtistsOpen} />
    </>
  );
}
