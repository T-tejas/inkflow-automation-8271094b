import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Copy, ExternalLink } from 'lucide-react';
import type { ConsentForm } from '@/hooks/useConsentForms';

interface ConsentFormEditDialogProps {
  form: ConsentForm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ConsentFormEditDialog({ form, open, onOpenChange, onSaved }: ConsentFormEditDialogProps) {
  const [clientName, setClientName] = useState('');
  const [consentText, setConsentText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form && open) {
      setClientName(form.client_name);
      setConsentText(form.consent_text);
    }
  }, [form, open]);

  if (!form) return null;

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('consent_forms')
      .update({ client_name: clientName.trim(), consent_text: consentText.trim() } as any)
      .eq('id', form.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update consent form');
      return;
    }
    toast.success('Consent form updated');
    onSaved?.();
    onOpenChange(false);
  };

  const formUrl = `${window.location.origin}/consent/${form.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Consent Form</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Client Name</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} disabled={!!form.signed_at} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Consent Text</Label>
            <Textarea
              value={consentText}
              onChange={e => setConsentText(e.target.value)}
              rows={12}
              className="text-xs leading-relaxed font-mono"
              disabled={!!form.signed_at}
            />
          </div>

          {form.signed_at && (
            <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
              ⚠️ This form is already signed and cannot be edited.
            </p>
          )}

          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <Input value={formUrl} readOnly className="text-xs h-8 flex-1" />
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { navigator.clipboard.writeText(formUrl); toast.success('Link copied!'); }}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => window.open(formUrl, '_blank')}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !!form.signed_at} className="gap-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
