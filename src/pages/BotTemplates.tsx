import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Bot, Save, RefreshCw, MessageSquare } from 'lucide-react';

interface BotTemplate {
  id: string;
  template_key: string;
  template_label: string;
  response_text: string;
  is_active: boolean;
  updated_at: string;
}

export default function BotTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('bot_response_templates').select('*').order('created_at') as { data: BotTemplate[] | null };
    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from('bot_response_templates').update({
      response_text: editText,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Template updated! Changes are live instantly.');
      setEditingId(null);
      fetchTemplates();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('bot_response_templates').update({ is_active: !current, updated_at: new Date().toISOString() } as any).eq('id', id);
    fetchTemplates();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-3">
        <div className="flex items-center justify-between max-w-[900px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => navigate('/admin/settings/whatsapp')}>
              <ArrowLeft className="h-4 w-4" /> WhatsApp Settings
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">AI Response Templates</h1>
            </div>
          </div>
          <Badge variant="outline">
            <MessageSquare className="h-3 w-3 mr-1" /> {templates.length} Templates
          </Badge>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-52px)]">
        <main className="max-w-[900px] mx-auto px-6 py-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Edit the AI assistant's responses. Changes take effect instantly. You can also edit these via WhatsApp by sending "admin" from the studio owner's number.
          </p>
          {templates.map(t => (
            <Card key={t.id} className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm text-foreground">{t.template_label}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{t.template_key}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{t.is_active ? 'Active' : 'Disabled'}</span>
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(t.id)} disabled={saving} className="gap-1">
                        {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setEditingId(t.id); setEditText(t.response_text); }}
                  >
                    {t.response_text}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Last updated: {new Date(t.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          ))}
        </main>
      </ScrollArea>
    </div>
  );
}
