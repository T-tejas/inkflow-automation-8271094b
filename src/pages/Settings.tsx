import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ArrowLeft, Settings as SettingsIcon, Save, MessageCircle, Instagram, Calendar, Globe } from 'lucide-react';
import ConnectionStatusCard from '@/components/settings/ConnectionStatusCard';
import WhatsAppSettingsCard from '@/components/settings/WhatsAppSettingsCard';
import InstagramSettingsCard from '@/components/settings/InstagramSettingsCard';
import MetaSettingsCard from '@/components/settings/MetaSettingsCard';
import GoogleCalendarSettingsCard from '@/components/settings/GoogleCalendarSettingsCard';
import GoogleReviewSettingsCard from '@/components/settings/GoogleReviewSettingsCard';
import StyleArtistMappingCard from '@/components/settings/StyleArtistMappingCard';

type SettingsMap = Record<string, string>;

const SETTING_KEYS = [
  'whatsapp_access_token', 'whatsapp_phone_number_id', 'facebook_app_id', 'waba_id',
  'webhook_verify_token', 'admin_phone', 'google_review_url',
  'google_business_name', 'google_place_id',
  'instagram_page_id', 'instagram_page_access_token',
  'instagram_page_id_2', 'instagram_page_access_token_2',
  'meta_app_id', 'meta_app_secret', 'meta_webhook_verify_token', 'meta_page_id',
  'google_client_id', 'google_client_secret', 'google_calendar_id',
];

const Settings = () => {
  const navigate = useNavigate();
  const { connected: gcConnected, checking: gcChecking, connect: gcConnect } = useGoogleCalendar();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchSettings(); }, []);

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
          .from('whatsapp_settings').select('id').eq('setting_key', key).maybeSingle();
        if (existing) {
          await supabase.from('whatsapp_settings').update({ setting_value: value, updated_at: new Date().toISOString() }).eq('setting_key', key);
        } else {
          await supabase.from('whatsapp_settings').insert({ setting_key: key, setting_value: value });
        }
      }
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const toggleShow = (key: string) => setShowTokens(p => ({ ...p, [key]: !p[key] }));
  const updateSetting = (key: string, value: string) => setSettings(p => ({ ...p, [key]: value }));

  const isInstagramConnected = !!(settings.instagram_page_id && settings.instagram_page_access_token);
  const isWhatsAppConnected = !!(settings.whatsapp_access_token && settings.whatsapp_phone_number_id);
  const isMetaConnected = !!(settings.meta_app_id && (settings.instagram_page_access_token || settings.whatsapp_access_token));

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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ConnectionStatusCard icon={MessageCircle} iconColor="text-green-500" label="WhatsApp" connected={isWhatsAppConnected} />
            <ConnectionStatusCard icon={Instagram} iconColor="text-pink-500" label="Instagram" connected={isInstagramConnected} />
            <ConnectionStatusCard icon={Globe} iconColor="text-blue-500" label="Meta / Facebook" connected={isMetaConnected} />
            <ConnectionStatusCard icon={Calendar} iconColor="text-purple-500" label="Google Calendar" connected={gcConnected} checking={gcChecking} />
          </div>

          <WhatsAppSettingsCard settings={settings} showTokens={showTokens} onUpdate={updateSetting} onToggle={toggleShow} />
          <GoogleReviewSettingsCard settings={settings} onUpdate={updateSetting} />
          <InstagramSettingsCard settings={settings} showTokens={showTokens} onUpdate={updateSetting} onToggle={toggleShow} />
          <MetaSettingsCard settings={settings} showTokens={showTokens} onUpdate={updateSetting} onToggle={toggleShow} />
          <GoogleCalendarSettingsCard settings={settings} showTokens={showTokens} onUpdate={updateSetting} onToggle={toggleShow} gcConnected={gcConnected} gcChecking={gcChecking} gcConnect={gcConnect} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;
