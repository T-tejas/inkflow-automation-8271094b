import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Key, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SettingField from './SettingField';

interface Props {
  settings: Record<string, string>;
  showTokens: Record<string, boolean>;
  onUpdate: (key: string, value: string) => void;
  onToggle: (key: string) => void;
  gcConnected: boolean;
  gcChecking: boolean;
  gcConnect: () => void;
}

const FIELDS = [
  { key: 'google_client_id', label: 'Google Client ID', icon: Key, sensitive: false },
  { key: 'google_client_secret', label: 'Google Client Secret', icon: Key, sensitive: true },
  { key: 'google_calendar_id', label: 'Calendar ID', icon: Calendar, sensitive: false },
];

const GoogleCalendarSettingsCard = ({ settings, showTokens, onUpdate, onToggle, gcConnected, gcChecking, gcConnect }: Props) => {
  const testCalendar = async () => {
    try {
      const { error } = await supabase.functions.invoke('google-calendar-event', {
        body: {
          summary: '✅ CRM Test Event',
          description: 'Test calendar sync from CRM settings',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          test: true,
        },
      });
      if (error) throw error;
      toast.success('Test event created on Google Calendar!');
    } catch (e: any) {
      toast.error(`Test failed: ${e.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Google Calendar</CardTitle>
            <CardDescription>Sync appointments & design tasks</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={testCalendar} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Test Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {gcChecking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Checking connection...
          </div>
        ) : gcConnected ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-medium">Google Calendar is connected and syncing</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Connect Google Calendar to auto-sync appointments and design deadlines.</p>
            <Button onClick={gcConnect} className="gap-1.5">
              <Calendar className="h-4 w-4" /> Connect Google Calendar
            </Button>
          </div>
        )}

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

export default GoogleCalendarSettingsCard;
