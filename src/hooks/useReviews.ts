import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
}

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    setReviews(((data as any[]) || []).map(r => ({ ...r, generated_reviews: Array.isArray(r.generated_reviews) ? r.generated_reviews : [] })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { reviews, loading, refetch: fetch };
}

export function generateReviewToken(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
