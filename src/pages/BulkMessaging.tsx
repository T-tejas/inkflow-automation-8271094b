import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Upload, Users, BarChart3, Plus, Trash2,
  MessageSquare, CheckCircle2, Clock, Eye, AlertCircle, FileText
} from 'lucide-react';

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

const COST_PER_MESSAGE = 0.50; // ₹0.50 per message estimate

export default function BulkMessaging() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Create campaign form
  const [campaignName, setCampaignName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [ctaType, setCtaType] = useState<string>('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [sending, setSending] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }) as { data: Campaign[] | null };
    setCampaigns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Import from CRM leads
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

  // Parse pasted contacts (phone numbers, one per line or comma-separated)
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

  // CSV/Excel file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').slice(1); // skip header
    const newRecips: Recipient[] = lines.map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
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
      // Create campaign
      const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
        campaign_name: campaignName,
        message_content: messageContent,
        cta_type: ctaType || null,
        cta_label: ctaLabel || null,
        total_recipients: recipients.length,
        status: 'queued',
      } as any).select().single();

      if (campErr || !campaign) { toast.error('Failed to create campaign'); setSending(false); return; }

      // Insert recipients
      const recipRows = recipients.map(r => ({
        campaign_id: (campaign as any).id,
        phone: r.phone,
        name: r.name,
        status: 'pending',
      }));

      await supabase.from('campaign_recipients').insert(recipRows as any);

      // Trigger send
      const { error } = await supabase.functions.invoke('send-bulk-campaign', {
        body: { campaignId: (campaign as any).id },
      });

      if (error) {
        toast.error('Failed to send campaign');
      } else {
        toast.success(`Campaign queued! Sending to ${recipients.length} contacts...`);
        setCampaignName('');
        setMessageContent('');
        setCtaType('');
        setCtaLabel('');
        setRecipients([]);
        setTab('campaigns');
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Error creating campaign');
    }
    setSending(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-zinc-500/10 text-zinc-400',
      queued: 'bg-amber-500/10 text-amber-400',
      sending: 'bg-blue-500/10 text-blue-400',
      sent: 'bg-emerald-500/10 text-emerald-400',
      failed: 'bg-red-500/10 text-red-400',
    };
    return <Badge className={`${styles[status] || styles.draft} border-0`}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-1.5" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" /> CRM
            </Button>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-purple-500/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-purple-400" />
              </div>
              <h1 className="text-sm font-semibold">Bulk Messaging & Campaigns</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="create" className="data-[state=active]:bg-zinc-700 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Campaign
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-zinc-700 gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Campaigns ({campaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* Left: Campaign Details */}
              <div className="space-y-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Campaign Name</label>
                      <Input
                        value={campaignName}
                        onChange={e => setCampaignName(e.target.value)}
                        placeholder="e.g. March Promo"
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Message Content</label>
                      <Textarea
                        value={messageContent}
                        onChange={e => setMessageContent(e.target.value)}
                        placeholder="Hi {{name}}, check out our latest designs..."
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Use {'{{name}}'} to personalize with contact name</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">CTA Button Type</label>
                        <Select value={ctaType} onValueChange={setCtaType}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No CTA</SelectItem>
                            {CTA_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Button Label</label>
                        <Input
                          value={ctaLabel}
                          onChange={e => setCtaLabel(e.target.value)}
                          placeholder="e.g. Book Now"
                          className="bg-zinc-800 border-zinc-700 text-white"
                          disabled={!ctaType || ctaType === 'none'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Estimate */}
                {recipients.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Estimated Cost</p>
                        <p className="text-lg font-bold text-amber-400">
                          ₹{estimatedCost.toFixed(0)}
                          <span className="text-xs text-zinc-500 ml-1">({recipients.length} messages × ₹{COST_PER_MESSAGE})</span>
                        </p>
                      </div>
                      <Button
                        onClick={handleSendCampaign}
                        disabled={sending || !campaignName || !messageContent || recipients.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      >
                        {sending ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sending ? 'Sending...' : 'Send Campaign'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Recipients */}
              <div className="space-y-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-white">Recipients ({recipients.length})</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={importFromCRM} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs">
                          <Users className="h-3 w-3" /> Import from CRM
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileImport} className="hidden" />
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs" asChild>
                            <span><FileText className="h-3 w-3" /> CSV/Excel</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Manual paste */}
                    <div>
                      <Textarea
                        value={pasteInput}
                        onChange={e => setPasteInput(e.target.value)}
                        placeholder="Paste phone numbers (one per line)&#10;+919876543210&#10;+919876543211, Name"
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[80px] text-xs"
                      />
                      <Button variant="outline" size="sm" onClick={handlePaste} className="mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1 text-xs">
                        <Plus className="h-3 w-3" /> Add Contacts
                      </Button>
                    </div>

                    {/* Recipients list */}
                    {recipients.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-zinc-400">{recipients.length} contacts added</p>
                          <Button variant="ghost" size="sm" onClick={() => setRecipients([])} className="text-red-400 hover:text-red-300 text-xs gap-1">
                            <Trash2 className="h-3 w-3" /> Clear All
                          </Button>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-1">
                            {recipients.slice(0, 50).map((r, i) => (
                              <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-zinc-800/50 text-xs">
                                <span className="text-white">{r.name}</span>
                                <span className="text-zinc-500">{r.phone}</span>
                              </div>
                            ))}
                            {recipients.length > 50 && (
                              <p className="text-xs text-zinc-500 text-center py-2">+ {recipients.length - 50} more</p>
                            )}
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
                <div className="text-center py-16 text-zinc-500">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No campaigns yet</p>
                </div>
              )}
              {campaigns.map(c => (
                <Card key={c.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white">{c.campaign_name}</h3>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 max-w-[400px] truncate">{c.message_content}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not sent yet'}
                        </p>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-lg font-bold text-white">{c.messages_sent}</p>
                          <p className="text-[10px] text-zinc-500">Sent</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-400">{c.messages_delivered}</p>
                          <p className="text-[10px] text-zinc-500">Delivered</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-400">{c.messages_read}</p>
                          <p className="text-[10px] text-zinc-500">Read</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-purple-400">{c.replies_received}</p>
                          <p className="text-[10px] text-zinc-500">Replies</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-400">{c.bookings_generated}</p>
                          <p className="text-[10px] text-zinc-500">Bookings</p>
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
