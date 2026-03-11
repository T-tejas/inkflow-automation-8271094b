import { useState } from 'react';
import { Lead } from '@/types/lead';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { generateClientId } from '@/hooks/useTattooCompletions';
import { useTattooCompletions } from '@/hooks/useTattooCompletions';
import { generateInvoiceHTML, downloadInvoice } from '@/lib/invoiceGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TattooCompletionDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function TattooCompletionDialog({ lead, open, onOpenChange, onCompleted }: TattooCompletionDialogProps) {
  const { addCompletion } = useTattooCompletions();
  const [artistName, setArtistName] = useState('');
  const [tattooPrice, setTattooPrice] = useState('');
  const [aftercareNotes, setAftercareNotes] = useState(
    '1. Keep bandage on for 2-4 hours\n2. Wash gently with lukewarm water\n3. Apply thin layer of healing ointment\n4. Avoid direct sunlight for 2 weeks\n5. Do not scratch or pick at the tattoo'
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientIdCode] = useState(() => generateClientId());

  if (!lead) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `completions/${lead.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('f19').upload(path, file);
      if (error) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('f19').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setPhotoUrls(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!artistName.trim() || !tattooPrice) {
      toast.error('Please fill artist name and tattoo price');
      return;
    }
    setSubmitting(true);

    // Save client ID to lead
    await supabase.from('leads').update({ client_id_code: clientIdCode } as any).eq('id', lead.id);

    const ok = await addCompletion({
      lead_id: lead.id,
      client_id_code: clientIdCode,
      artist_name: artistName.trim(),
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
      artistName: artistName || 'N/A',
      tattooPrice: parseFloat(tattooPrice) || 0,
      tattooStyle: lead.tattooStyle,
      placement: lead.placement,
      date: new Date().toLocaleDateString('en-IN'),
    });
    downloadInvoice(html, clientIdCode);
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
            <Input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Who did the tattoo?" className="h-8 text-xs" />
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
                {uploading ? 'Uploading...' : 'Upload Photos'}
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-md overflow-hidden border border-border">
                    <img src={url} alt={`Tattoo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Aftercare Instructions</Label>
            <Textarea value={aftercareNotes} onChange={e => setAftercareNotes(e.target.value)} className="text-xs min-h-[80px]" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={handleGenerateInvoice} disabled={!tattooPrice}>
              <FileText className="h-3.5 w-3.5" /> Generate Invoice
            </Button>
            <Button size="sm" className="gap-1 flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Completion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
