import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Bot, Plus, Trash2, GripVertical, MessageSquare, Sparkles, AlertTriangle, RefreshCw, Pencil, Check, X
} from 'lucide-react';

interface ChatbotRule {
  id: string;
  keywords: string[];
  reply_text: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export function ChatbotRulesManager() {
  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [newKeywords, setNewKeywords] = useState('');
  const [newReply, setNewReply] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState('');
  const [editReply, setEditReply] = useState('');

  useEffect(() => {
    fetchRules();
    fetchChatbotEnabled();
  }, []);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('chatbot_rules')
      .select('*')
      .order('priority', { ascending: false });
    if (!error && data) setRules(data as unknown as ChatbotRule[]);
    setLoading(false);
  };

  const fetchChatbotEnabled = async () => {
    const { data } = await supabase
      .from('whatsapp_settings')
      .select('setting_value')
      .eq('setting_key', 'chatbot_enabled')
      .single();
    setChatbotEnabled(data?.setting_value !== 'false');
  };

  const toggleChatbot = async (enabled: boolean) => {
    setChatbotEnabled(enabled);
    await supabase
      .from('whatsapp_settings')
      .upsert(
        { setting_key: 'chatbot_enabled', setting_value: String(enabled), updated_at: new Date().toISOString() } as any,
        { onConflict: 'setting_key' }
      );
    toast.success(enabled ? 'Chatbot enabled' : 'Chatbot disabled');
  };

  const addRule = async () => {
    if (!newKeywords.trim() || !newReply.trim()) {
      toast.error('Enter keywords and reply text');
      return;
    }
    setAdding(true);
    const keywords = newKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const maxPriority = rules.length > 0 ? Math.max(...rules.map(r => r.priority)) : 0;

    const { error } = await supabase
      .from('chatbot_rules')
      .insert({ keywords, reply_text: newReply, priority: maxPriority + 1 } as any);

    if (error) {
      toast.error('Failed to add rule');
    } else {
      toast.success('Rule added');
      setNewKeywords('');
      setNewReply('');
      fetchRules();
    }
    setAdding(false);
  };

  const toggleRule = async (id: string, currentActive: boolean) => {
    await supabase
      .from('chatbot_rules')
      .update({ is_active: !currentActive } as any)
      .eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentActive } : r));
  };

  const deleteRule = async (id: string) => {
    await supabase.from('chatbot_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const startEdit = (rule: ChatbotRule) => {
    setEditingId(rule.id);
    setEditKeywords(rule.keywords.join(', '));
    setEditReply(rule.reply_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKeywords('');
    setEditReply('');
  };

  const saveEdit = async (id: string) => {
    if (!editKeywords.trim() || !editReply.trim()) {
      toast.error('Keywords and reply cannot be empty');
      return;
    }
    const keywords = editKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const { error } = await supabase
      .from('chatbot_rules')
      .update({ keywords, reply_text: editReply } as any)
      .eq('id', id);
    if (error) {
      toast.error('Failed to update rule');
    } else {
      setRules(prev => prev.map(r => r.id === id ? { ...r, keywords, reply_text: editReply } : r));
      toast.success('Rule updated');
      cancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-white">AI Auto-Reply Chatbot</p>
            <p className="text-xs text-zinc-500">Auto-respond to incoming WhatsApp messages based on keywords</p>
          </div>
        </div>
        <Switch checked={chatbotEnabled} onCheckedChange={toggleChatbot} />
      </div>

      {chatbotEnabled && (
        <>
          {/* Escalation info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300/80">
              Messages that don't match any keyword rule are automatically <strong>escalated to staff</strong> and flagged in the chat inbox.
            </p>
          </div>

          {/* Add new rule */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add New Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Keywords (comma separated)</label>
                <Input
                  value={newKeywords}
                  onChange={e => setNewKeywords(e.target.value)}
                  placeholder="e.g. price, cost, rate, kitna"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Auto-Reply Message</label>
                <Textarea
                  value={newReply}
                  onChange={e => setNewReply(e.target.value)}
                  placeholder="The reply message to send when any keyword matches..."
                  rows={2}
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                />
              </div>
              <Button
                size="sm"
                onClick={addRule}
                disabled={adding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {adding ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Add Rule
              </Button>
            </CardContent>
          </Card>

          {/* Existing rules */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Active Rules ({rules.filter(r => r.is_active).length}/{rules.length})
            </h4>
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border transition-all ${
                  rule.is_active
                    ? 'bg-zinc-800 border-zinc-700'
                    : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {rule.keywords.map(kw => (
                        <Badge
                          key={kw}
                          className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-mono"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2">
                      <MessageSquare className="h-3 w-3 inline mr-1 text-zinc-500" />
                      {rule.reply_text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="text-center py-6 text-zinc-500 text-sm">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No chatbot rules yet. Add your first rule above.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
