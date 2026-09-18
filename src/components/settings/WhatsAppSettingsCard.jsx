import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Key, Phone, Globe, Webhook, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SettingField from "./SettingField";
const FIELDS = [
  { key: "whatsapp_access_token", label: "Access Token", icon: Key, sensitive: true },
  { key: "whatsapp_phone_number_id", label: "Phone Number ID", icon: Phone, sensitive: false },
  { key: "facebook_app_id", label: "Facebook App ID", icon: Globe, sensitive: false },
  { key: "waba_id", label: "WABA ID", icon: Key, sensitive: false },
  { key: "webhook_verify_token", label: "Webhook Verify Token", icon: Webhook, sensitive: true },
  { key: "admin_phone", label: "Admin Phone (+91)", icon: Phone, sensitive: false },
  { key: "google_review_url", label: "Google Review URL", icon: Globe, sensitive: false }
];
const WhatsAppSettingsCard = ({ settings, showTokens, onUpdate, onToggle }) => {
  const testConnection = async () => {
    const phone = settings.admin_phone;
    if (!phone) {
      toast.error("Admin phone not set");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone, message: "\u2705 WhatsApp CRM test \u2014 connection successful!", type: "test" }
      });
      if (error) throw error;
      toast.success("Test message sent to admin phone");
    } catch (e) {
      toast.error(`Test failed: ${e.message}`);
    }
  };
  return <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">WhatsApp Configuration</CardTitle>
            <CardDescription>Meta WhatsApp Business API settings</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Test Connection
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((f) => <SettingField
    key={f.key}
    settingKey={f.key}
    label={f.label}
    icon={f.icon}
    sensitive={f.sensitive}
    value={settings[f.key] || ""}
    showToken={!!showTokens[f.key]}
    onToggleShow={() => onToggle(f.key)}
    onChange={(v) => onUpdate(f.key, v)}
  />)}
      </CardContent>
    </Card>;
};
var stdin_default = WhatsAppSettingsCard;
export {
  stdin_default as default
};
