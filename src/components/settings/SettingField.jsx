import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
const SettingField = ({ settingKey, label, icon: Icon, sensitive, multiline, value, showToken, onToggleShow, onChange, placeholder }) => <div className="space-y-1">
    <label className="text-sm font-medium flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </label>
    <div className="flex gap-2">
      {multiline ? <Textarea
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder={placeholder || `Enter ${label}`}
  className={sensitive && !showToken ? "font-mono text-xs" : ""}
  rows={3}
/> : <Input
  type={sensitive && !showToken ? "password" : "text"}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  placeholder={placeholder || `Enter ${label}`}
/>}
      {sensitive && <Button variant="outline" size="icon" onClick={onToggleShow} className="shrink-0">
          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>}
    </div>
  </div>;
var stdin_default = SettingField;
export {
  stdin_default as default
};
