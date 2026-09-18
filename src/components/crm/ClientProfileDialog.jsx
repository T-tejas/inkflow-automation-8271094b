import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Phone, User, Calendar, FileSignature, Image as ImageIcon, History, Loader2, ExternalLink, Pencil, IndianRupee, Star } from "lucide-react";
import { ConsentFormEditDialog } from "./ConsentFormEditDialog";
import { ReviewRequestDialog } from "@/components/reviews/ReviewRequestDialog";
import { formatINR } from "@/lib/currency";
function ClientProfileDialog({ lead, open, onOpenChange }) {
  const [completions, setCompletions] = useState([]);
  const [consentForms, setConsentForms] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    if (!lead || !open) return;
    setLoading(true);
    Promise.all([
      supabase.from("tattoo_completions").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
      supabase.from("consent_forms").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
      supabase.from("appointments").select("id, appointment_date, time_slot, status, tattoo_style").eq("lead_id", lead.id).order("appointment_date", { ascending: false })
    ]).then(([compRes, consentRes, apptRes]) => {
      setCompletions(compRes.data || []);
      setConsentForms(consentRes.data || []);
      setAppointments(apptRes.data || []);
      setLoading(false);
    });
  }, [lead, open]);
  if (!lead) return null;
  const isRepeatClient = completions.length > 1;
  const totalSpent = completions.reduce((s, c) => s + Number(c.tattoo_price || 0), 0);
  const allPhotos = completions.flatMap((c) => (c.photo_urls || []).map((url) => ({ url, artist: c.artist_name, date: c.created_at, price: c.tattoo_price })));
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Client Profile
            </DialogTitle>
          </DialogHeader>

          {
    /* Client Info Card */
  }
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            <p className="font-semibold text-foreground text-sm">{lead.fullName}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
              {lead.tattooStyle && <Badge variant="outline" className="text-[10px]">{lead.tattooStyle}</Badge>}
              {isRepeatClient && <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 text-[10px]">🔁 Repeat Client</Badge>}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {lead.client_id_code && <span>ID: <span className="font-mono text-primary">{lead.client_id_code}</span></span>}
              {totalSpent > 0 && <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{formatINR(totalSpent)} total</span>}
              <span>{completions.length} tattoo{completions.length !== 1 ? "s" : ""}</span>
            </div>
            {completions.length > 0 && <Button
    size="sm"
    className="w-full mt-2 h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
    onClick={() => setReviewOpen(true)}
  >
                <Star className="h-3.5 w-3.5" /> Send Review Request
              </Button>}
          </div>



          <Tabs defaultValue="gallery" className="mt-2">
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="gallery" className="text-xs gap-1"><ImageIcon className="h-3 w-3" /> Gallery</TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1"><History className="h-3 w-3" /> History</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Appts</TabsTrigger>
              <TabsTrigger value="consent" className="text-xs gap-1"><FileSignature className="h-3 w-3" /> Consent</TabsTrigger>
            </TabsList>

            {loading ? <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div> : <>
                {
    /* Tattoo Gallery */
  }
                <TabsContent value="gallery" className="mt-3">
                  {allPhotos.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No tattoo photos yet</p> : <div className="grid grid-cols-3 gap-2">
                      {allPhotos.map((photo, i) => <div key={i} className="relative group cursor-pointer rounded-lg overflow-hidden border border-border aspect-square" onClick={() => setLightboxUrl(photo.url)}>
                          <img src={photo.url} alt={`Tattoo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] gap-0.5">
                            <span>{photo.artist}</span>
                            <span>₹{photo.price}</span>
                            <span>{new Date(photo.date).toLocaleDateString("en-IN")}</span>
                          </div>
                        </div>)}
                    </div>}
                </TabsContent>

                {
    /* Tattoo History */
  }
                <TabsContent value="history" className="mt-3 space-y-3">
                  {completions.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No tattoo history</p> : completions.map((c) => <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">{c.artist_name}</p>
                          <Badge variant="outline" className="text-[10px]">₹{c.tattoo_price}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Client ID: <span className="font-mono text-foreground">{c.client_id_code}</span></span>
                          <span>Date: {new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                          <span>Style: {lead.tattooStyle || "\u2014"}</span>
                          <span>Placement: {lead.placement || "\u2014"}</span>
                          <span>Size: {lead.size || "\u2014"}</span>
                          <span>Phone: {lead.phone}</span>
                        </div>
                        {c.photo_urls && c.photo_urls.length > 0 && <div className="flex gap-1.5 flex-wrap">
                            {c.photo_urls.map((url, i) => <img key={i} src={url} alt="" className="w-10 h-10 rounded object-cover border border-border cursor-pointer" onClick={() => setLightboxUrl(url)} />)}
                          </div>}
                        {c.aftercare_notes && <p className="text-[10px] text-muted-foreground line-clamp-2">{c.aftercare_notes}</p>}
                      </div>)}
                </TabsContent>

                {
    /* Appointments */
  }
                <TabsContent value="appointments" className="mt-3 space-y-2">
                  {appointments.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No appointments</p> : appointments.map((a) => <div key={a.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" /> {a.appointment_date} at {a.time_slot}
                          </p>
                          {a.tattoo_style && <p className="text-[10px] text-muted-foreground">{a.tattoo_style}</p>}
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${a.status === "confirmed" ? "text-emerald-500 border-emerald-500/30" : a.status === "cancelled" ? "text-red-500 border-red-500/30" : "text-amber-500 border-amber-500/30"}`}>{a.status}</Badge>
                      </div>)}
                </TabsContent>
                <TabsContent value="consent" className="mt-3 space-y-2">
                  {consentForms.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No consent forms</p> : consentForms.map((f) => <div key={f.id} className="border border-border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground">{f.client_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {f.signed_at ? `Signed: ${new Date(f.signed_at).toLocaleString("en-IN")}` : "Pending signature"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {f.signed_at ? <Badge className="bg-green-500/10 text-green-600 text-[10px]">Signed</Badge> : <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">Pending</Badge>}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingForm(f)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(`/consent/${f.id}`, "_blank")}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>)}
                </TabsContent>
              </>}
          </Tabs>
        </DialogContent>
      </Dialog>

      {
    /* Lightbox */
  }
      {lightboxUrl && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Tattoo" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>}

      <ConsentFormEditDialog
    form={editingForm}
    open={!!editingForm}
    onOpenChange={(v) => {
      if (!v) setEditingForm(null);
    }}
    onSaved={() => {
      if (lead) {
        supabase.from("consent_forms").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).then(({ data }) => setConsentForms(data || []));
      }
    }}
  />

      <ReviewRequestDialog
    lead={lead}
    open={reviewOpen}
    onOpenChange={setReviewOpen}
    artistName={completions[0]?.artist_name}
  />
    </>;
}
export {
  ClientProfileDialog
};
