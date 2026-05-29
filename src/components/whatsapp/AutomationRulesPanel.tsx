import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAutomationRules, TriggerEvent } from '@/hooks/useAutomationRules';
import { MessageTemplate } from '@/hooks/useMessageTemplates';
import { Zap, Info } from 'lucide-react';

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  lead_created: 'New lead created',
  appointment_24h_before: '24h before appointment',
  no_reply_48h: 'No reply after 48h',
  tattoo_completed: 'After tattoo completion',
  inactive_30d: 'Inactive for 30 days',
  birthday: 'Client birthday',
  repeat_client_60d: 'Repeat client (60d)',
};

export function AutomationRulesPanel({ templates }: { templates: MessageTemplate[] }) {
  const { rules, loading, updateRule } = useAutomationRules();

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading rules…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Turn on automation rules to send templates automatically. Each rule fires when its trigger event happens and sends the chosen template via WhatsApp.</p>
      </div>
      {rules.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <Zap className={`h-5 w-5 ${r.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <h4 className="font-medium text-sm">{r.rule_name}</h4>
                <p className="text-xs text-muted-foreground">{TRIGGER_LABELS[r.trigger_event as TriggerEvent] || r.trigger_event}</p>
              </div>
              {r.is_active && <Badge className="bg-green-100 text-green-700 border-green-300" variant="outline">Active</Badge>}
            </div>
            <Switch checked={r.is_active} onCheckedChange={v => updateRule(r.id, { is_active: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={r.template_id || ''} onValueChange={v => updateRule(r.id, { template_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick a template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name.replace(/_/g, ' ')} ({t.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Delay (hours)</Label>
              <Input type="number" min={0} value={r.delay_hours} onChange={e => updateRule(r.id, { delay_hours: Number(e.target.value) || 0 })} className="h-9" />
            </div>
          </div>
          {r.run_count > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">Ran {r.run_count} times • Last: {r.last_run_at ? new Date(r.last_run_at).toLocaleString() : '—'}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
