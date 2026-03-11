

# CRM System Upgrade Plan

This is a large upgrade covering 8 feature areas. Here is the implementation plan broken into phases.

---

## What Already Exists
- **Design Assignment**: `DesignAssignDialog` already handles artist selection, dates, and lead data sync — only needs notification enhancement
- **Pipeline Board**: Kanban with drag-drop, but no multi-select
- **Lead Notes**: Simple text field on the lead, no structured entries
- **Completed Table**: Basic CSV export, no completion workflow

---

## Phase 1: Pipeline + Notes Improvements

### 1A. Multi-Select Pipeline
- Add checkbox overlay on each `LeadCard` (visible on hover or via "Select Mode" toggle)
- Floating bulk action bar at bottom: **Move to Stage**, **Delete Selected**, **Clear Selection**
- State managed in `Index.tsx` with a `Set<string>` of selected lead IDs

### 1B. New Pipeline Stage: "Out of City / External Client"
- Add to `LeadStatus` type union and all status arrays (`LEAD_STATUSES`, `KANBAN_STATUSES`)
- Add color mapping (e.g. `bg-sky-500`)
- DB migration not needed — status is stored as `text`

### 1C. Structured Lead Notes
- **New table**: `lead_notes` with columns: `id`, `lead_id`, `artist_name`, `note_text`, `created_at` (auto date/time)
- Replace the simple `notes` text field in `LeadDetailDialog` with a notes timeline showing:
  ```text
  Artist: Rahul | 11 Mar 2026, 2:30 PM
  Note: Client wants geometric sleeve, discussed pricing
  ```
- Add "Add Note" form with artist name dropdown + text input

---

## Phase 2: Tattoo Completion Workflow

### 2A. Completion Form
- When lead moves to "Completed" or user clicks "Mark Tattoo Completed" in lead detail:
  - Open `TattooCompletionDialog` with fields: Artist Name, Tattoo Price, Photo Upload, Aftercare Instructions
  - Auto-generate **Client Unique ID**: `F19-CLIENT-XXXXX` (random 5-digit number, stored on lead)

### 2B. New table: `tattoo_completions`
- Columns: `id`, `lead_id`, `client_id_code` (F19-CLIENT-XXXXX), `artist_name`, `tattoo_price`, `photo_urls` (text array), `aftercare_notes`, `invoice_url`, `created_at`

### 2C. Invoice Generation
- Client-side PDF generation using the completion data
- Branded "F19 Tattoo Studio" header with client ID, price, date, artist
- Upload generated PDF to `f19` storage bucket

### 2D. Photo Upload
- Upload tattoo photos to `f19` bucket under `completions/{lead_id}/`
- Show thumbnail previews in the completion form and lead detail

---

## Phase 3: Smart Review + Walk-in + Consent

### 3A. Smart Client Review
- After completion, trigger WhatsApp message asking for rating (1-5 stars via interactive buttons)
- Edge function logic in `whatsapp-webhook`:
  - Rating 5 → Send Google Review link
  - Rating ≤ 4 → Create CRM notification: "Low Rating Alert"

### 3B. Walk-in Customer System
- Add "New Walk-in" button in CRM header
- Opens `WalkInDialog` with: Name, Phone, Tattoo Idea, Placement, Budget, Artist, Appointment Date
- Creates lead with `source: 'Walk-in'` and creates appointment simultaneously
- **Shareable walk-in form**: Public route `/walk-in-form` that submits data via edge function (no auth required)

### 3C. Digital Tattoo Consent Form
- New table: `consent_forms` with: `id`, `lead_id`, `client_name`, `signature_data` (base64), `signed_at`, `consent_text`
- "Consent Form" button in lead detail generates a unique link: `/consent/{form_id}`
- Public page with safety instructions, client details, and HTML Canvas signature pad
- Signed data saved to DB and linked to lead

---

## Database Migrations Required

```sql
-- 1. lead_notes table
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to lead_notes" ON public.lead_notes FOR ALL USING (true) WITH CHECK (true);

-- 2. tattoo_completions table
CREATE TABLE public.tattoo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  client_id_code text NOT NULL,
  artist_name text NOT NULL,
  tattoo_price numeric NOT NULL DEFAULT 0,
  photo_urls text[] NOT NULL DEFAULT '{}',
  aftercare_notes text DEFAULT '',
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tattoo_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tattoo_completions" ON public.tattoo_completions FOR ALL USING (true) WITH CHECK (true);

-- 3. consent_forms table
CREATE TABLE public.consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  client_name text NOT NULL,
  signature_data text,
  consent_text text NOT NULL,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to consent_forms" ON public.consent_forms FOR ALL USING (true) WITH CHECK (true);

-- 4. Add client_id_code to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id_code text;
```

---

## New Files to Create
| File | Purpose |
|------|---------|
| `src/components/crm/BulkActionBar.tsx` | Floating bar for multi-select actions |
| `src/components/crm/LeadNotesTimeline.tsx` | Structured notes display + add form |
| `src/components/crm/TattooCompletionDialog.tsx` | Completion form with photo upload + invoice |
| `src/components/crm/WalkInDialog.tsx` | Walk-in customer quick-add form |
| `src/pages/ConsentForm.tsx` | Public consent form page with signature pad |
| `src/pages/WalkInForm.tsx` | Public shareable walk-in form |
| `src/hooks/useLeadNotes.ts` | CRUD for lead_notes table |
| `src/hooks/useTattooCompletions.ts` | CRUD for tattoo_completions |
| `src/hooks/useConsentForms.ts` | CRUD for consent_forms |
| `src/lib/invoiceGenerator.ts` | Client-side invoice PDF generation |

## Files to Modify
| File | Changes |
|------|---------|
| `src/types/lead.ts` | Add "Out of City" status, update arrays and color maps |
| `src/pages/Index.tsx` | Multi-select state, bulk action bar, walk-in button |
| `src/components/crm/PipelineBoard.tsx` | Checkbox on cards, selection state |
| `src/components/crm/LeadCard.tsx` | Selection checkbox prop |
| `src/components/crm/LeadDetailDialog.tsx` | Notes timeline, completion button, consent form button |
| `src/App.tsx` | Add public routes for consent and walk-in forms |
| `supabase/functions/whatsapp-webhook/index.ts` | Review rating handler |

---

## Implementation Order
1. Pipeline multi-select + "Out of City" stage (quickest wins)
2. Structured lead notes system
3. Tattoo completion workflow + client ID + invoice
4. Walk-in customer system + shareable form
5. Digital consent form with signature
6. Smart review system (WhatsApp integration)

