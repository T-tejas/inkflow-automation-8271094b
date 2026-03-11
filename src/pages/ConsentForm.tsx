import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useConsentForms, ConsentForm } from '@/hooks/useConsentForms';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, PenTool } from 'lucide-react';

export default function ConsentFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const { getConsentForm, signConsentForm } = useConsentForms();
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!formId) return;
    (async () => {
      const data = await getConsentForm(formId);
      setForm(data);
      if (data?.signed_at) setSigned(true);
      setLoading(false);
    })();
  }, [formId, getConsentForm]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
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
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
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
  };

  const handleSign = async () => {
    if (!formId || !canvasRef.current) return;
    setSubmitting(true);
    const sigData = canvasRef.current.toDataURL('image/png');
    const ok = await signConsentForm(formId, sigData);
    if (ok) setSigned(true);
    setSubmitting(false);
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">F19 TATTOO STUDIO</h1>
        <p className="text-sm text-gray-500">Tattoo Consent Form</p>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-900">Client: {form.client_name}</p>
        <p className="text-xs text-gray-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      <div className="whitespace-pre-wrap text-sm text-gray-700 mb-6 leading-relaxed">
        {form.consent_text}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            <PenTool className="h-4 w-4" /> Sign Below
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
        <Button className="w-full" onClick={handleSign} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Submit Signature
        </Button>
      </div>
    </div>
  );
}
