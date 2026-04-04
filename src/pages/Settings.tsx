import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft, Settings as SettingsIcon, Key, Phone, Calendar, Webhook,
  Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Instagram, MessageCircle,
  Save, Globe
} from 'lucide-react';

type SettingsMap = Record<string, string>;

const SETTING_KEYS = [
  'whatsapp_access_token',
  'whatsapp_phone_number_id',
  'facebook_app_id',
  'waba_id',
  'webhook_verify_token',
  'admin_phone',
  'google_review_url',
  'instagram_page_id',
  'instagram_page_access_token',
];

const Settings = () => {
  const navigate = useNavigate();
  const { connected: gcConnected, checking: gcChecking, connect: gcConnect } = useGoogleCalendar();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('whatsapp_settings').select('*');
    if (data) {
      const map: SettingsMap = {};
      data.forEach(s => { map[s.setting_key] = s.setting_value; });
      setSettings(map);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existing } = await supabase
          .from('whatsapp_settings')
          .select('id')
          .eq('setting_key', key)
          .maybeSingle();

        if (existing) {
          await supabase.from('whatsapp_settings').update({
            setting_value: value,
            updated_at: new Date().toISOString(),
          }).eq('setting_key', key);
        } else {
          await supabase.from('whatsapp_settings').insert({
            setting_key: key,
            setting_value: value,
          });
        }
      }
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const toggleShow = (key: string) => {
    setShowTokens(p => ({ ...p, [key]: !p[key] }));
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(p => ({ ...p, [key]: value }));
  };

  const isInstagramConnected = !!(settings.instagram_page_id && settings.instagram_page_access_token);
  const isWhatsAppConnected = !!(settings.whatsapp_access_token && settings.whatsapp_phone_number_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Settings</h1>
        <Button onClick={handleSave} disabled={saving} size="sm" className="ml-auto gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-65px)]">
        <div className="max-w-4xl mx-auto p-6 space-y-6">

          {/* Connection Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium text-sm">WhatsApp</p>
                  <Badge className={isWhatsAppConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                    {isWhatsAppConnected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <Instagram className="h-8 w-8 text-pink-500" />
                <div>
                  <p className="font-medium text-sm">Instagram</p>
                  <Badge className={isInstagramConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                    {isInstagramConnected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Google Calendar</p>
                  {gcChecking ? (
                    <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Checking</Badge>
                  ) : (
                    <Badge className={gcConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
                      {gcConnected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">WhatsApp Configuration</CardTitle>
                  <CardDescription>Meta WhatsApp Business API settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'whatsapp_access_token', label: 'Access Token', icon: Key, sensitive: true },
                { key: 'whatsapp_phone_number_id', label: 'Phone Number ID', icon: Phone, sensitive: false },
                { key: 'facebook_app_id', label: 'Facebook App ID', icon: Globe, sensitive: false },
                { key: 'waba_id', label: 'WABA ID', icon: Key, sensitive: false },
                { key: 'webhook_verify_token', label: 'Webhook Verify Token', icon: Webhook, sensitive: true },
                { key: 'admin_phone', label: 'Admin Phone (+91)', icon: Phone, sensitive: false },
                { key: 'google_review_url', label: 'Google Review URL', icon: Globe, sensitive: false },
              ].map(({ key, label, icon: Icon, sensitive }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={sensitive && !showTokens[key] ? 'password' : 'text'}
                      value={settings[key] || ''}
                      onChange={e => updateSetting(key, e.target.value)}
                      placeholder={`Enter ${label}`}
                    />
                    {sensitive && (
                      <Button variant="outline" size="icon" onClick={() => toggleShow(key)}>
                        {showTokens[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instagram Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Instagram Configuration</CardTitle>
                  <CardDescription>Instagram Business account & Meta Graph API</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'instagram_page_id', label: 'Instagram Page ID', sensitive: false },
                { key: 'instagram_page_access_token', label: 'Page Access Token', sensitive: true },
              ].map(({ key, label, sensitive }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" /> {label}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={sensitive && !showTokens[key] ? 'password' : 'text'}
                      value={settings[key] || ''}
                      onChange={e => updateSetting(key, e.target.value)}
                      placeholder={`Enter ${label}`}
                    />
                    {sensitive && (
                      <Button variant="outline" size="icon" onClick={() => toggleShow(key)}>
                        {showTokens[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium mb-1">Webhook URL (for Meta App Dashboard):</p>
                <code className="text-xs bg-background px-2 py-1 rounded block break-all">
                  https://edwmlzhbrtchnjfdntrc.supabase.co/functions/v1/instagram-webhook
                </code>
                <p className="mt-2 font-medium">Verify Token:</p>
                <code className="text-xs bg-background px-2 py-1 rounded">f19_instagram_verify</code>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  <CardDescription>Sync appointments & design tasks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;
