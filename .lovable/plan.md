## Advanced AI Review & Reputation System

Extend the existing CRM with a complete AI-powered review collection, generation, and reputation tracking system. Dark premium UI, no breaking changes.

### 1. Database Changes

Extend existing `reviews` table:
- `client_name`, `client_phone`, `artist_name`, `tattoo_style`, `placement` (text)
- `generated_reviews` (jsonb, 3 AI suggestions)
- `final_review_text` (text, what client submitted)
- `posted_to_google` (boolean), `google_redirected_at` (timestamptz)
- `tone` (text: professional/friendly/short/detailed/emotional)
- `admin_reply` (text, AI-suggested reply)
- `status` (text: pending/submitted/posted/flagged)
- `token` (text, unique — for public review link)

Add settings to `whatsapp_settings`:
- `google_review_url` — Google review page URL

### 2. Edge Functions

**`generate-review`** (new): Calls Lovable AI (google/gemini-3-flash-preview) to generate 3 review variations based on rating + artist + style + placement + tone. Also generates AI smart reply for admin.

**`send-whatsapp`** (existing): Reused to send review request after tattoo completion (already wired in TattooCompletionDialog).

### 3. Public Review Page (`/review/:token`)

RevMeAI-style premium dark card:
- F19 logo + studio name
- 5-star animated selector
- After rating: 3 AI-generated review cards with Copy/Edit buttons + tone tabs (Professional / Friendly / Short / Detailed / Emotional)
- Submit button
- Rating 5 → "Post on Google" CTA opens `google_review_url`
- Rating ≤ 4 → saves privately, shows thank-you
- Rating ≤ 3 → recovery popup + admin alert via `sendAdminAlert`

### 4. CRM Pages

**`/admin/reviews`** new page (ProtectedAdminRoute):
- **Analytics cards**: Total Reviews, Average Rating, Top Rated Artist, Conversion Rate (posted/total), Negative Count (≤3)
- **Reviews table**: Client, Artist, Rating, Review text, Posted-to-Google badge, Date, AI Reply button
- AI Reply dialog: generates suggested admin reply, copy/send via WhatsApp
- Filter by rating, artist, posted status

Add nav link in Index header + AdminDashboard.

### 5. Tattoo Completion Integration

Update `TattooCompletionDialog.sendReviewRequest`:
- Create review row with unique token + lead/artist/style/placement
- Send WhatsApp with public review link: `{origin}/review/{token}`
- Message: "Thank you for choosing F19 Tattoo Studio ❤️ Please rate your experience: {link}"

### 6. UI Theme

Premium dark cards (#0f172a bg, #1e293b cards, #22c55e accent), smooth motion on star fill + card transitions.

### Files

**New:**
- `supabase/migrations/<ts>_reviews_advanced.sql`
- `supabase/functions/generate-review/index.ts`
- `src/pages/PublicReview.tsx` (public route)
- `src/pages/ReviewsDashboard.tsx` (admin)
- `src/hooks/useReviews.ts`
- `src/components/reviews/StarRating.tsx`
- `src/components/reviews/ReviewSuggestionCard.tsx`
- `src/components/reviews/ReviewAnalytics.tsx`
- `src/components/reviews/AIReplyDialog.tsx`

**Edit:**
- `src/App.tsx` — add `/review/:token` public route + `/admin/reviews`
- `src/components/crm/TattooCompletionDialog.tsx` — use new flow
- `src/pages/Index.tsx` / `AdminDashboard.tsx` — add Reviews nav link
- `src/components/settings/WhatsAppSettingsCard.tsx` — add Google review URL field
