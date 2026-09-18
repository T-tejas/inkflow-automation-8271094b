import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Instagram, Key, Zap, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SettingField from "./SettingField";
const FIELDS = [
  { key: "instagram_page_id", label: "Facebook Page ID", icon: Key, sensitive: false },
  { key: "instagram_business_account_id", label: "Instagram Business Account ID", icon: Key, sensitive: false },
  { key: "instagram_page_access_token", label: "Page Access Token (long-lived)", icon: Key, sensitive: true, multiline: true },
  { key: "instagram_page_id_2", label: "Facebook Page ID (Account 2 \u2014 optional)", icon: Key, sensitive: false },
  { key: "instagram_page_access_token_2", label: "Page Access Token (Account 2 \u2014 optional)", icon: Key, sensitive: true, multiline: true }
];
const REQUIRED_SCOPES = ["instagram_basic", "instagram_manage_messages", "pages_messaging"];
const InstagramSettingsCard = ({ settings, showTokens, onUpdate, onToggle }) => {
  const [status, setStatus] = useState({ kind: "idle" });
  const testConnection = async () => {
    const pageId = settings.instagram_page_id?.trim();
    const igId = settings.instagram_business_account_id?.trim();
    const token = settings.instagram_page_access_token?.trim();
    if (!token) {
      toast.error("Paste Page Access Token first, then Save");
      return;
    }
    if (!pageId && !igId) {
      toast.error("Provide Facebook Page ID or Instagram Business Account ID");
      return;
    }
    setStatus({ kind: "checking" });
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v22.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
      );
      const debugData = await debugRes.json();
      const d = debugData?.data;
      if (debugData?.error || !d) {
        const msg = debugData?.error?.message || "Token could not be parsed";
        if (/expired|invalid|cannot parse/i.test(msg)) {
          setStatus({ kind: "token_expired", message: msg });
        } else {
          setStatus({ kind: "error", message: msg });
        }
        toast.error(msg);
        return;
      }
      if (d.is_valid === false) {
        setStatus({ kind: "token_expired", message: d.error?.message || "Token is invalid or expired" });
        toast.error("Token expired \u2014 generate a new long-lived Page Access Token");
        return;
      }
      const scopes = d.scopes || d.granular_scopes?.map((g) => g.scope) || [];
      const missing = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
      if (missing.length) {
        setStatus({ kind: "permission_missing", missing, message: `Missing scopes: ${missing.join(", ")}` });
        toast.error(`Token missing permissions: ${missing.join(", ")}`);
        return;
      }
      const target = pageId || igId;
      const pageRes = await fetch(
        `https://graph.facebook.com/v22.0/${target}?fields=name,id,instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(token)}`
      );
      const pageData = await pageRes.json();
      if (pageData.error) {
        setStatus({ kind: "error", message: pageData.error.message });
        toast.error(pageData.error.message);
        return;
      }
      const ig = pageData.instagram_business_account;
      if (ig?.id && (!igId || igId !== ig.id)) {
        onUpdate("instagram_business_account_id", ig.id);
        toast.info(`Auto-filled IG Business Account ID: ${ig.id}`);
      }
      setStatus({
        kind: "connected",
        pageName: pageData.name || "Page",
        igUsername: ig?.username,
        scopes
      });
      toast.success(`Connected! ${pageData.name}${ig?.username ? ` \u2192 @${ig.username}` : ""}`);
    } catch (e) {
      setStatus({ kind: "error", message: e.message });
      toast.error(`Test failed: ${e.message}`);
    }
  };
  const renderStatus = () => {
    if (status.kind === "idle") return null;
    if (status.kind === "checking") {
      return <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Validating token & permissions...
        </div>;
    }
    if (status.kind === "connected") {
      return <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Connected
          </div>
          <div className="text-xs text-muted-foreground">
            Page: <span className="font-medium text-foreground">{status.pageName}</span>
            {status.igUsername && <> · IG: <span className="font-medium text-foreground">@{status.igUsername}</span></>}
          </div>
          <div className="flex flex-wrap gap-1">
            {status.scopes.filter((s) => REQUIRED_SCOPES.includes(s)).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
          </div>
        </div>;
    }
    if (status.kind === "token_expired") {
      return <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
            <XCircle className="h-4 w-4" /> Token Expired / Invalid
          </div>
          <p className="text-xs text-muted-foreground">{status.message}</p>
          <p className="text-xs">
            Generate a new long-lived Page Access Token in{" "}
            <a className="underline" href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer">
              Meta Business Suite → System Users
            </a>
          </p>
        </div>;
    }
    if (status.kind === "permission_missing") {
      return <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
            <AlertTriangle className="h-4 w-4" /> Permission Missing
          </div>
          <p className="text-xs text-muted-foreground">
            Token needs: {status.missing.map((m) => <code key={m} className="px-1 bg-background rounded mx-0.5">{m}</code>)}
          </p>
        </div>;
    }
    return <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-600 flex items-center gap-2">
        <XCircle className="h-4 w-4" /> {status.message}
      </div>;
  };
  return <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Instagram Configuration</CardTitle>
            <CardDescription>Meta Graph API v22.0 · Instagram Business messaging</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} className="gap-1.5" disabled={status.kind === "checking"}>
            {status.kind === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Test Connection
          </Button>
          <Button variant="ghost" size="sm" onClick={testConnection} className="gap-1.5" disabled={status.kind === "checking"} title="Refresh status">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStatus()}
        {FIELDS.map((f) => <SettingField
    key={f.key}
    settingKey={f.key}
    label={f.label}
    icon={f.icon}
    sensitive={f.sensitive}
    multiline={f.multiline}
    value={settings[f.key] || ""}
    showToken={!!showTokens[f.key]}
    onToggleShow={() => onToggle(f.key)}
    onChange={(v) => onUpdate(f.key, v)}
  />)}
        <Separator />
        <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Webhook URL (Meta App Dashboard → Instagram → Webhooks):</p>
          <code className="text-xs bg-background px-2 py-1 rounded block break-all">
            {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/instagram-webhook`}
          </code>
          <p className="font-medium pt-1">Verify Token:</p>
          <code className="text-xs bg-background px-2 py-1 rounded">f19_instagram_verify</code>
          <p className="text-xs pt-2">
            Required scopes on your Page Access Token:{" "}
            <code>instagram_basic</code>, <code>instagram_manage_messages</code>, <code>pages_messaging</code>
          </p>
        </div>
      </CardContent>
    </Card>;
};
var stdin_default = InstagramSettingsCard;
export {
  stdin_default as default
};
