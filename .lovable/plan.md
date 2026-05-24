## Problem

DB check karne par dono reviews ka `rating` column `NULL` hai — matlab client ne abhi tak rating actually "submit" nahi ki hai database mein. Card pe `r.rating ? <StarRating/> : null` likha hai, isliye kuch dikh nahi raha.

**Root cause** (`src/pages/PublicReview.tsx`): Jab client star pe click karta hai, rating sirf **local state** mein jaati hai (`setRating(r)`). DB mein rating tabhi save hoti hai jab client `finalText` likh ke "Submit Review" button dabaye. Agar client sirf stars tap karke chala gaya (bina review text submit kiye), to rating kabhi save nahi hoti — dashboard pe blank dikhega.

## Fix Plan

**1. `src/pages/PublicReview.tsx` — `onRate` function**
- Stars click hote hi turant `rating` ko DB mein save karo (background, non-blocking):
  ```
  await supabase.from('reviews').update({ rating: r, status: 'rated' }).eq('token', token!)
  ```
- Agar text submit hota hai to wahi rating overwrite ho jayegi (no harm).
- Yeh ensure karega ki "drop-off" clients ki rating bhi capture ho.

**2. `src/pages/ReviewsDashboard.tsx` — card display**
- Rating ko zyada prominent banao: agar `r.rating` hai to bada star + numeric value (e.g., `4.0 ★`) header ke paas dikhao, even when `final_review_text` na ho.
- Status pill mein "Rated (no text)" wali state add karo jab rating ho but text na ho — taa ki team ko pata chale client ne kya diya.

**3. `statusPill` logic update**
- Naya intermediate state: `rating && !final_review_text` → "Rated ★" (amber/yellow) — abhi yeh "Opened" mein gum ho jaata hai.

**4. (Optional) Reminder copy update**
- 24h reminder mein agar client ne rate kiya but submit nahi ki, message: "Aap ne ⭐ diya — bas ek line likh dijiye ❤️" (yeh later — abhi sirf rating-capture aur display fix karenge).

## Files to edit
- `src/pages/PublicReview.tsx` — `onRate` mein instant DB save add karna
- `src/pages/ReviewsDashboard.tsx` — `statusPill` + card mein rating prominence
- `src/hooks/useReviews.ts` — koi change nahi (realtime already rating updates pakad lega)

## Result
- Naye clients jaise hi star tap karenge, rating turant CRM card pe dikhne lagegi (realtime).
- Purane 2 reviews jinka rating null hai, woh client se dobara link click karwa ke fix ho sakte hain — ya unko "—" dikhega jaisa abhi hai.
