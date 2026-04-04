import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Key, Webhook, Zap } from 'lucide-react';
import { toast } from 'sonner';
import SettingField from './SettingField';

interface Props {
  settings: Record<string, string>;
  showTokens: Record<string, boolean>;
  onUpdate: (key: string, value: string) => void;
  onToggle: (key: string) => void;
}

const FIELDS = [
  { key: 'meta_app_id', label: 'Meta App ID', icon: Globe, sensitive: false },
  { key: 'meta_app_secret', label: 'Meta App Secret', icon: Key, sensitive: true },
  { key: 'meta_webhook_verify_token', label: 'Webhook Verify Token', icon: Webhook, sensitive: true },
  { key: 'meta_page_id', label: 'Page ID', icon: Key, sensitive: false },
];

const MetaSettingsCard = ({ settings, showTokens, onUpdate, onToggle }: Props) => {
  const testConnection = async () => {
    const appId = settings.meta_app_id;
    const token = settings.instagram_page_access_token || settings.whatsapp_access_token;
    if (!appId || !token) { toast.error('Meta App ID or access token not set'); return; }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${appId}?access_token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      toast.success(`Connected! App: ${data.name || data.id}`);
    } catch (e: any) {
      toast.error(`Test failed: ${e.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Meta / Facebook Configuration</CardTitle>
            <CardDescription>Meta developer app credentials & webhook settings</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Test Connection
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map(f => (
          <SettingField
            key={f.key}
            settingKey={f.key}
            label={f.label}
            icon={f.icon}
            sensitive={f.sensitive}
            value={settings[f.key] || ''}
            showToken={!!showTokens[f.key]}
            onToggleShow={() => onToggle(f.key)}
            onChange={v => onUpdate(f.key, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default MetaSettingsCard;
