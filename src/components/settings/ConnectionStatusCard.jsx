import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
const ConnectionStatusCard = ({ icon: Icon, iconColor, label, connected, checking }) => <Card>
    <CardContent className="pt-6 flex items-center gap-3">
      <Icon className={`h-8 w-8 ${iconColor}`} />
      <div>
        <p className="font-medium text-sm">{label}</p>
        {checking ? <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Checking</Badge> : <Badge className={connected ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
            {connected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>}
          </Badge>}
      </div>
    </CardContent>
  </Card>;
var stdin_default = ConnectionStatusCard;
export {
  stdin_default as default
};
