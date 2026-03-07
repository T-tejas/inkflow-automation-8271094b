

## WhatsApp Webhook Settings Enhancement

### What we're building
Replacing the current generic webhook section in WhatsApp Settings with a proper webhook configuration panel that shows the auto-generated callback URL, lets admins manage a verify token, displays webhook status, and updates the edge function to read the verify token from the database.

### Changes

**1. Update `whatsapp-webhook` edge function** (`supabase/functions/whatsapp-webhook/index.ts`)
- On GET verification: read `webhook_verify_token` from `whatsapp_settings` table (via service role client), fall back to env `WHATSAPP_VERIFY_TOKEN`, then to default
- Add `verify_jwt = false` in config.toml for this function (already implied but should be explicit)

**2. Update `supabase/config.toml`**
- Add `[functions.whatsapp-webhook]` with `verify_jwt = false` to ensure Meta can call it without auth

**3. Update Webhook Settings section in `src/pages/WhatsAppSettings.tsx`** (lines ~311-371)
Replace the current webhook card with:
- **Callback URL**: Auto-generated read-only field showing `https://<project_id>.supabase.co/functions/v1/whatsapp-webhook` with a copy button
- **Verify Token**: Editable field with generate (random string) and save buttons, stored as `webhook_verify_token` in `whatsapp_settings`
- **Status indicator** with three states:
  - "Not Configured" (red) — no verify token set
  - "Verified" (green) — verify token is set and webhook_enabled is true
  - "Error" (amber) — verify token set but webhook disabled
- Keep the existing enable/disable toggle

### Technical details
- The callback URL is constructed using `import.meta.env.VITE_SUPABASE_URL` + `/functions/v1/whatsapp-webhook`
- Random verify token generated client-side via `crypto.randomUUID()` 
- No database migration needed — uses existing `whatsapp_settings` table with key `webhook_verify_token`
- Admin-only access already enforced by RLS on `whatsapp_settings` and `ProtectedAdminRoute`

