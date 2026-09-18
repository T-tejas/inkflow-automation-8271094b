import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import SettingField from "./SettingField";
const FIELDS = [
  { key: "google_business_name", label: "Google Business Name", placeholder: "F19 Tattoo Studio" },
  { key: "google_review_url", label: "Google Review Link", placeholder: "https://g.page/r/XXXXXXXX/review" },
  { key: "google_place_id", label: "Google Place ID", placeholder: "ChIJXXXXXXXX" }
];
const GoogleReviewSettingsCard = ({ settings, onUpdate }) => {
  const connected = !!settings.google_review_url;
  const lastSync = settings.google_last_sync || "\u2014";
  const testLink = () => {
    const url = settings.google_review_url;
    if (!url) {
      toast.error("Add Google Review URL first");
      return;
    }
    window.open(url, "_blank");
    toast.success("Opening review link in new tab");
  };
  return <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Google My Business Reviews</CardTitle>
            <CardDescription>Configure your Google review collection</CardDescription>
          </div>
          <Badge className={connected ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}>
            {connected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map((f) => <SettingField
    key={f.key}
    settingKey={f.key}
    label={f.label}
    icon={Star}
    sensitive={false}
    value={settings[f.key] || ""}
    showToken
    onToggleShow={() => {
    }}
    onChange={(v) => onUpdate(f.key, v)}
    placeholder={f.placeholder}
  />)}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">Last sync: {lastSync}</p>
          <Button variant="outline" size="sm" onClick={testLink} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Test Review Link
          </Button>
        </div>
      </CardContent>
    </Card>;
};
var stdin_default = GoogleReviewSettingsCard;
export {
  stdin_default as default
};
