import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Eye, Loader2 } from 'lucide-react';
import { MessageTemplate } from '@/hooks/useMessageTemplates';
import { TemplatePreviewBubble, renderBody } from './TemplatePreviewBubble';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PreviewDialog({ template, open, onOpenChange }: { template: MessageTemplate | null; open: boolean; onOpenChange: (b: boolean) => void; }) {
  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Preview: {template.name}</DialogTitle>
        </DialogHeader>
        <TemplatePreviewBubble body={template.body_text} variables={template.variables} buttons={template.buttons} sample />
        <p className="text-xs text-muted-foreground">Sample values shown for {`{{variables}}`}. Actual messages use real client data.</p>
      </DialogContent>
    </Dialog>
  );
}

export function SendTestDialog({ template, open, onOpenChange, onSent }: { template: MessageTemplate | null; open: boolean; onOpenChange: (b: boolean) => void; onSent?: () => void; }) {
  const [phone, setPhone] = useState('+91 ');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => { if (open) { setVars({}); setPhone('+91 '); } }, [open]);

  if (!template) return null;
  const finalBody = renderBody(template.body_text, template.variables, vars, true);

  const send = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return toast.error('Enter a valid phone');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: '+' + digits,
          leadName: vars['client_name'] || 'Test',
          messageBody: finalBody,
          templateType: template.category === 'marketing' ? 'promo' : 'confirmation',
          templateName: template.name,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Test sent ✓');
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Test: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
          </div>
          {template.variables.map(v => (
            <div key={v}>
              <Label className="capitalize">{v.replace(/_/g, ' ')}</Label>
              <Input value={vars[v] || ''} onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))} placeholder={`Sample ${v}`} />
            </div>
          ))}
          <TemplatePreviewBubble body={template.body_text} variables={template.variables} values={vars} buttons={template.buttons} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending} className="bg-[#25d366] hover:bg-[#1ebe57] text-white">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Send Test</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Lead { id: string; full_name: string; phone: string; assigned_artist?: string | null; tattoo_style?: string | null; }

export function UseTemplateDialog({ template, open, onOpenChange, onSent }: { template: MessageTemplate | null; open: boolean; onOpenChange: (b: boolean) => void; onSent?: () => void; }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState<string>('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setVars({}); setLeadId(''); setSearch('');
    supabase.from('leads').select('id, full_name, phone, assigned_artist, tattoo_style').order('updated_at', { ascending: false }).limit(200)
      .then(({ data }) => setLeads((data as any) || []));
  }, [open]);

  const lead = useMemo(() => leads.find(l => l.id === leadId), [leadId, leads]);
  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads.slice(0, 50);
    return leads.filter(l => l.full_name?.toLowerCase().includes(q) || l.phone?.includes(q)).slice(0, 50);
  }, [search, leads]);

  // Auto-fill vars from lead
  useEffect(() => {
    if (!lead || !template) return;
    const auto: Record<string, string> = {};
    if (template.variables.includes('client_name')) auto.client_name = lead.full_name;
    if (template.variables.includes('artist_name') && lead.assigned_artist) auto.artist_name = lead.assigned_artist;
    if (template.variables.includes('tattoo_style') && lead.tattoo_style) auto.tattoo_style = lead.tattoo_style;
    setVars(prev => ({ ...auto, ...prev }));
  }, [lead, template]);

  if (!template) return null;
  const finalBody = renderBody(template.body_text, template.variables, vars, false);

  const send = async () => {
    if (!lead) return toast.error('Select a client');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: lead.phone,
          leadName: lead.full_name,
          leadId: lead.id,
          messageBody: finalBody,
          templateType: template.category === 'marketing' ? 'promo' : 'confirmation',
          templateName: template.name,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sent to ${lead.full_name} ✓`);
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Use Template: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Search client</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or phone…" />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Pick a client" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredLeads.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.full_name} — {l.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {template.variables.map(v => (
            <div key={v}>
              <Label className="capitalize">{v.replace(/_/g, ' ')}</Label>
              <Input value={vars[v] || ''} onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))} placeholder={v} />
            </div>
          ))}
          <TemplatePreviewBubble body={template.body_text} variables={template.variables} values={vars} buttons={template.buttons} sample={false} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || !leadId} className="bg-[#25d366] hover:bg-[#1ebe57] text-white">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Send Message</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
