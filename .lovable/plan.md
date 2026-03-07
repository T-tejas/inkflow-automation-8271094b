

## WhatsApp Webhook Verification Fix

### Problem
Meta's "Verify and save" fails because:

1. **`config.toml` is missing `verify_jwt = false`** for the webhook function. Without this, Supabase rejects Meta's GET request (which has no JWT) with a 401 before the function code even runs.

2. **Verify token not saved in database.** The `whatsapp_settings` table has no row with `setting_key = 'webhook_verify_token'`. The screenshot shows the token `3c1194ae-f370-4cf0-810e-86b0dd8731bb` was entered in Meta's portal, but it was never saved to the DB from the Settings UI. The function falls back to default `"lovable_webhook_verify"` which doesn't match.

### Fix

**1. Update `supabase/config.toml`** — Add JWT bypass for the webhook function:
```toml
project_id = "edwmlzhbrtchnjfdntrc"

[functions.whatsapp-webhook]
verify_jwt = false
```

**2. Fix WhatsApp Settings UI (`src/pages/WhatsAppSettings.tsx`)** — Ensure the verify token save button actually upserts the token into `whatsapp_settings` with key `webhook_verify_token`. Verify the save handler works and pre-loads any existing token on page load.

**3. Redeploy the edge function** after config change to pick up `verify_jwt = false`.

### After fix — steps for Meta verification
1. Go to WhatsApp Settings in the app → generate or enter verify token → save
2. Go to Meta Developer Portal → WhatsApp → Configuration
3. Callback URL: `https://edwmlzhbrtchnjfdntrc.supabase.co/functions/v1/whatsapp-webhook`
4. Verify Token: paste the same token saved in step 1
5. Click "Verify and save" — should succeed

