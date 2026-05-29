import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Search, RefreshCw, MessageCircle, Sparkles, BarChart3, Zap } from 'lucide-react';
import { useMessageTemplates, MessageTemplate, TemplateCategory } from '@/hooks/useMessageTemplates';
import { TemplateCard } from '@/components/whatsapp/TemplateCard';
import { PreviewDialog, SendTestDialog, UseTemplateDialog } from '@/components/whatsapp/TemplateDialogs';
import { AutomationRulesPanel } from '@/components/whatsapp/AutomationRulesPanel';
import { supabase } from '@/integrations/supabase/client';

type TabKey = 'all' | TemplateCategory | 'favorites' | 'recent';

interface Analytics { sent: number; readRate: number; replyRate: number; }

export default function WhatsAppTemplates() {
  const navigate = useNavigate();
  const { templates, loading, syncing, syncFromMeta, toggleFavorite, incrementUsage, fetchAll } = useMessageTemplates();
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [previewT, setPreviewT] = useState<MessageTemplate | null>(null);
  const [testT, setTestT] = useState<MessageTemplate | null>(null);
  const [useT, setUseT] = useState<MessageTemplate | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});

  // Load analytics per template name from whatsapp_messages
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('whatsapp_messages').select('template_name, status, read_at, lead_id').limit(5000);
      const map: Record<string, { sent: number; read: number; leadIds: Set<string> }> = {};
      (data || []).forEach((m: any) => {
        if (!m.template_name) return;
        if (!map[m.template_name]) map[m.template_name] = { sent: 0, read: 0, leadIds: new Set() };
        if (m.status === 'sent' || m.status === 'delivered' || m.status === 'read') map[m.template_name].sent++;
        if (m.read_at) map[m.template_name].read++;
        if (m.lead_id) map[m.template_name].leadIds.add(m.lead_id);
      });
      // Reply rate: count leads that had incoming messages after a sent template message — proxy via leads with last_incoming_at
      const { data: leads } = await supabase.from('leads').select('id, last_incoming_at').limit(5000);
      const repliedSet = new Set((leads || []).filter((l: any) => l.last_incoming_at).map((l: any) => l.id));
      const result: Record<string, Analytics> = {};
      Object.entries(map).forEach(([name, v]) => {
        const replyCount = Array.from(v.leadIds).filter(id => repliedSet.has(id)).length;
        result[name] = {
          sent: v.sent,
          readRate: v.sent ? (v.read / v.sent) * 100 : 0,
          replyRate: v.leadIds.size ? (replyCount / v.leadIds.size) * 100 : 0,
        };
      });
      setAnalytics(result);
    })();
  }, [templates.length]);

  const filtered = useMemo(() => {
    let list = templates;
    if (tab === 'favorites') list = list.filter(t => t.is_favorite);
    else if (tab === 'recent') list = [...list].filter(t => t.last_used_at).sort((a, b) => (b.last_used_at || '').localeCompare(a.last_used_at || ''));
    else if (tab !== 'all') list = list.filter(t => t.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.body_text.toLowerCase().includes(q));
    }
    return list;
  }, [templates, tab, search]);

  const stats = useMemo(() => {
    const totalSent = Object.values(analytics).reduce((s, a) => s + a.sent, 0);
    const totalRead = Object.values(analytics).reduce((s, a) => s + (a.sent * a.readRate / 100), 0);
    return {
      total: templates.length,
      approved: templates.filter(t => t.status === 'approved').length,
      sent: totalSent,
      readRate: totalSent ? (totalRead / totalSent) * 100 : 0,
    };
  }, [templates, analytics]);

  const onSent = () => { if (useT) incrementUsage(useT.id); fetchAll(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#25d366] flex items-center justify-center"><MessageCircle className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="font-semibold text-base">WhatsApp Templates</h1>
              <p className="text-xs text-muted-foreground">Marketing + Utility message library</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={syncFromMeta} disabled={syncing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync from Meta
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Templates</div><div className="text-2xl font-bold mt-1">{stats.total}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Approved</div><div className="text-2xl font-bold mt-1 text-green-600">{stats.approved}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Messages sent</div><div className="text-2xl font-bold mt-1">{stats.sent}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Read rate</div><div className="text-2xl font-bold mt-1">{stats.readRate.toFixed(0)}%</div></Card>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
          <div className="flex items-center gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="utility">Utility</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="authentication">Auth</TabsTrigger>
              <TabsTrigger value="favorites">⭐ Favorites</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="automation" className="gap-1"><Zap className="h-3.5 w-3.5" /> Automation</TabsTrigger>
            </TabsList>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…" className="pl-9 h-9" />
            </div>
          </div>

          {(['all','utility','marketing','authentication','favorites','recent'] as TabKey[]).map(k => (
            <TabsContent key={k} value={k} className="mt-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-12">Loading…</div>
              ) : filtered.length === 0 ? (
                <Card className="p-12 text-center">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No templates here yet.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map(t => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      analytics={analytics[t.name]}
                      onPreview={() => setPreviewT(t)}
                      onTest={() => setTestT(t)}
                      onUse={() => setUseT(t)}
                      onToggleFavorite={() => toggleFavorite(t.id, !t.is_favorite)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="automation" className="mt-4">
            <AutomationRulesPanel templates={templates} />
          </TabsContent>
        </Tabs>
      </main>

      <PreviewDialog template={previewT} open={!!previewT} onOpenChange={o => !o && setPreviewT(null)} />
      <SendTestDialog template={testT} open={!!testT} onOpenChange={o => !o && setTestT(null)} onSent={() => testT && incrementUsage(testT.id)} />
      <UseTemplateDialog template={useT} open={!!useT} onOpenChange={o => !o && setUseT(null)} onSent={onSent} />
    </div>
  );
}
