import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, X, GripVertical, Save, RefreshCw, MessageCircleQuestion } from 'lucide-react';

interface FAQItem {
  id?: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

export function InstagramFAQManager() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    const { data, error } = await supabase
      .from('instagram_faq' as any)
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error('Failed to load FAQ');
      setLoading(false);
      return;
    }
    setFaqs((data as any[]) || []);
    setLoading(false);
  };

  const addQuestion = () => {
    if (faqs.length >= 20) {
      toast.error('Maximum 20 questions allowed');
      return;
    }
    setFaqs(prev => [...prev, {
      question: '',
      answer: '',
      display_order: prev.length,
      is_active: true,
    }]);
  };

  const removeQuestion = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, display_order: i })));
  };

  const updateQuestion = (index: number, field: keyof FAQItem, value: string | boolean) => {
    setFaqs(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;
    const updated = [...faqs];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFaqs(updated.map((f, i) => ({ ...f, display_order: i })));
  };

  const saveAll = async () => {
    const validFaqs = faqs.filter(f => f.question.trim());
    if (validFaqs.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    setSaving(true);
    try {
      // Delete existing FAQs
      await supabase.from('instagram_faq' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert updated FAQs
      const inserts = validFaqs.map((f, i) => ({
        question: f.question.slice(0, 80),
        answer: f.answer || null,
        display_order: i,
        is_active: f.is_active,
      }));

      const { error } = await supabase.from('instagram_faq' as any).insert(inserts);
      if (error) throw error;

      toast.success('FAQ saved successfully!');
      await fetchFAQs();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-pink-400" />
          <p className="text-sm font-medium text-zinc-300">
            Frequently Asked Questions ({faqs.length}/20)
          </p>
        </div>
        <Button
          size="sm"
          onClick={saveAll}
          disabled={saving}
          className="bg-pink-500 hover:bg-pink-600 text-white gap-1.5"
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save All
        </Button>
      </div>

      <p className="text-xs text-zinc-500">
        Add questions that customers frequently ask. When a DM matches a question, the bot auto-replies with the answer. Max 80 characters per question.
      </p>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={faq.id || `new-${index}`} className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs font-medium text-pink-400">Question #{index + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={faq.is_active}
                  onCheckedChange={(v) => updateQuestion(index, 'is_active', v)}
                />
                <button
                  onClick={() => removeQuestion(index)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">Question</label>
                <span className={`text-[10px] ${faq.question.length > 80 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {faq.question.length}/80
                </span>
              </div>
              <Input
                value={faq.question}
                onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                placeholder="e.g. What are your pricing rates?"
                maxLength={80}
                className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-600 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Automated Response (optional)</label>
              <Textarea
                value={faq.answer}
                onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                placeholder="Bot will reply with this message..."
                rows={2}
                className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-600 text-sm min-h-[60px]"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addQuestion}
        disabled={faqs.length >= 20}
        className="w-full border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> Add Question
      </Button>
    </div>
  );
}
