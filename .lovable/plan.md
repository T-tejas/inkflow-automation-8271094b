# CRM Master Upgrade Plan

Yeh request bahut bada hai (40+ subtasks across 10+ modules). Sab kuch ek turn me ship karna realistic nahi hai — quality drop hogi aur existing modules break ho sakte hai. Isliye main isko **6 phases** me todunga aur har phase user approval ke baad implement karunga.

**Sabse pehle critical bug fixes (Phase 1)** — fir baaki phases sequentially.

---

## Phase 1 — Critical Bug Fixes (start here)

1. **Appointment WhatsApp date/time bug**
   - `send-whatsapp` / appointment confirmation flow audit
   - Always pull `appointment_date`, `time_slot`, `artist_name`, `lead_name` from DB row (no hardcoded values)
   - Preview dialog before send, block if missing fields
   - Log `meta_message_id`, `appointment_id`, `delivery_status` into `whatsapp_messages`

2. **Instagram OAuth token fix**
   - Audit `send-instagram` + `instagram-webhook` token handling
   - Surface token-invalid error to Settings UI with reconnect prompt
   - Persist `instagram_username` + profile pic on incoming DM → lead

3. **Review system realtime**
   - `useReviews` already has realtime; audit Dashboard counters to subscribe properly
   - Add reply field write-path + show on review card

4. **Admin login session recovery**
   - Audit `AdminLogin` + `ProtectedAdminRoute` for session restore + clear errors

5. **Campaign dedupe**
   - Unique constraint on `campaigns.campaign_name`
   - Add Edit / Delete / Duplicate / Archive actions on BulkMessaging page

---

## Phase 2 — Master Workflow + Client Timeline
- Unified `client_id_code` propagation across leads → appointments → design_tasks → tattoo_completions → reviews (already exists, audit gaps)
- Client Timeline component inside `LeadDetailDialog` aggregating events from `lead_interactions`, `whatsapp_messages`, `instagram_messages`, `appointments`, `design_tasks`, `tattoo_completions`, `reviews`

## Phase 3 — Appointment System UI
- Calendar views (month/week/list) using existing `appointments` table
- Drag-and-drop reschedule, status color coding, filters
- Google Calendar create/update/delete on appointment CRUD (extend existing `google-calendar-event` function)

## Phase 4 — WhatsApp Automation Rules (activate Phase 3 of prior plan)
- Wire `automation_rules` + `scheduled-reminders` cron for: welcome, 24h/2h reminders, design update, payment reminder, aftercare, review request, follow-up, mark cold
- DB trigger on lead insert → enqueue welcome

## Phase 5 — Reviews + Google Business + Dashboard upgrades
- RevMeAI-style flow (5★ → AI suggestions + Google redirect, ≤4★ → low-rating alert) — already partially built, audit + fix
- Google Business settings card (Business Name, Review URL, Place ID), auto-send link + QR on tattoo completion
- Dashboard cards: Today/Week/Month revenue, expected/pending/lost, today/tomorrow appointments, hot/warm/cold buckets, leaderboards

## Phase 6 — Client History, Artist Dashboard, Notification Center, Bulk Messaging analytics
- Repeat-client tracker (visits, LTV, last tattoo)
- Per-artist dashboard page
- Notification center bell with realtime feeds
- Bulk messaging: template preview, cost estimator, scheduler, drafts, retry failed, ROI

---

## What I will NOT do
- Create duplicate tables or pages
- Touch `src/integrations/supabase/client.ts` or `types.ts`
- Break existing WhatsApp/Instagram/CRM flows
- Universal inbox (per memory constraint)

---

## Confirmation needed
Reply with **"Start Phase 1"** to begin the 5 critical bug fixes. Each phase ~1 turn. If aap chahte ho ki main koi phase pehle uthau (e.g. Phase 3 calendar first), bata do.
