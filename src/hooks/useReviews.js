import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const normalize = (r) => ({
  ...r,
  generated_reviews: Array.isArray(r.generated_reviews) ? r.generated_reviews : []
});
function useReviews(opts) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const seenSubmitted = useRef(/* @__PURE__ */ new Set());
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    const list = (data || []).map(normalize);
    list.forEach((r) => {
      if (r.final_review_text || r.rating) seenSubmitted.current.add(r.id);
    });
    setReviews(list);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  useEffect(() => {
    const channel = supabase.channel("reviews-stream").on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, (payload) => {
      const newRow = payload.new;
      const oldRow = payload.old;
      if (payload.eventType === "INSERT" && newRow) {
        setReviews((prev) => [normalize(newRow), ...prev.filter((p) => p.id !== newRow.id)]);
      } else if (payload.eventType === "UPDATE" && newRow) {
        setReviews((prev) => prev.map((p) => p.id === newRow.id ? normalize(newRow) : p));
        if (opts?.realtimeToast) {
          const justSubmitted = !seenSubmitted.current.has(newRow.id) && (newRow.final_review_text || newRow.rating);
          if (justSubmitted) {
            seenSubmitted.current.add(newRow.id);
            const name = newRow.client_name || "Client";
            const rating = newRow.rating || 0;
            if (rating >= 4) {
              toast.success(`\u2B50 ${rating}-star review from ${name}!`, {
                description: newRow.final_review_text?.slice(0, 120),
                duration: 6e3
              });
            } else if (rating > 0) {
              toast.error(`\u26A0\uFE0F Low rating (${rating}\u2605) from ${name}`, {
                description: "Follow up immediately",
                duration: 1e4
              });
            }
          }
        }
      } else if (payload.eventType === "DELETE" && oldRow) {
        setReviews((prev) => prev.filter((p) => p.id !== oldRow.id));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [opts?.realtimeToast]);
  return { reviews, loading, refetch: fetch };
}
function generateReviewToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
export {
  generateReviewToken,
  useReviews
};
