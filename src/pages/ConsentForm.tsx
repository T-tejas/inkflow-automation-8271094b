import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useConsentForms, ConsentForm } from '@/hooks/useConsentForms';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, PenTool, Download, AlertCircle } from 'lucide-react';

export default function ConsentFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const { getConsentForm, signConsentForm } = useConsentForms();
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [leadData, setLeadData] = useState<{ tattoo_style?: string; placement?: string; phone?: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!formId) return;
    (async () => {
      const data = await getConsentForm(formId);
      setForm(data);
      if (data?.signed_at) setSigned(true);
      // Fetch lead data for tattoo idea display
      if (data?.lead_id) {
        const { data: lead } = await supabase.from('leads').select('tattoo_style, placement, phone').eq('id', data.lead_id).maybeSingle();
        if (lead) setLeadData(lead);
      }
      setLoading(false);
    })();
  }, [formId, getConsentForm]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    const canvas = canvasRef.current!;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const { x, y } = getCoords(e, rect);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = getCoords(e, rect);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const isCanvasBlank = (): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((val, i) => i % 4 === 3 && val > 0);
  };

  const handleSign = async () => {
    if (!formId || !canvasRef.current) return;
    if (isCanvasBlank()) {
      return; // signature required
    }
    setSubmitting(true);
    const sigData = canvasRef.current.toDataURL('image/png');
    const ok = await signConsentForm(formId, sigData);
    if (ok) {
      setSigned(true);
      // Refresh form data to get signed_at
      const updated = await getConsentForm(formId);
      if (updated) setForm(updated);
    }
    setSubmitting(false);
  };

  const handleDownloadPDF = () => {
    if (!form) return;
    const signedDate = form.signed_at ? new Date(form.signed_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Consent Form - ${form.client_name}</title>
<style>
body{font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:30px 20px;color:#1a1a1a}
.header{text-align:center;border-bottom:3px solid #000;padding-bottom:16px;margin-bottom:24px}
.header h1{font-size:22px;margin:0;letter-spacing:2px}
.header p{margin:3px 0;color:#666;font-size:11px}
.info{margin-bottom:20px;font-size:13px}
.info p{margin:4px 0}
.consent{white-space:pre-wrap;font-size:12px;line-height:1.7;margin-bottom:24px;border:1px solid #ddd;padding:16px;border-radius:8px}
.sig-section{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #eee}
.sig-section img{max-width:300px;border:1px solid #ddd;border-radius:4px}
.sig-meta{font-size:11px;color:#888;margin-top:8px}
</style></head><body>
<div class="header"><h1>F19 TATTOO STUDIO</h1><p>Tattoo Consent & Release Form</p></div>
<div class="info">
<p><strong>Client:</strong> ${form.client_name}</p>
${leadData?.phone ? `<p><strong>Phone:</strong> ${leadData.phone}</p>` : ''}
${leadData?.tattoo_style ? `<p><strong>Tattoo Idea:</strong> ${leadData.tattoo_style}</p>` : ''}
${leadData?.placement ? `<p><strong>Placement:</strong> ${leadData.placement}</p>` : ''}
<p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
</div>
<div class="consent">${form.consent_text}</div>
${form.signature_data ? `<div class="sig-section"><p><strong>Digital Signature:</strong></p><img src="${form.signature_data}" alt="Signature" /><p class="sig-meta">Signed at: ${signedDate}</p></div>` : ''}
</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Consent form not found.</p>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 p-6">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Consent Form Signed</h1>
        <p className="text-gray-500 text-center">Thank you, {form.client_name}. Your consent has been recorded.</p>
        <p className="text-xs text-gray-400">Signed at: {form.signed_at ? new Date(form.signed_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</p>
        <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" /> Download PDF Copy
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">F19 TATTOO STUDIO</h1>
        <p className="text-sm text-gray-500">Tattoo Consent Form</p>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-1">
        <p className="text-sm font-medium text-gray-900">Client: {form.client_name}</p>
        {leadData?.phone && <p className="text-xs text-gray-500">Phone: {leadData.phone}</p>}
        {leadData?.tattoo_style && <p className="text-xs text-gray-500">Tattoo Idea: {leadData.tattoo_style}</p>}
        {leadData?.placement && <p className="text-xs text-gray-500">Placement: {leadData.placement}</p>}
        <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Health & Safety Instructions */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Health & Safety Instructions</p>
        <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
          <li>Inform the artist of any allergies, skin conditions, or medications</li>
          <li>Do not consume alcohol or drugs 24 hours before your session</li>
          <li>Eat a proper meal before your tattoo appointment</li>
          <li>Stay hydrated throughout the session</li>
          <li>Follow all aftercare instructions provided by your artist</li>
        </ul>
      </div>

      <div className="whitespace-pre-wrap text-sm text-gray-700 mb-6 leading-relaxed">
        {form.consent_text}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            <PenTool className="h-4 w-4" /> Sign Below *
          </p>
          <button onClick={clearSignature} className="text-xs text-blue-600 hover:underline">Clear</button>
        </div>
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Please sign above before submitting
          </p>
        )}
        <Button className="w-full" onClick={handleSign} disabled={submitting || !hasDrawn}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Submit Signature
        </Button>
      </div>
    </div>
  );
}
