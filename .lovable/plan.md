# WhatsApp Marketing + Utility Template System

Bada scope hai — main isko 4 phases mein todunga taaki har phase test ho sake aur existing WhatsApp inbox / Instagram / CRM kuch bhi na toote.

## Phase 1 — Template Library (Foundation)

**Naya DB table: `message_templates`**
- name, category (utility/marketing/authentication), status (approved/pending/rejected), language
- body_text (with `{{variable}}` placeholders), variables (jsonb array), buttons (jsonb: type + label + url/phone)
- meta_template_name (for Meta sync), quality_rating, is_favorite, usage_count, last_used_at
- Seed all 10 templates aapke spec se (5 utility + 5 marketing)

**Naya page: `/whatsapp-templates`** (link header se)
- Tabs: All | Utility | Marketing | Authentication | Favorites | Recently Used
- Search bar + category filter + status badges (green/yellow/red)
- Har card pe: **Preview Message**, **Use Template**, **Send Test**, ⭐ Favorite toggle
- Preview dialog: rendered WhatsApp-style bubble with sample variable values + buttons preview
- Send Test dialog: phone input + variable fields → calls `send-whatsapp` edge function
- "Sync from Meta" button → calls existing `whatsapp-templates` edge function, merges Meta-approved templates

## Phase 2 — Meta Sync + Analytics

- Extend `whatsapp-templates` edge function to upsert fetched templates into `message_templates` table with status/quality_rating
- Per-template analytics card: sent count, read rate, reply rate, conversion (booking) rate — computed from `whatsapp_messages` joined on template_name
- Analytics widget on top of library page

## Phase 3 — Smart Automation Rules

**Naya table: `automation_rules`** (trigger_event, template_id, delay_hours, is_active, conditions jsonb)
- Triggers: `lead_created`, `appointment_24h_before`, `no_reply_48h`, `tattoo_completed`, `inactive_30d`, `birthday`, `repeat_client_60d`
- Extend existing `scheduled-reminders` cron edge function to read rules + send via template
- DB trigger on `leads` insert → enqueue welcome message
- Admin UI panel inside templates page: "Automation Rules" tab — toggle on/off per rule, edit delay, pick template

## Phase 4 — Bulk Campaign Enhancements

Existing `BulkMessaging.tsx` + `campaigns` table already exist. Enhance:
- Lead filter UI: by stage (status), by source (WA/IG/Website/Meta Ads/Walk-in), by tag, "interested only" (status in Quoted/Appointment Scheduled)
- Audience preview count (live)
- Cost estimator: ₹0.85 per marketing msg × count (configurable in settings)
- Schedule field (datetime) → store in `campaigns.sent_at`, cron picks it up
- Reply tracking already exists in `campaign_recipients.replied` — add dashboard widget

## Technical Section

### Files to create
- `src/pages/WhatsAppTemplates.tsx` — main library page
- `src/components/whatsapp/TemplateCard.tsx`
- `src/components/whatsapp/TemplatePreviewDialog.tsx` — WA-style bubble renderer
- `src/components/whatsapp/SendTestDialog.tsx`
- `src/components/whatsapp/UseTemplateDialog.tsx` — pick lead + fill vars + send
- `src/components/whatsapp/TemplateAnalyticsCard.tsx`
- `src/components/whatsapp/AutomationRulesPanel.tsx`
- `src/hooks/useMessageTemplates.ts`
- `src/hooks/useAutomationRules.ts`

### Files to edit
- `src/App.tsx` — add `/whatsapp-templates` route
- `src/components/crm/SmartNotificationBell.tsx` or main nav — add link
- `src/pages/BulkMessaging.tsx` — add filters + audience preview + cost estimator + schedule
- `supabase/functions/whatsapp-templates/index.ts` — upsert Meta templates into DB
- `supabase/functions/scheduled-reminders/index.ts` — read automation rules
- `supabase/functions/send-whatsapp/index.ts` — support button payloads (interactive messages)

### Migrations
1. `message_templates` table + grants + RLS (admin write, authenticated read) + seed 10 templates
2. `automation_rules` table + grants + RLS + seed default rules (all off initially)
3. Add `whatsapp_messages.template_id` column for analytics joining

### Safety
- No changes to `leads`, `whatsapp_settings`, `instagram_*`, `whatsapp_webhook` logic
- Chat inbox (`/chat`, `/instagram-chat`) untouched
- Existing send-whatsapp flow preserved — only adds button payload support

### Out of scope (will confirm separately if needed)
- Authentication category templates (OTP) — not requested in template list, skipping seed
- WhatsApp Cloud API media template uploads (header images) — text + buttons only in v1
- Carousel templates — deferred to v2 (Meta requires special approval anyway)

---

Ye bohot bada hai (~15-18 files, 3 migrations, 2 edge function updates). Phase 1+2 deliver karu pehle (template library + Meta sync + preview/test/use buttons), phir Phase 3+4 alag turn mein? Ya sab ek saath?