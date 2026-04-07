

## Instagram FAQ / Q&A Manager

User wants to add a configurable FAQ system for Instagram DMs — similar to Meta's Chat Builder "Frequently Asked Questions" feature (shown in screenshot). When a customer sends a message matching an FAQ question, the bot auto-replies with the configured answer.

### Current State
- Instagram webhook (`instagram-webhook/index.ts`) has a hardcoded qualification flow (tattoo_idea → placement → size → budget)
- A `chatbot_rules` table + `ChatbotRulesManager` component already exists for WhatsApp keyword-based auto-replies
- The Instagram bot currently only does the qualification flow, no FAQ/Q&A support

### Plan

**1. Create `instagram_faq` database table**
- Columns: `id`, `question` (text, max 80 chars), `answer` (text, optional), `display_order` (int), `is_active` (bool), `created_at`, `updated_at`
- RLS: allow all for authenticated users

**2. Build `InstagramFAQManager` component**
- Add to the WhatsApp Settings page under Instagram section (or as a new tab)
- UI similar to Meta's Chat Builder:
  - Numbered questions (Question #1, #2, etc.) with character counter (max 80)
  - Optional "Automated response" textarea per question
  - Add/remove questions with X button
  - Reorder support
  - Save button

**3. Update Instagram webhook to support FAQ**
- On first message (greeting step), send the greeting + FAQ quick-reply buttons
- When incoming message text matches an FAQ question exactly, reply with the configured answer
- If no answer configured, escalate or continue normal qualification flow
- FAQ check happens BEFORE the qualification flow

**4. Send FAQ as "Ice Breakers" or inline buttons**
- Use Instagram's Ice Breaker API (`/me/ice_breakers`) to set persistent FAQ questions on the page
- OR send FAQ questions as text options in the greeting message so users can tap to ask

### Files to Create/Edit
- **New migration**: Create `instagram_faq` table
- **New**: `src/components/settings/InstagramFAQManager.tsx` — FAQ CRUD UI
- **Edit**: `src/pages/WhatsAppSettings.tsx` — Add FAQ manager section
- **Edit**: `supabase/functions/instagram-webhook/index.ts` — Fetch FAQ from DB, match incoming messages, auto-reply

