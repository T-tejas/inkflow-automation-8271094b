

# WhatsApp Chat Module -- Functional Upgrade Plan

## Overview
Make all chat UI elements fully functional: lead status badge with dropdown, emoji picker, file attachments, free-text messaging, template preview/edit, error banners, and auto-resize textarea.

## 1. Lead Status Badge + Dropdown in Chat Header
**File: `ChatWindow.tsx`**
- Add a colored badge next to contact name showing `contact.leadStatus`
- Color map: New Lead (grey), Contacted (blue), Interested (purple), Negotiating (orange), Booked (green), Completed (dark green)
- Wrap badge in a Popover/DropdownMenu with all status options
- On status change: update via `supabase.from('leads').update({ status })` and log interaction, show toast
- Remove the individual "Mark as Booked" / "Mark as Completed" icon buttons (replaced by dropdown)

## 2. Functional Emoji Picker
**File: `ChatInput.tsx`**
- Build a simple emoji grid popover (common emojis organized in categories) using Radix Popover
- On emoji click: insert at cursor position in the textarea
- No external library needed -- use a curated set of ~100 common emojis

## 3. File Attachment Button
**File: `ChatInput.tsx`, new component `ChatAttachmentPreview.tsx`**
- Hidden file input triggered by Paperclip button, accept images + PDFs
- Show preview overlay before sending (image thumbnail or PDF icon + filename)
- Upload file to existing `f19` storage bucket via Supabase Storage
- Save message record with `message_body` containing the public URL and a new field or convention (prefix `[file]` or store URL)
- Display attachments in `MessageBubble.tsx` -- detect URL pattern and render image or PDF link

## 4. Free-Text Send + Template Preview
**File: `ChatInput.tsx`**
- Change input from disabled to always enabled in message mode
- Send button: works for both note mode AND message mode (free text sends via `send-whatsapp` edge function as a text message, or stores as outgoing)
- Template selector: when template selected, load template text into textarea for editing before sending
- Enter key sends in both modes
- Update `QuickReplyTemplates.tsx` to return template text to input instead of immediately sending

**File: `send-whatsapp/index.ts`**
- Add support for `type: "text"` messages (not just templates) for free-text sending via Meta API

## 5. Auto-Resize Textarea
**File: `ChatInput.tsx`**
- Replace `<input>` with `<textarea>` that auto-resizes (max 5 rows)
- Use `onInput` to adjust height based on `scrollHeight`

## 6. Error Banner System
**File: `ChatWindow.tsx`**
- Check for recent failed messages with specific error patterns
- Token expired: red banner at top "WhatsApp token expired -- update in settings"
- Number not allowed: yellow warning in message bubble (already partially done)
- API failure: add retry button on failed message bubbles in `MessageBubble.tsx`

## 7. Retry Failed Messages
**File: `MessageBubble.tsx`**
- For `status === 'failed'` messages, show a "Retry" button
- On click: re-invoke `send-whatsapp` with same parameters, update the message record

## 8. Contact Status Refresh
**File: `useChat.ts`**
- After status change in chat header, call `fetchContacts()` to refresh sidebar
- Pass `fetchContacts` or a status update callback to ChatWindow

## Files to Create/Edit
| File | Action |
|------|--------|
| `src/components/chat/ChatWindow.tsx` | Status badge, dropdown, error banner, remove old buttons |
| `src/components/chat/ChatInput.tsx` | Emoji picker, attachment, auto-resize textarea, free-text send |
| `src/components/chat/MessageBubble.tsx` | Retry button, file/image rendering |
| `src/components/chat/QuickReplyTemplates.tsx` | Return text to input instead of direct send |
| `src/components/chat/EmojiPicker.tsx` | New: simple emoji grid popover |
| `src/hooks/useChat.ts` | Add updateLeadStatus, retryMessage functions |
| `supabase/functions/send-whatsapp/index.ts` | Add text message support |
| `src/pages/Chat.tsx` | Wire new callbacks |

No database migrations needed -- existing schema supports all changes.

