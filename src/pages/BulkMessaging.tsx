import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Upload, Users, BarChart3, Plus, Trash2,
  MessageSquare, CheckCircle2, Clock, Eye, AlertCircle, FileText, Filter, IndianRupee, Download, Target,
  RefreshCw, ShieldCheck, Zap
} from 'lucide-react';
import { LEAD_STATUSES } from '@/types/lead';
import { getRetargetingSegments, exportRetargetingCSV, downloadCSV, type RetargetingSegment } from '@/lib/retargetingExport';

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  body: string;
  variableCount: number;
}

const VARIABLE_PRESETS = ['client_name', 'artist_name', 'appointment_date', 'appointment_time', 'amount', 'studio_name'];

interface Campaign {
  id: string;
  campaign_name: string;
  message_content: string;
  media_url: string | null;
  cta_type: string | null;
  cta_label: string | null;
  status: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  replies_received: number;
  bookings_generated: number;
  created_at: string;
  sent_at: string | null;
}

interface Recipient {
  phone: string;
  name: string;
}

const CTA_OPTIONS = [
  { value: 'book', label: 'Book Appointment' },
  { value: 'artist', label: 'Talk to Artist' },
  { value: 'designs', label: 'View Designs' },
];

const COST_PER_MESSAGE = 0.80;

const WHATSAPP_TEMPLATES = [
  { key: 'inquiry_reply', label: 'Tattoo Inquiry Reply', text: 'Hi {{client_name}}! 🎨 Thanks for reaching out to F19 Tattoo Studio about your {{tattoo_idea}}. We\'d love to help bring your vision to life! Would you like to schedule a consultation with our artist?' },
  { key: 'appointment_confirm', label: 'Appointment Confirmation', text: 'Hey {{client_name}}! ✅ Your tattoo appointment is confirmed!\n\n📅 Date: {{appointment_date}}\n🎨 Artist: {{artist_name}}\n📍 F19 Tattoo Studio\n\nPlease arrive 15 minutes early. See you soon!' },
  { key: 'design_discussion', label: 'Design Discussion', text: 'Hi {{client_name}}! 🖌️ Your design for {{tattoo_idea}} is being worked on by {{artist_name}}. We\'ll share the draft soon. Any specific changes you\'d like us to consider?' },
  { key: 'aftercare', label: 'Aftercare Instructions', text: 'Hey {{client_name}}! 🌟 Thanks for getting inked at F19!\n\n🧴 Aftercare:\n• Keep bandage on for 2-4 hours\n• Wash gently with mild soap\n• Apply thin layer of moisturizer\n• Avoid direct sunlight for 2 weeks\n• No swimming for 2 weeks\n\nDM us if you have any questions!' },
  { key: 'review_request', label: 'Review Request', text: 'Hi {{client_name}}! 😊 Hope you\'re loving your new tattoo by {{artist_name}}! Would you mind leaving us a quick review? It really helps us grow! ⭐\n\nThank you for choosing F19!' },
];

export default function BulkMessaging() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignName, setCampaignName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [ctaType, setCtaType] = useState<string>('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Template state
  const [campaignType, setCampaignType] = useState<'text' | 'template'>('text');
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]); // ordered list of variable names mapped to {{1}}..{{n}}
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [templateDebug, setTemplateDebug] = useState<any>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const selectedTemplate = metaTemplates.find(t => t.name === selectedTemplateName);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }) as { data: Campaign[] | null };
    setCampaigns(data || []);
    setLoading(false);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplateError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', { method: 'GET' });
      if (error) throw error;
      const payload = data as any;
      const list = (payload?.templates || []) as MetaTemplate[];
      setMetaTemplates(list);
      setTemplateDebug(payload?.debug || null);
      if (payload?.error) {
        setTemplateError(payload.error);
        toast.error(payload.error);
      } else if (list.length === 0) {
        toast.info('No templates found in this WABA');
      } else {
        toast.success(`Loaded ${list.length} template(s) from Meta`);
      }
    } catch (e: any) {
      setTemplateError(e.message || String(e));
      toast.error(`Failed to load templates: ${e.message || e}`);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); fetchTemplates(); }, [fetchCampaigns, fetchTemplates]);

  // When a template is picked, init the variable mapping with defaults
  useEffect(() => {
    if (selectedTemplate) {
      const defaults = Array.from({ length: selectedTemplate.variableCount }, (_, i) =>
        VARIABLE_PRESETS[i] || `var_${i + 1}`
      );
      setTemplateVariables(defaults);
    } else {
      setTemplateVariables([]);
    }
  }, [selectedTemplateName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refresh campaigns when delivery status changes
  useEffect(() => {
    const ch = supabase
      .channel('campaigns-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchCampaigns())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_recipients' }, () => fetchCampaigns())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCampaigns]);

  const sendTestTemplate = async () => {
    if (!selectedTemplate) { toast.error('Select a template first'); return; }
    if (!testPhone) { toast.error('Enter test phone (+91...)'); return; }
    setTestSending(true);
    try {
      const sample: Record<string, string> = {
        client_name: 'Test User', artist_name: 'F19 Artist', appointment_date: 'Tomorrow 4 PM',
        amount: '₹2,500', studio_name: 'F19 Tattoo Studio',
      };
      const vars = templateVariables.map(k => sample[k] || k);
      const { data, error } = await supabase.functions.invoke('whatsapp-templates', {
        method: 'POST',
        body: { action: 'test', phone: testPhone, templateName: selectedTemplate.name, language: selectedTemplate.language, variables: vars },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Test template sent ✅');
    } catch (e: any) {
      toast.error(`Test failed: ${e.message || e}`);
    } finally {
      setTestSending(false);
    }
  };

  const importByStage = async () => {
    if (selectedStages.length === 0) {
      toast.error('Select at least one pipeline stage');
      return;
    }
    const { data: leads } = await supabase
      .from('leads')
      .select('full_name, phone')
      .in('status', selectedStages)
      .eq('whatsapp_opt_in', true);
    if (leads && leads.length > 0) {
      const newRecips = leads.map((l: any) => ({ phone: l.phone, name: l.full_name }));
      setRecipients(prev => {
        const existing = new Set(prev.map(r => r.phone));
        return [...prev, ...newRecips.filter(r => !existing.has(r.phone))];
      });
      toast.success(`Imported ${leads.length} contacts from ${selectedStages.join(', ')}`);
    } else {
      toast.info('No opt-in leads found in selected stages');
    }
  };

  const importFromCRM = async () => {
    const { data: leads } = await supabase.from('leads').select('full_name, phone').eq('whatsapp_opt_in', true);
    if (leads && leads.length > 0) {
      const newRecips = leads.map((l: any) => ({ phone: l.phone, name: l.full_name }));
      setRecipients(prev => {
        const existing = new Set(prev.map(r => r.phone));
        return [...prev, ...newRecips.filter(r => !existing.has(r.phone))];
      });
      toast.success(`Imported ${leads.length} contacts from CRM`);
    } else {
      toast.info('No opt-in leads found');
    }
  };

  const handlePaste = () => {
    if (!pasteInput.trim()) return;
    const lines = pasteInput.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const newRecips: Recipient[] = lines.map(line => {
      const parts = line.split(/\t/).map(p => p.trim());
      const phone = parts[0]?.replace(/[^+\d]/g, '') || '';
      const name = parts[1] || 'Unknown';
      return { phone: phone.startsWith('+') ? phone : `+91${phone}`, name };
    }).filter(r => r.phone.length >= 10);
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.phone));
      return [...prev, ...newRecips.filter(r => !existing.has(r.phone))];
    });
    setPasteInput('');
    toast.success(`Added ${newRecips.length} contacts`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1);
    const newRecips: Recipient[] = lines.map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^\"|\"$/g, ''));
      const phone = cols[0]?.replace(/[^+\d]/g, '') || '';
      const name = cols[1] || 'Unknown';
      return { phone: phone.startsWith('+') ? phone : `+91${phone}`, name };
    }).filter(r => r.phone.length >= 10);
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.phone));
      return [...prev, ...newRecips.filter(r => !existing.has(r.phone))];
    });
    toast.success(`Imported ${newRecips.length} contacts from file`);
    e.target.value = '';
  };

  const estimatedCost = recipients.length * COST_PER_MESSAGE;

  const handleSendCampaign = async () => {
    if (!campaignName) { toast.error('Enter campaign name'); return; }
    if (recipients.length === 0) { toast.error('Add recipients'); return; }
    if (campaignType === 'template') {
      if (!selectedTemplate) { toast.error('Select an approved WhatsApp template'); return; }
      if (selectedTemplate.status !== 'APPROVED') { toast.error('Template is not APPROVED in Meta'); return; }
    } else if (!messageContent) {
      toast.error('Enter message content'); return;
    }

    setSending(true);
    try {
      const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
        campaign_name: campaignName,
        message_content: campaignType === 'template' ? (selectedTemplate?.body || '') : messageContent,
        cta_type: ctaType && ctaType !== 'none' ? ctaType : null,
        cta_label: ctaLabel || null,
        total_recipients: recipients.length,
        status: 'queued',
        campaign_type: campaignType,
        template_name: campaignType === 'template' ? selectedTemplate?.name : null,
        template_language: campaignType === 'template' ? selectedTemplate?.language : null,
        template_variables: campaignType === 'template' ? templateVariables : [],
      } as any).select().single();

      if (campErr || !campaign) { toast.error('Failed to create campaign'); setSending(false); return; }

      const recipRows = recipients.map(r => ({
        campaign_id: (campaign as any).id,
        phone: r.phone,
        name: r.name,
        status: 'pending',
        template_variables: { client_name: r.name },
      }));
      await supabase.from('campaign_recipients').insert(recipRows as any);

      const { error } = await supabase.functions.invoke('send-bulk-campaign', {
        body: { campaignId: (campaign as any).id },
      });

      if (error) {
        toast.error(`Failed to send campaign: ${error.message || error}`);
      } else {
        toast.success(`Campaign sent! ${recipients.length} contacts · est ₹${estimatedCost.toFixed(0)}`);
        setCampaignName('');
        setMessageContent('');
        setCtaType('');
        setCtaLabel('');
        setRecipients([]);
        setSelectedStages([]);
        setTab('campaigns');
        fetchCampaigns();
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message || 'Failed to create campaign'}`);
    }
    setSending(false);
  };



  const toggleStage = (stage: string) => {
    setSelectedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted/50 text-muted-foreground',
      queued: 'bg-warning/10 text-warning',
      sending: 'bg-info/10 text-info',
      sent: 'bg-success/10 text-success',
      failed: 'bg-destructive/10 text-destructive',
    };
    return <Badge className={`${styles[status] || styles.draft} border-0`}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">Bulk Messaging & Campaigns</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="create" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Campaign
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Campaigns ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="retargeting" className="gap-1.5">
              <Target className="h-3.5 w-3.5" /> Retargeting Export
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab: Meta-approved WhatsApp templates (live) */}
          <TabsContent value="templates">
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Meta-Approved WhatsApp Templates
                </h2>
                <p className="text-xs text-muted-foreground">Live from Meta · {metaTemplates.length} total · {metaTemplates.filter(t => t.status === 'APPROVED').length} approved {templateDebug?.resolved_waba_id && <span className="ml-1 opacity-60">· WABA {templateDebug.resolved_waba_id}</span>}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowDebug(v => !v)} className="text-xs">
                  {showDebug ? 'Hide' : 'Show'} debug
                </Button>
                <Button size="sm" variant="outline" onClick={fetchTemplates} disabled={templatesLoading} className="gap-1.5 text-xs">
                  <RefreshCw className={`h-3.5 w-3.5 ${templatesLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>

            {(showDebug || templateError || metaTemplates.length === 0) && templateDebug && (
              <Card className="glass-card mb-3 border-amber-500/30">
                <CardContent className="py-3 text-[11px] space-y-1.5">
                  <div className="font-semibold text-amber-400 flex items-center gap-2">Debug · Meta API</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                    <div><span className="opacity-60">Stored ID:</span> <code className="text-foreground">{templateDebug.stored_id}</code></div>
                    <div><span className="opacity-60">Resolved WABA:</span> <code className="text-foreground">{templateDebug.resolved_waba_id || '—'}</code></div>
                    <div><span className="opacity-60">ID kind:</span> <code className="text-foreground">{templateDebug.id_kind}</code></div>
                    <div><span className="opacity-60">Auto-resolved:</span> <code className="text-foreground">{String(templateDebug.auto_resolved)}</code></div>
                    <div><span className="opacity-60">Token valid:</span> <code className="text-foreground">{String(templateDebug.token_valid)}</code></div>
                    <div><span className="opacity-60">Raw count:</span> <code className="text-foreground">{templateDebug.raw_count ?? '—'}</code></div>
                  </div>
                  {templateDebug.token_scopes && (
                    <div className="pt-1"><span className="opacity-60">Scopes:</span> <code className="text-foreground break-all">{Array.isArray(templateDebug.token_scopes) ? templateDebug.token_scopes.join(', ') : JSON.stringify(templateDebug.token_scopes)}</code></div>
                  )}
                  {templateError && <div className="text-red-400 pt-1">⚠ {templateError}</div>}
                  {showDebug && (
                    <pre className="mt-2 max-h-60 overflow-auto bg-muted/40 p-2 rounded text-[10px]">{JSON.stringify(templateDebug, null, 2)}</pre>
                  )}
                </CardContent>
              </Card>
            )}

            {templatesLoading && metaTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading templates from Meta...</div>
            ) : metaTemplates.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
                  <MessageSquare className="h-8 w-8 mx-auto opacity-40" />
                  <p>No templates found in this WABA.</p>
                  <p className="text-xs">Token needs <code>whatsapp_business_management</code> + <code>whatsapp_business_messaging</code>. Ensure the WABA ID above matches Meta Business Manager → WhatsApp Accounts.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metaTemplates.map(t => (
                  <Card key={`${t.name}-${t.language}`} className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm text-foreground flex items-center gap-2 truncate">
                          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </CardTitle>
                        <Badge className={`text-[10px] shrink-0 ${t.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {t.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                        <Badge variant="outline" className="text-[10px]">{t.variableCount} vars</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 mb-3 max-h-40 overflow-auto">
                        {t.body || '(no body)'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        disabled={t.status !== 'APPROVED'}
                        onClick={() => {
                          setCampaignType('template');
                          setSelectedTemplateName(t.name);
                          setTab('create');
                          toast.success(`Template "${t.name}" selected`);
                        }}
                      >
                        <Send className="h-3 w-3" /> Use This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

              {/* Left: Campaign Details */}
              <div className="space-y-4">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm text-foreground">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Campaign Name</label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. March Promo" />
                    </div>

                    {/* Campaign Type Toggle */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Message Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCampaignType('text')}
                          className={`px-3 py-2 rounded-md text-xs font-medium border transition-all ${campaignType === 'text' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                          Free Text (24h window)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCampaignType('template')}
                          className={`px-3 py-2 rounded-md text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${campaignType === 'template' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                          <ShieldCheck className="h-3 w-3" /> Approved Template
                        </button>
                      </div>
                    </div>

                    {campaignType === 'template' ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-muted-foreground">Select Meta Template</label>
                            <button type="button" onClick={fetchTemplates} disabled={templatesLoading} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                              <RefreshCw className={`h-3 w-3 ${templatesLoading ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                          </div>
                          <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                            <SelectTrigger>
                              <SelectValue placeholder={templatesLoading ? 'Loading...' : 'Pick approved template'} />
                            </SelectTrigger>
                            <SelectContent>
                              {metaTemplates.filter(t => t.status === 'APPROVED').map(t => (
                                <SelectItem key={`${t.name}-${t.language}`} value={t.name}>
                                  {t.name} · {t.category} · {t.language}
                                </SelectItem>
                              ))}
                              {metaTemplates.filter(t => t.status === 'APPROVED').length === 0 && (
                                <div className="px-2 py-3 text-xs text-muted-foreground">No approved templates</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedTemplate && (
                          <>
                            <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border/50">
                              {selectedTemplate.body}
                            </div>

                            {templateVariables.length > 0 && (
                              <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Map Variables (in order)</label>
                                {templateVariables.map((v, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] shrink-0">{`{{${i + 1}}}`}</Badge>
                                    <Select value={v} onValueChange={(val) => {
                                      setTemplateVariables(prev => prev.map((x, idx) => idx === i ? val : x));
                                    }}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {VARIABLE_PRESETS.map(p => (
                                          <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Test send */}
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                              <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Send Test Template
                              </p>
                              <div className="flex gap-2">
                                <Input
                                  value={testPhone}
                                  onChange={e => setTestPhone(e.target.value)}
                                  placeholder="+919876543210"
                                  className="h-8 text-xs"
                                />
                                <Button size="sm" onClick={sendTestTemplate} disabled={testSending} className="h-8 text-xs gap-1 shrink-0">
                                  {testSending ? <Clock className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  Test
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Message Content</label>
                          <Textarea
                            value={messageContent}
                            onChange={e => setMessageContent(e.target.value)}
                            placeholder="Hi {{client_name}}, check out our latest designs..."
                            className="min-h-[120px]"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Variables: {'{{client_name}}'} {'{{artist_name}}'} {'{{appointment_date}}'} {'{{amount}}'} {'{{studio_name}}'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">CTA Button</label>
                            <Select value={ctaType} onValueChange={setCtaType}>
                              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No CTA</SelectItem>
                                {CTA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Button Label</label>
                            <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="e.g. Book Now" disabled={!ctaType || ctaType === 'none'} />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>


                {/* Cost Estimate & Preview */}
                {recipients.length > 0 && (
                  <Card className="glass-card border-primary/30">
                    <CardContent className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Send Preview</p>
                          <div className="flex items-center gap-3 flex-wrap mt-1">

                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-info" />
                              <span className="text-sm font-bold text-foreground">{recipients.length}</span>
                              <span className="text-[10px] text-muted-foreground">recipients</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-3.5 w-3.5 text-warning" />
                              <span className="text-sm font-bold text-warning">₹{COST_PER_MESSAGE.toFixed(2)}</span>
                              <span className="text-[10px] text-muted-foreground">per msg</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-3.5 w-3.5 text-success" />
                              <span className="text-sm font-bold text-success">₹{estimatedCost.toFixed(0)}</span>
                              <span className="text-[10px] text-muted-foreground">total</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleSendCampaign}
                          disabled={sending || !campaignName || (campaignType === 'text' ? !messageContent : !selectedTemplate)}
                          className="gap-2 w-full sm:w-auto"
                        >
                          {sending ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {sending ? 'Sending...' : 'Send Campaign'}
                        </Button>

                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Recipients */}
              <div className="space-y-4">
                {/* Stage Filter */}
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-foreground flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      Filter by Pipeline Stage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {LEAD_STATUSES.map(stage => (
                        <label key={stage} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={selectedStages.includes(stage)}
                            onCheckedChange={() => toggleStage(stage)}
                          />
                          <span className="text-xs text-foreground">{stage}</span>
                        </label>
                      ))}
                    </div>
                    <Button size="sm" onClick={importByStage} disabled={selectedStages.length === 0} variant="outline" className="gap-1.5 text-xs">
                      <Filter className="h-3 w-3" /> Import from Selected Stages
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-foreground">Recipients ({recipients.length})</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={importFromCRM} className="gap-1 text-xs">
                          <Users className="h-3 w-3" /> All CRM
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileImport} className="hidden" />
                          <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
                            <span><FileText className="h-3 w-3" /> CSV</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Textarea value={pasteInput} onChange={e => setPasteInput(e.target.value)} placeholder="Paste phone numbers (one per line)" className="min-h-[60px] text-xs" />
                      <Button variant="outline" size="sm" onClick={handlePaste} className="mt-2 gap-1 text-xs">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {recipients.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{recipients.length} contacts</p>
                          <Button variant="ghost" size="sm" onClick={() => setRecipients([])} className="text-destructive hover:text-destructive text-xs gap-1">
                            <Trash2 className="h-3 w-3" /> Clear
                          </Button>
                        </div>
                        <ScrollArea className="h-[160px]">
                          <div className="space-y-1">
                            {recipients.slice(0, 50).map((r, i) => (
                              <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-xs">
                                <span className="text-foreground">{r.name}</span>
                                <span className="text-muted-foreground">{r.phone}</span>
                              </div>
                            ))}
                            {recipients.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">+ {recipients.length - 50} more</p>}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <div className="space-y-3 mt-4">
              {campaigns.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No campaigns yet</p>
                </div>
              )}
              {campaigns.map(c => (
                <Card key={c.id} className="glass-card">
                  <CardContent className="py-4 px-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-foreground">{c.campaign_name}</h3>
                          {getStatusBadge(c.status)}
                          {(c as any).campaign_type === 'template' && (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Template
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{(c as any).template_name || c.message_content}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-[10px] text-muted-foreground">
                            {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not sent'}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            Cost: ₹{(c.total_recipients * COST_PER_MESSAGE).toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-3 sm:gap-5 text-center shrink-0">

                        <div>
                          <p className="text-lg font-bold text-foreground">{c.messages_sent}</p>
                          <p className="text-[10px] text-muted-foreground">Sent</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-info">{c.messages_delivered}</p>
                          <p className="text-[10px] text-muted-foreground">Delivered</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-success">{c.messages_read}</p>
                          <p className="text-[10px] text-muted-foreground">Read</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-primary">{c.replies_received}</p>
                          <p className="text-[10px] text-muted-foreground">Replies</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-destructive">{(c as any).failed_count ?? Math.max(c.total_recipients - c.messages_sent, 0)}</p>
                          <p className="text-[10px] text-muted-foreground">Failed</p>
                        </div>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Retargeting Export Tab */}
          <TabsContent value="retargeting" className="space-y-4">
            <RetargetingPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RetargetingPanel() {
  const [segments, setSegments] = useState<RetargetingSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    getRetargetingSegments().then(s => { setSegments(s); setLoading(false); });
  }, []);

  const handleExport = async (status: string, name: string) => {
    setExporting(status);
    try {
      const csv = await exportRetargetingCSV(status);
      if (!csv) {
        toast.error('No leads found for this segment');
        return;
      }
      downloadCSV(csv, `f19_retargeting_${name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Exported ${name} segment`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Loading segments...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {segments.map(seg => (
        <Card key={seg.status} className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">{seg.name}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{seg.count} leads</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              disabled={seg.count === 0 || exporting === seg.status}
              onClick={() => handleExport(seg.status, seg.name)}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting === seg.status ? 'Exporting...' : 'Export CSV for Retargeting'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
