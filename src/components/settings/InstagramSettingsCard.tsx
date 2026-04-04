import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Instagram, Key, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SettingField from './SettingField';

interface Props {
  settings: Record<string, string>;
  showTokens: Record<string, boolean>;
  onUpdate: (key: string, value: string) => void;
  onToggle: (key: string) => void;
}

const FIELDS = [
  { key: 'instagram_page_id', label: 'Instagram Page ID', icon: Key, sensitive: false },
  { key: 'instagram_page_access_token', label: 'Page Access Token', icon: Key, sensitive: true, multiline: true },
];

const InstagramSettingsCard = ({ settings, showTokens, onUpdate, onToggle }: Props) => {
  const testConnection = async () => {
    const pageId = settings.instagram_page_id;
    const token = settings.instagram_page_access_token;
    if (!pageId || !token) { toast.error('Instagram credentials not set'); return; }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=name,id&access_token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      toast.success(`Connected! Page: ${data.name} (${data.id})`);
    } catch (e: any) {
      toast.error(`Test failed: ${e.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Instagram Configuration</CardTitle>
            <CardDescription>Instagram Business account & Meta Graph API</CardDescription>
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
            multiline={f.multiline}
            value={settings[f.key] || ''}
            showToken={!!showTokens[f.key]}
            onToggleShow={() => onToggle(f.key)}
            onChange={v => onUpdate(f.key, v)}
          />
        ))}
        <Separator />
        <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-1">Webhook URL (for Meta App Dashboard):</p>
          <code className="text-xs bg-background px-2 py-1 rounded block break-all">
            {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/instagram-webhook`}
          </code>
          <p className="mt-2 font-medium">Verify Token:</p>
          <code className="text-xs bg-background px-2 py-1 rounded">f19_instagram_verify</code>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstagramSettingsCard;
