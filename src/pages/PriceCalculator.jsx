import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calculator, IndianRupee, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import { TATTOO_STYLES, TATTOO_SIZES } from "@/types/lead";
const PLACEMENTS = ["Arm", "Forearm", "Wrist", "Shoulder", "Back", "Chest", "Neck", "Leg", "Thigh", "Ankle", "Finger", "Rib", "Hip"];
const ARTIST_LEVELS = [
  { label: "Junior Artist", multiplier: 0.7 },
  { label: "Senior Artist", multiplier: 1 },
  { label: "Lead Artist", multiplier: 1.3 },
  { label: "Guest Artist", multiplier: 1.5 }
];
const SIZE_HOURS = {
  "Small (2-4 in)": { minHours: 1, maxHours: 2, sqInch: 6 },
  "Medium (4-6 in)": { minHours: 2, maxHours: 4, sqInch: 15 },
  "Large (6-10 in)": { minHours: 4, maxHours: 7, sqInch: 40 },
  "Extra Large (10+ in)": { minHours: 6, maxHours: 12, sqInch: 80 },
  "Full Sleeve": { minHours: 15, maxHours: 30, sqInch: 200 },
  "Half Sleeve": { minHours: 8, maxHours: 16, sqInch: 100 }
};
const STYLE_MULT = {
  "Realism": 1.4,
  "Portrait": 1.5,
  "Watercolor": 1.2,
  "Japanese": 1.3,
  "Geometric": 1.1,
  "Dotwork": 1.15,
  "Blackwork": 1,
  "Minimalist": 0.9,
  "Minimal": 0.9,
  "Lettering": 0.85,
  "Traditional": 1,
  "Neo-Traditional": 1.1,
  "Tribal": 0.95,
  "Other": 1
};
function fmt(n) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}
function PriceCalculator() {
  const navigate = useNavigate();
  const [size, setSize] = useState("");
  const [placement, setPlacement] = useState("");
  const [style, setStyle] = useState("");
  const [hours, setHours] = useState("");
  const [artistLevel, setArtistLevel] = useState("Senior Artist");
  const estimate = useMemo(() => {
    if (!size) return null;
    const sizeData = SIZE_HOURS[size];
    if (!sizeData) return null;
    const styleMult = STYLE_MULT[style] || 1;
    const artistMult = ARTIST_LEVELS.find((a) => a.label === artistLevel)?.multiplier || 1;
    const customHours = hours ? parseFloat(hours) : void 0;
    const basePerInch = 800 * sizeData.sqInch * styleMult * artistMult;
    const hourlyMin = 4e3 * (customHours || sizeData.minHours) * artistMult;
    const hourlyMax = 4e3 * (customHours || sizeData.maxHours) * artistMult;
    const minPrice = Math.min(basePerInch * 0.7, hourlyMin);
    const maxPrice = Math.max(basePerInch, hourlyMax);
    const estMinHours = customHours || sizeData.minHours;
    const estMaxHours = customHours || sizeData.maxHours;
    return {
      minPrice: Math.round(minPrice / 100) * 100,
      maxPrice: Math.round(maxPrice / 100) * 100,
      minHours: estMinHours,
      maxHours: estMaxHours,
      sessions: estMaxHours > 6 ? Math.ceil(estMaxHours / 6) : 1
    };
  }, [size, style, artistLevel, hours]);
  const copyEstimate = () => {
    if (!estimate) return;
    const text = `\u{1F3A8} F19 Tattoo Price Estimate

Size: ${size}
Style: ${style || "Any"}
Placement: ${placement || "TBD"}
Artist: ${artistLevel}

\u{1F4B0} Price Range: \u20B9${fmt(estimate.minPrice)} - \u20B9${fmt(estimate.maxPrice)}
\u23F1 Estimated Time: ${estimate.minHours}-${estimate.maxHours} hours
\u{1F4C5} Sessions: ${estimate.sessions}

*Final price confirmed after artist consultation.`;
    navigator.clipboard.writeText(text);
    toast.success("Estimate copied to clipboard!");
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-3 max-w-[800px] mx-auto">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-sm font-bold text-foreground">Tattoo Price Calculator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {
    /* Input */
  }
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">Tattoo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tattoo Size *</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {TATTOO_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placement</label>
                <Select value={placement} onValueChange={setPlacement}>
                  <SelectTrigger><SelectValue placeholder="Select placement" /></SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tattoo Style</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                  <SelectContent>
                    {TATTOO_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estimated Hours (optional)</label>
                <Input
    type="number"
    value={hours}
    onChange={(e) => setHours(e.target.value)}
    placeholder="Auto-calculated if empty"
    min={0.5}
    step={0.5}
  />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Artist Level</label>
                <Select value={artistLevel} onValueChange={setArtistLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTIST_LEVELS.map((a) => <SelectItem key={a.label} value={a.label}>{a.label} ({a.multiplier}x)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {
    /* Result */
  }
          <div className="space-y-4">
            {estimate ? <>
                <Card className="glass-card border-primary/30">
                  <CardContent className="p-6 space-y-5">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Price Range</p>
                      <div className="flex items-center justify-center gap-2">
                        <IndianRupee className="h-6 w-6 text-primary" />
                        <span className="text-3xl font-bold text-primary">{fmt(estimate.minPrice)}</span>
                        <span className="text-xl text-muted-foreground">—</span>
                        <IndianRupee className="h-6 w-6 text-primary" />
                        <span className="text-3xl font-bold text-primary">{fmt(estimate.maxPrice)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <Clock className="h-5 w-5 text-info mx-auto mb-1" />
                        <p className="text-lg font-bold text-foreground">{estimate.minHours}-{estimate.maxHours} hrs</p>
                        <p className="text-[10px] text-muted-foreground">Estimated Time</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <Calculator className="h-5 w-5 text-success mx-auto mb-1" />
                        <p className="text-lg font-bold text-foreground">{estimate.sessions}</p>
                        <p className="text-[10px] text-muted-foreground">Session{estimate.sessions > 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    <Button onClick={copyEstimate} className="w-full gap-2">
                      <Copy className="h-4 w-4" /> Copy Estimate for Client
                    </Button>
                  </CardContent>
                </Card>

                <p className="text-[10px] text-muted-foreground text-center">
                  Rates: ₹800/sq inch • ₹4,000/hour • ₹25,000/full day. Final quote after consultation.
                </p>
              </> : <Card className="glass-card">
                <CardContent className="py-16 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select tattoo size to see price estimate</p>
                </CardContent>
              </Card>}
          </div>
        </div>
      </main>
    </div>;
}
export {
  PriceCalculator as default
};
