import { useState, useEffect } from 'react';
import { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2, Send, X } from 'lucide-react';
import { generateClientId } from '@/hooks/useTattooCompletions';
import { useTattooCompletions } from '@/hooks/useTattooCompletions';
import { generateInvoiceHTML, downloadInvoice } from '@/lib/invoiceGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useArtists } from '@/hooks/useArtists';
import { ArtistManagerDialog } from './ArtistManagerDialog';

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
  const [manageArtistsOpen, setManageArtistsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [clientIdCode] = useState(() => generateClientId());

  if (!lead) return null;

  const finalArtistName = artistName === '__custom__' ? customArtist.trim() : artistName;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `completions/${lead.id}/${fileName}`;
      
      const { error } = await supabase.storage.from('f19').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${file.name} - ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('f19').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    if (urls.length > 0) {
      setPhotoUrls(prev => [...prev, ...urls]);
      toast.success(`${urls.length} photo(s) uploaded`);
    }
    setUploading(false);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!finalArtistName || !tattooPrice) {
      toast.error('Please fill artist name and tattoo price');
      return;
    }
    setSubmitting(true);
    // Auto-save custom artist
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
      onCompleted?.();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  const handleGenerateInvoice = () => {
    const html = generateInvoiceHTML({
      clientName: lead.fullName,
      clientId: clientIdCode,
      phone: lead.phone,
      artistName: finalArtistName || 'N/A',
      tattooPrice: parseFloat(tattooPrice) || 0,
      tattooStyle: lead.tattooStyle,
      placement: lead.placement,
      date: new Date().toLocaleDateString('en-IN'),
    });
    downloadInvoice(html, clientIdCode);
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
          templateType: 'freetext',
          freeTextMessage: message,
        },
      });
      if (error) throw error;
      toast.success(`Details sent to ${lead.fullName} on WhatsApp`);
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
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

          <div className="space-y-1.5">
            <Label className="text-xs">Artist Name *</Label>
            <Select value={artistName} onValueChange={setArtistName}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select artist" />
              </SelectTrigger>
              <SelectContent>
                {artists.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
                <SelectItem value="__custom__">+ Add New Artist</SelectItem>
              </SelectContent>
            </Select>
            {artistName === '__custom__' && (
              <Input value={customArtist} onChange={e => setCustomArtist(e.target.value)} placeholder="Enter artist name" className="h-8 text-xs mt-1" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tattoo Price (₹) *</Label>
            <Input type="number" value={tattooPrice} onChange={e => setTattooPrice(e.target.value)} placeholder="5000" className="h-8 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tattoo Photos</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-xs cursor-pointer hover:bg-muted/70 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</> : 'Upload Photos'}
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Aftercare Instructions</Label>
            <Textarea value={aftercareNotes} onChange={e => setAftercareNotes(e.target.value)} className="text-xs min-h-[120px]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={handleGenerateInvoice} disabled={!tattooPrice}>
              <FileText className="h-3.5 w-3.5" /> Invoice
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
  );
}
