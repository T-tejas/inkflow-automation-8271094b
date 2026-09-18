import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Send, Pencil, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSystemError } from "@/lib/systemLogger";
function InvoicePreviewDialog({ open, onOpenChange, data, leadId, onEdit }) {
  const [sendingWA, setSendingWA] = useState(false);
  const [sent, setSent] = useState(false);
  const iframeRef = useRef(null);
  const formattedPrice = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.tattooPrice);
  const invoiceHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${data.clientId}</title>
<style>
body{font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:30px 20px;color:#1a1a1a}
.header{text-align:center;border-bottom:3px solid #000;padding-bottom:16px;margin-bottom:24px}
.header h1{font-size:24px;margin:0;letter-spacing:2px}
.header p{margin:3px 0;color:#666;font-size:11px}
.meta{display:flex;justify-content:space-between;margin-bottom:24px;font-size:12px}
.meta strong{display:block;font-size:10px;text-transform:uppercase;color:#888;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#f5f5f5;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}
td{padding:10px 8px;border-bottom:1px solid #eee;font-size:13px}
.total{text-align:right;font-size:18px;font-weight:bold}
.footer{text-align:center;margin-top:30px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="header"><h1>F19 TATTOO STUDIO</h1><p>Professional Tattoo Art & Design</p><p>Invoice</p></div>
<div class="meta"><div><strong>Client</strong>${data.clientName}<br>${data.phone}<br>ID: ${data.clientId}</div>
<div style="text-align:right"><strong>Date</strong>${data.date}<br><strong>Artist</strong>${data.artistName}</div></div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody><tr><td>Tattoo Service${data.tattooStyle ? ` \u2014 ${data.tattooStyle}` : ""}${data.placement ? `<br><small style="color:#888">Placement: ${data.placement}</small>` : ""}</td>
<td style="text-align:right">${formattedPrice}</td></tr></tbody></table>
<div class="total">Total: ${formattedPrice}</div>
<div class="footer"><p>Thank you for choosing F19 Tattoo Studio!</p><p>Computer-generated invoice.</p></div>
</body></html>`;
  const handleDownloadPDF = () => {
    try {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(invoiceHTML);
        win.document.close();
        setTimeout(() => win.print(), 500);
      } else {
        const blob = new Blob([invoiceHTML], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${data.clientId}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      logSystemError("invoice", `PDF download failed: ${err.message}`, { clientId: data.clientId }, leadId);
      toast.error("Invoice download failed");
    }
  };
  const handleSendWhatsApp = async () => {
    setSendingWA(true);
    try {
      const msg = `\u{1F4C4} *INVOICE \u2014 F19 TATTOO STUDIO*

\u{1F464} Client: ${data.clientName}
\u{1F194} ID: ${data.clientId}
\u{1F3A8} Artist: ${data.artistName}
\u{1F488} Style: ${data.tattooStyle || "N/A"}
\u{1F4CD} Placement: ${data.placement || "N/A"}
\u{1F4B0} Total: ${formattedPrice}
\u{1F4C5} Date: ${data.date}

Thank you for choosing F19! \u{1F64F}`;
      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: { phone: data.phone, leadName: data.clientName, leadId, messageBody: msg }
      });
      if (error) throw error;
      setSent(true);
      toast.success("Invoice sent via WhatsApp");
    } catch (err) {
      logSystemError("invoice", `Invoice WhatsApp send failed: ${err.message}`, { clientId: data.clientId }, leadId);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSendingWA(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Invoice Preview</DialogTitle>
        </DialogHeader>

        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <iframe
    ref={iframeRef}
    srcDoc={invoiceHTML}
    className="w-full h-[400px] border-0"
    title="Invoice Preview"
  />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={handleDownloadPDF}>
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button
    size="sm"
    className="gap-1 flex-1 border-green-500/30 text-green-600 hover:bg-green-500/10"
    variant="outline"
    onClick={handleSendWhatsApp}
    disabled={sendingWA || sent}
  >
            {sendingWA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : sent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            {sent ? "Sent" : "Send WhatsApp"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}
export {
  InvoicePreviewDialog
};
