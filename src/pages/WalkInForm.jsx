import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TATTOO_STYLES, TATTOO_SIZES } from "@/types/lead";
function WalkInForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tattooIdea, setTattooIdea] = useState("");
  const [placement, setPlacement] = useState("");
  const [budget, setBudget] = useState("");
  const [tattooStyle, setTattooStyle] = useState("Other");
  const [size, setSize] = useState("Medium (4-6 in)");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      source: "Walk-in",
      whatsapp_opt_in: true,
      tattoo_style: tattooStyle,
      size,
      placement: placement.trim(),
      budget: budget.trim(),
      status: "New Lead",
      tags: [],
      notes: `Walk-in form submission. Tattoo idea: ${tattooIdea}`
    });
    if (error) {
      alert("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };
  if (submitted) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 p-6">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Thank You!</h1>
        <p className="text-gray-500 text-center">Your details have been submitted. Our team will contact you shortly.</p>
      </div>;
  }
  return <div className="min-h-screen bg-white p-4 md:p-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">F19 TATTOO STUDIO</h1>
        <p className="text-sm text-gray-500 mt-1">Walk-in Registration</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm">Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Phone Number *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Tattoo Idea</Label>
          <Textarea value={tattooIdea} onChange={(e) => setTattooIdea(e.target.value)} placeholder="Describe your tattoo idea..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Style</Label>
            <Select value={tattooStyle} onValueChange={setTattooStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TATTOO_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TATTOO_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Placement</Label>
            <Input value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="e.g. Forearm" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Budget (₹)</Label>
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5000" />
          </div>
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting || !name.trim() || !phone.trim()}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Submit
        </Button>
      </div>
    </div>;
}
export {
  WalkInForm as default
};
