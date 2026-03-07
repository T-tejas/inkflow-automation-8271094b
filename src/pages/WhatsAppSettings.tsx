import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft, Settings, Key, Phone, Calendar, Webhook, AppWindow,
  HelpCircle, ExternalLink, Shield, Eye, EyeOff, Bug, Unplug, RefreshCw,
  CheckCircle2, XCircle, Info
} from 'lucide-react';

type SettingsMap = Record<string, string>;

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Editable fields
  const [editValues, setEditValues] = useState<SettingsMap>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('setting_key, setting_value');

    if (error) {
      toast.error('Failed to load settings');
      setLoading(false);
      return;
    }

    const map: SettingsMap = {};
    (data || []).forEach((r: any) => { map[r.setting_key] = r.setting_value; });
    setSettings(map);
    setEditValues(map);
    setLoading(false);
  };

  const saveSetting = async (key: string) => {
    setSaving(key);
    const value = editValues[key] || '';
    const { error } = await supabase
      .from('whatsapp_settings')
      .upsert(
        { setting_key: key, setting_value: value, updated_at: new Date().toISOString() } as any,
        { onConflict: 'setting_key' }
      );

    if (error) {
      toast.error(`Failed to save ${key}`);
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Setting saved');
    }
    setSaving(null);
  };

  const isConfigured = (key: string) => !!settings[key] && settings[key] !== '' && settings[key] !== 'false';

  const StatusBadge = ({ configured }: { configured: boolean }) => (
    <Badge
      className={configured
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
      }
    >
      {configured ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</> : <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>}
    </Badge>
  );

  const toggleVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SecretField = ({ label, settingKey, placeholder }: { label: string; settingKey: string; placeholder?: string }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showSecrets[settingKey] ? 'text' : 'password'}
            value={editValues[settingKey] || ''}
            onChange={e => setEditValues(prev => ({ ...prev, [settingKey]: e.target.value }))}
            placeholder={placeholder || `Enter ${label}`}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
          />
          <button
            onClick={() => toggleVisibility(settingKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showSecrets[settingKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          size="sm"
          onClick={() => saveSetting(settingKey)}
          disabled={saving === settingKey}
          className="bg-amber-500 hover:bg-amber-600 text-black font-medium whitespace-nowrap"
        >
          {saving === settingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : (isConfigured(settingKey) ? 'Update' : 'Add New')}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1000px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-1.5" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-green-500/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-green-400" />
              </div>
              <h1 className="text-sm font-semibold">WhatsApp Integrations</h1>
            </div>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Shield className="h-3 w-3 mr-1" /> Admin Only
          </Badge>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-52px)]">
        <main className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">

          {/* Facebook App Configuration */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <AppWindow className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Facebook App Configuration</CardTitle>
                    <CardDescription className="text-zinc-500">Configure your Facebook App credentials</CardDescription>
                  </div>
                </div>
                <StatusBadge configured={isConfigured('facebook_app_id') && isConfigured('facebook_app_secret')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretField label="Facebook App ID" settingKey="facebook_app_id" placeholder="Enter your Facebook App ID" />
              <SecretField label="Facebook App Secret" settingKey="facebook_app_secret" placeholder="Enter your Facebook App Secret" />
            </CardContent>
          </Card>

          {/* Access Token */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Access Token</CardTitle>
                    <CardDescription className="text-zinc-500">WhatsApp API access token</CardDescription>
                  </div>
                </div>
                <StatusBadge configured={isConfigured('access_token')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretField label="Access Token" settingKey="access_token" placeholder="Enter your access token" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-1.5"
                  onClick={() => {
                    const token = settings['access_token'];
                    if (!token) { toast.error('No token to debug'); return; }
                    window.open(`https://developers.facebook.com/tools/debug/accesstoken/?access_token=${encodeURIComponent(token)}`, '_blank');
                  }}
                >
                  <Bug className="h-3.5 w-3.5" /> Debug Token
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300/80">
                  Temporary tokens expire in 24 hours. Use a <strong>System User permanent token</strong> for production to avoid service interruptions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Business Account */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">WhatsApp Business Account</CardTitle>
                    <CardDescription className="text-zinc-500">Your WABA ID for API access</CardDescription>
                  </div>
                </div>
                <StatusBadge configured={isConfigured('whatsapp_business_account_id')} />
              </div>
            </CardHeader>
            <CardContent>
              <SecretField label="WhatsApp Business Account ID" settingKey="whatsapp_business_account_id" placeholder="Enter your WABA ID" />
            </CardContent>
          </Card>

          {/* Google Calendar Integration */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Google Calendar Integration</CardTitle>
                    <CardDescription className="text-zinc-500">Sync appointments with Google Calendar</CardDescription>
                  </div>
                </div>
                <StatusBadge configured={isConfigured('google_calendar_connected')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConfigured('google_calendar_connected') ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{settings['google_calendar_account'] || 'Connected Account'}</p>
                        <p className="text-xs text-zinc-500">Google Calendar connected</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                      onClick={async () => {
                        await saveSetting('google_calendar_connected');
                        setEditValues(prev => ({ ...prev, google_calendar_connected: 'false', google_calendar_account: '' }));
                        await saveSetting('google_calendar_account');
                        toast.success('Google Calendar disconnected');
                        fetchSettings();
                      }}
                    >
                      <Unplug className="h-3.5 w-3.5" /> Disconnect
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-white">Auto-sync appointments</p>
                      <p className="text-xs text-zinc-500">Automatically sync booking appointments to calendar</p>
                    </div>
                    <Switch
                      checked={settings['calendar_sync_enabled'] === 'true'}
                      onCheckedChange={async (checked) => {
                        setEditValues(prev => ({ ...prev, calendar_sync_enabled: String(checked) }));
                        const { error } = await supabase
                          .from('whatsapp_settings')
                          .update({ setting_value: String(checked), updated_at: new Date().toISOString() } as any)
                          .eq('setting_key', 'calendar_sync_enabled');
                        if (!error) {
                          setSettings(prev => ({ ...prev, calendar_sync_enabled: String(checked) }));
                          toast.success(checked ? 'Calendar sync enabled' : 'Calendar sync disabled');
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  onClick={() => toast.info('Google Calendar OAuth coming soon. Stay tuned!')}
                >
                  <Calendar className="h-4 w-4" /> Connect Google Calendar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Webhook Settings */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Webhook className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Webhook Settings</CardTitle>
                    <CardDescription className="text-zinc-500">Configure incoming message webhooks from Meta</CardDescription>
                  </div>
                </div>
                {/* Status indicator */}
                {(() => {
                  const hasToken = isConfigured('webhook_verify_token');
                  const enabled = settings['webhook_enabled'] === 'true';
                  if (!hasToken) return (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                      <XCircle className="h-3 w-3 mr-1" /> Not Configured
                    </Badge>
                  );
                  if (hasToken && enabled) return (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  );
                  return (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                      <Info className="h-3 w-3 mr-1" /> Disabled
                    </Badge>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Callback URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Callback URL</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`}
                    className="bg-zinc-800 border-zinc-700 text-zinc-300 cursor-default"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white whitespace-nowrap"
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`);
                      toast.success('Callback URL copied');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">Paste this URL in your Meta App → WhatsApp → Configuration → Callback URL</p>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Verify Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Verify Token</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSecrets['webhook_verify_token'] ? 'text' : 'password'}
                      value={editValues['webhook_verify_token'] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                      placeholder="Click Generate or enter your own token"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                    />
                    <button
                      onClick={() => toggleVisibility('webhook_verify_token')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showSecrets['webhook_verify_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white whitespace-nowrap"
                    onClick={() => {
                      const token = crypto.randomUUID();
                      setEditValues(prev => ({ ...prev, webhook_verify_token: token }));
                      setShowSecrets(prev => ({ ...prev, webhook_verify_token: true }));
                      toast.info('Token generated — click Save to apply');
                    }}
                  >
                    Generate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveSetting('webhook_verify_token')}
                    disabled={saving === 'webhook_verify_token'}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-medium whitespace-nowrap"
                  >
                    {saving === 'webhook_verify_token' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">Paste this same token in your Meta App → WhatsApp → Configuration → Verify Token</p>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div>
                  <p className="text-sm font-medium text-white">Enable Webhook</p>
                  <p className="text-xs text-zinc-500">Toggle webhook processing on/off</p>
                </div>
                <Switch
                  checked={settings['webhook_enabled'] === 'true'}
                  onCheckedChange={async (checked) => {
                    const { error } = await supabase
                      .from('whatsapp_settings')
                      .update({ setting_value: String(checked), updated_at: new Date().toISOString() } as any)
                      .eq('setting_key', 'webhook_enabled');
                    if (!error) {
                      setSettings(prev => ({ ...prev, webhook_enabled: String(checked) }));
                      toast.success(checked ? 'Webhook enabled' : 'Webhook disabled');
                    }
                  }}
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <HelpCircle className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-cyan-300/80">
                  Copy the <strong>Callback URL</strong> and <strong>Verify Token</strong> into your Meta App's WhatsApp webhook configuration. Meta will send a GET request to verify, then POST incoming messages here.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* App Lists */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <AppWindow className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Connected Apps</CardTitle>
                    <CardDescription className="text-zinc-500">Facebook apps connected to this account</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isConfigured('facebook_app_id') ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <AppWindow className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Facebook App</p>
                      <p className="text-xs text-zinc-500 font-mono">{settings['facebook_app_id']?.slice(0, 8)}...{settings['facebook_app_id']?.slice(-4)}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Connected</Badge>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <AppWindow className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No apps connected yet</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-1.5 w-full"
                onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
              >
                <AppWindow className="h-3.5 w-3.5" /> Add New App
              </Button>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 w-full"
                onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/cloud-api/get-started', '_blank')}
              >
                <HelpCircle className="h-4 w-4" /> Help & More Information <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          <div className="h-6" />
        </main>
      </ScrollArea>
    </div>
  );
}
