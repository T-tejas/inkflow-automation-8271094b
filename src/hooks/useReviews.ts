import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Review {
  id: string;
  lead_id: string | null;
  rating: number | null;
  review_text: string | null;
  final_review_text: string | null;
  source: string;
  client_name: string | null;
  client_phone: string | null;
  artist_name: string | null;
  tattoo_style: string | null;
  placement: string | null;
  generated_reviews: string[];
  posted_to_google: boolean;
  google_redirected_at: string | null;
  tone: string | null;
  admin_reply: string | null;
  status: string;
  token: string | null;
  review_link: string | null;
  qr_code_url: string | null;
  review_sent_at: string | null;
  qr_generated_at: string | null;
  opened_at: string | null;
  reminder_24h_sent: boolean;
  reminder_72h_sent: boolean;
  created_at: string;
}

const normalize = (r: any): Review => ({
  ...r,
  generated_reviews: Array.isArray(r.generated_reviews) ? r.generated_reviews : [],
});

export function useReviews(opts?: { realtimeToast?: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const seenSubmitted = useRef<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    const list = ((data as any[]) || []).map(normalize);
    // Seed seen set with already-submitted ones so we don't toast on mount
    list.forEach(r => {
      if (r.final_review_text || r.rating) seenSubmitted.current.add(r.id);
    });
    setReviews(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reviews-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (payload.eventType === 'INSERT' && newRow) {
          setReviews(prev => [normalize(newRow), ...prev.filter(p => p.id !== newRow.id)]);
        } else if (payload.eventType === 'UPDATE' && newRow) {
          setReviews(prev => prev.map(p => (p.id === newRow.id ? normalize(newRow) : p)));

          if (opts?.realtimeToast) {
            const justSubmitted =
              !seenSubmitted.current.has(newRow.id) &&
              (newRow.final_review_text || newRow.rating);
            if (justSubmitted) {
              seenSubmitted.current.add(newRow.id);
              const name = newRow.client_name || 'Client';
              const rating = newRow.rating || 0;
              if (rating >= 4) {
                toast.success(`⭐ ${rating}-star review from ${name}!`, {
                  description: newRow.final_review_text?.slice(0, 120),
                  duration: 6000,
                });
              } else if (rating > 0) {
                toast.error(`⚠️ Low rating (${rating}★) from ${name}`, {
                  description: 'Follow up immediately',
                  duration: 10000,
                });
              }
            }
          }
        } else if (payload.eventType === 'DELETE' && oldRow) {
          setReviews(prev => prev.filter(p => p.id !== oldRow.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [opts?.realtimeToast]);

  return { reviews, loading, refetch: fetch };
}

export function generateReviewToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
