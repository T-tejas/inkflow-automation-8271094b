

## Plan: WhatsApp-Style Chat System for F19 Tattoo CRM

### Overview
Replace the "Messages" dialog with a full-page WhatsApp Web-style chat interface at `/chat`, featuring a contact list on the left, conversation view on the right, real-time message sync, and quick lead actions.

### Current State
- `whatsapp_messages` table stores template sends and incoming messages but lacks a `message_body` column for actual text content
- `WhatsAppLogDialog` is a simple modal showing message history
- `send-whatsapp` edge function sends template messages only
- `whatsapp-webhook` edge function receives incoming messages and logs them
- Real-time subscription exists for `leads` table but not for `whatsapp_messages`

### Scope Decisions
Given practical constraints (Meta WhatsApp API only allows template messages for business-initiated conversations, and free-text replies within 24-hour windows), the chat system will:
- Display all message history per lead in a chat-bubble UI
- Support sending templates via quick-reply buttons
- Show incoming messages from the webhook
- Support internal notes (private, not sent to client)
- NOT implement file/image/emoji sending (requires Media API setup not currently configured)
- NOT implement typing indicators (not available from WhatsApp API)
- Sound notifications and unread badges will be included

---

### Step 1: Database Changes

**Alter `whatsapp_messages` table:**
- Add `message_body` (text, nullable) -- actual message content
- Add `is_internal_note` (boolean, default false) -- private notes
- Add `starred` (boolean, default false)
- Add `lead_id` (uuid, nullable, FK to leads) -- direct lead association

**Enable realtime:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
```

### Step 2: New Route & Layout

**`/chat`** -- Full-screen WhatsApp Web clone

```text
+------------------+----------------------------------+
| Contact List     | Chat Window                      |
| - Search bar     | - Header (name, phone, status)   |
| - Filter tabs    | - Message bubbles (scrollable)   |
| - Lead list      | - Input bar (templates + notes)  |
|   with avatars,  |                                  |
|   last msg,      |                                  |
|   timestamps,    |                                  |
|   unread count   |                                  |
+------------------+----------------------------------+
```

### Step 3: Components to Create

| Component | Purpose |
|-----------|---------|
| `src/pages/Chat.tsx` | Full-page layout with left/right panels |
| `src/components/chat/ContactList.tsx` | Left panel: lead list with search, filters, avatars, last message, unread count |
| `src/components/chat/ChatWindow.tsx` | Right panel: message bubbles, auto-scroll, header with quick actions |
| `src/components/chat/MessageBubble.tsx` | Individual message with ticks, timestamps, styling |
| `src/components/chat/ChatInput.tsx` | Bottom input bar: template quick replies, internal note toggle |
| `src/components/chat/QuickReplyTemplates.tsx` | Dropdown with pre-built templates (Deposit, Booking confirmation, Aftercare) |
| `src/hooks/useChat.ts` | Hook: fetch messages per lead, realtime subscription, send template, add note |

### Step 4: Contact List (Left Panel)

- Shows all leads that have WhatsApp opt-in or existing messages
- Avatar: first-letter circle with color derived from name
- Shows last message preview (truncated), timestamp
- Unread badge: count messages with `status = 'received'` that are newer than last viewed
- Filter tabs: All | Unread | Booked | Completed | Hot Leads (Interested + Negotiating)
- Search by name or phone
- Click selects lead and loads chat

### Step 5: Chat Window (Right Panel)

- **Header**: Lead name, phone, status badge, quick action buttons (Call via `tel:`, View Lead Detail, Mark as Booked, Mark as Completed)
- **Messages**: Grouped by date, outgoing (green, right-aligned), incoming (dark card, left-aligned), internal notes (yellow, left, with lock icon)
- **Delivery ticks**: Single check (sent), double check (delivered), blue double check (read), red alert (failed)
- **Auto-scroll** to latest message on load and new message
- **Starred messages**: Click to star, filter starred

### Step 6: Chat Input Bar

- Quick reply template buttons (Booking Confirmation, Deposit Request, Aftercare, Reminder)
- Internal note toggle (switch to note mode, sends to DB only, not WhatsApp)
- Enter to send (template selection or note)
- Text input for notes (free text is note-only since WhatsApp API requires templates for business-initiated messages)

### Step 7: Real-time & Notifications

- Subscribe to `whatsapp_messages` postgres_changes for INSERT events
- New incoming message: update contact list order, increment unread badge
- Audio notification: play a short sound on new incoming message (using `new Audio()`)
- Browser notification permission request (optional enhancement)

### Step 8: Navigation Changes

- Replace "Messages" button in CRM header with "Chat" button that navigates to `/chat`
- Add route in `App.tsx`
- Chat page has back-to-CRM button in header

### Step 9: Webhook Enhancement

- Update `whatsapp-webhook` edge function to populate `message_body` and `lead_id` when logging incoming messages
- Update `send-whatsapp` to populate `message_body` with template name/parameters and `lead_id`

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Add columns to `whatsapp_messages`, enable realtime |
| `src/pages/Chat.tsx` | New -- full page layout |
| `src/components/chat/ContactList.tsx` | New -- left panel |
| `src/components/chat/ChatWindow.tsx` | New -- right panel |
| `src/components/chat/MessageBubble.tsx` | New -- bubble component |
| `src/components/chat/ChatInput.tsx` | New -- input bar with templates |
| `src/components/chat/QuickReplyTemplates.tsx` | New -- template dropdown |
| `src/hooks/useChat.ts` | New -- chat data hook |
| `src/App.tsx` | Add `/chat` route |
| `src/pages/Index.tsx` | Replace Messages button with Chat navigation |
| `supabase/functions/send-whatsapp/index.ts` | Add `message_body` and `lead_id` to insert |
| `supabase/functions/whatsapp-webhook/index.ts` | Add `message_body` and `lead_id` to insert |

### Not Included (Future Enhancements)
- Image/PDF sending (requires Meta Media API configuration)
- Emoji picker (can add later)
- Role-based chat visibility (currently all chats visible; staff assignment requires an `assigned_to` column on leads)
- "Last seen" (not available from WhatsApp API)
- Sound file needs to be a small inline base64 or hosted asset

