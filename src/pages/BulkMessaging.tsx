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
  MessageSquare, CheckCircle2, Clock, Eye, AlertCircle, FileText, Filter, IndianRupee
} from 'lucide-react';
import { LEAD_STATUSES } from '@/types/lead';

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

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }) as { data: Campaign[] | null };
    setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

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
    if (!campaignName || !messageContent || recipients.length === 0) {
      toast.error('Fill campaign name, message, and add recipients');
      return;
    }
    setSending(true);
    try {
      const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
        campaign_name: campaignName,
        message_content: messageContent,
        cta_type: ctaType || null,
        cta_label: ctaLabel || null,
        total_recipients: recipients.length,
        status: 'queued',
      } as any).select().single();

      if (campErr || !campaign) { toast.error('Failed to create campaign'); setSending(false); return; }

      const recipRows = recipients.map(r => ({
        campaign_id: (campaign as any).id,
        phone: r.phone,
        name: r.name,
        status: 'pending',
      }));
      await supabase.from('campaign_recipients').insert(recipRows as any);

      const { error } = await supabase.functions.invoke('send-bulk-campaign', {
        body: { campaignId: (campaign as any).id },
      });

      if (error) {
        toast.error('Failed to send campaign');
      } else {
        toast.success(`Campaign queued! Sending to ${recipients.length} contacts. Estimated cost: ₹${estimatedCost.toFixed(0)}`);
        setCampaignName('');
        setMessageContent('');
        setCtaType('');
        setCtaLabel('');
        setRecipients([]);
        setSelectedStages([]);
        setTab('campaigns');
        fetchCampaigns();
      }
    } catch {
      toast.error('Error creating campaign');
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

      <main className="max-w-[1200px] mx-auto px-6 py-6">
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
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {WHATSAPP_TEMPLATES.map(t => (
                <Card key={t.key} className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      {t.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 mb-3">
                      {t.text}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{{client_name}}</Badge>
                      <Badge variant="outline" className="text-[10px]">{{tattoo_idea}}</Badge>
                      <Badge variant="outline" className="text-[10px]">{{appointment_date}}</Badge>
                      <Badge variant="outline" className="text-[10px]">{{artist_name}}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs"
                      onClick={() => {
                        setMessageContent(t.text);
                        setTab('create');
                        toast.success(`"${t.label}" template loaded`);
                      }}
                    >
                      Use This Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-2 gap-6 mt-4">
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
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Message Content</label>
                      <Textarea
                        value={messageContent}
                        onChange={e => setMessageContent(e.target.value)}
                        placeholder="Hi {{client_name}}, check out our latest designs..."
                        className="min-h-[120px]"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Variables: {{client_name}} {{tattoo_idea}} {{appointment_date}} {{artist_name}}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                  </CardContent>
                </Card>

                {/* Cost Estimate & Preview */}
                {recipients.length > 0 && (
                  <Card className="glass-card border-primary/30">
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Send Preview</p>
                          <div className="flex items-center gap-4 mt-1">
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
                          disabled={sending || !campaignName || !messageContent}
                          className="gap-2"
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
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">{c.campaign_name}</h3>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[400px] truncate">{c.message_content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not sent'}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            Cost: ₹{(c.total_recipients * COST_PER_MESSAGE).toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-5 text-center">
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
                          <p className="text-lg font-bold text-destructive">{c.total_recipients - c.messages_sent > 0 ? c.total_recipients - c.messages_sent : 0}</p>
                          <p className="text-[10px] text-muted-foreground">Failed</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
