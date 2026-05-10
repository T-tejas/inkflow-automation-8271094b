## Problem found

The screenshot is showing repeated failed Instagram follow-up messages. Backend logs confirm the root cause:

- `instagram-followup` is sending the same auto follow-up to many users.
- Meta is rejecting it with: `Invalid OAuth access token - Cannot parse access token`.
- Because failed follow-ups are not marked as processed, every run can create more failed message rows.

## Plan

1. **Fix Instagram follow-up token handling**
   - Update `instagram-followup` to normalize the Instagram access token the same way `send-instagram` does.
   - Prefer saved Settings token first, then fallback to runtime secret.
   - Use configured Instagram Page ID endpoint when available instead of only `/me/messages`.

2. **Stop duplicate failed follow-up spam**
   - Before inserting a follow-up message, check whether the exact same follow-up was already logged recently for that Instagram sender.
   - If Meta returns an auth/token error, mark that bot state as follow-up attempted so the scheduler does not keep creating the same failed message repeatedly.
   - Add clearer system logs for skipped duplicates and token failures.

3. **Improve Instagram inbox display**
   - Collapse repeated identical failed follow-up messages in the chat UI so the conversation is readable.
   - Keep the latest failed message visible with its retry action.
   - Keep normal incoming/outgoing message history intact.

4. **Optional cleanup migration / data cleanup**
   - Remove existing duplicate failed follow-up rows from `instagram_messages`, keeping only the latest per sender/message/status.
   - This will clean the current inbox view immediately.

## Technical details

Files to update:

- `supabase/functions/instagram-followup/index.ts`
- `src/components/chat/InstagramChatWindow.tsx`

Possible database cleanup:

- Delete duplicate failed rows in `instagram_messages` for the repeated follow-up text only, preserving one latest row per Instagram sender.