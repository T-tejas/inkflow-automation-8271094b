

## Current State

The app is a tattoo studio CRM with:
- 7-stage Kanban pipeline (but uses "Consultation Scheduled" instead of "Interested" and "Negotiating")
- Basic stats cards (Total, New, Booked, Completed)
- Lead cards showing name, phone, style, size, date, source, tags
- Add/Edit lead form dialog with full field set
- Lead detail dialog with status change, edit, delete, WhatsApp templates
- Real-time sync via database subscriptions
- Dark/light mode support via CSS variables
- 7 existing leads in database

## What Needs to Change

### 1. Pipeline Stages Update
The user wants 7 specific stages: New Lead, Contacted, **Interested**, **Negotiating**, Booked, Completed, No Response / Cancelled. Currently the app has "Consultation Scheduled" instead of "Interested"/"Negotiating", and separates "No Response" and "Cancelled" into two stages. 

**Changes:** Update `LeadStatus` type and `LEAD_STATUSES` array in `src/types/lead.ts`. Update color maps. Update existing DB records with old statuses. Combine "No Response" + "Cancelled" into one column or keep as requested.

### 2. Enhanced Dashboard Stats
Add **Pipeline Value (₹)** card that sums budget values. Add **weekly trend chart** (leads added per day over last 7 days) and **source breakdown pie/bar chart** using recharts (already installed).

**Changes:** 
- Update `StatsCards` to include pipeline value with budget parsing
- Create new `DashboardCharts` component with recharts for weekly trends + source breakdown
- Update `useLeads` stats to compute pipeline value

### 3. Enhanced Lead Cards
Add: budget with ₹ icon, quick action buttons (edit, add note, change stage, WhatsApp chat), color-coding by priority, clickable automation tags.

**Changes:** Redesign `LeadCard` with quick action overlay/buttons, budget display, priority color logic (e.g., high budget = gold border, booked = green).

### 4. Lead Form Enhancements
Add: inline validation with zod, delete button with confirmation modal, "Portrait" and "Minimal" tattoo styles (from sample data), expanded source dropdown (Website, Facebook).

**Changes:** 
- Add `LeadSource` options: "Website", "Facebook" 
- Add zod schema for form validation
- Add delete confirmation dialog inside the form

### 5. Automation Tags Logic
Auto-tag leads on status/source change:
- Source = WhatsApp → add `whatsapp_inquiry`
- Stage = Booked → add `booked_whatsapp`  
- Stage = Completed → add `happy_client`
- Same phone returns → add `repeat_client`

**Changes:** Add tag automation logic in `useLeads` hook's `updateLeadStatus` and `addLead` functions.

### 6. Sample Data — Insert 8 Specific Leads
Clear existing sample data and insert the exact 8 leads specified. Some styles ("Portrait", "Minimal") and sources ("Website", "Facebook") need to be added to types first.

**Changes:** SQL insert via the insert tool for the 8 leads. Update types to include new styles/sources.

### 7. UI Polish
- Apple-style clean cards with larger typography, smooth shadows
- Responsive grid (mobile stacks, desktop side-by-side)
- Toast notifications on stage changes (already exists)
- Dark/light mode (already exists)
- Keyboard accessibility and tooltips on hover for quick actions

### 8. Interaction History Table
Create a new `lead_interactions` table to track stage changes, notes, and actions per lead.

**Changes:** Database migration for new table with RLS. Update `useLeads` to log interactions on status change.

---

## Implementation Plan

### Task 1: Update Types and Expand Data Model
- Add "Interested" and "Negotiating" to `LeadStatus`, remove "Consultation Scheduled"
- Combine "No Response / Cancelled" as a single display column or keep both
- Add "Website", "Facebook" to `LeadSource`
- Add "Portrait", "Minimal" to `TattooStyle`
- Update all color maps

### Task 2: Database Changes
- Migration: Create `lead_interactions` table (id, lead_id, action_type, old_value, new_value, note, created_at) with RLS
- Migration: Update existing leads with old statuses to new ones
- Insert the 8 specified sample leads (clear old sample data first)
- Enable realtime on `lead_interactions`

### Task 3: Enhanced Dashboard with Charts
- Add Pipeline Value (₹) stat card with budget parsing logic
- Create `DashboardCharts` component: weekly trend line chart + source breakdown bar chart using recharts
- Wire into Index page below StatsCards

### Task 4: Redesign Lead Cards with Quick Actions
- Add budget display with ₹ icon
- Add quick action buttons: Edit, Add Note, Change Stage dropdown, WhatsApp chat
- Color-code cards by priority/stage
- Make automation tags clickable (filter pipeline by tag)

### Task 5: Automation Tags Logic
- In `useLeads`, auto-apply tags on `addLead` (source-based) and `updateLeadStatus` (stage-based)
- Check for repeat_client on phone match during `addLead`

### Task 6: Form Validation with Zod
- Add zod schema for lead form with inline error messages
- Add delete confirmation modal in LeadDetailDialog (already has delete button, add confirm step)

### Task 7: UI Polish and Responsiveness
- Apple-style card redesign: larger numbers, SF-style spacing, subtle shadows
- Responsive Kanban: horizontal scroll on mobile, grid on desktop
- Add tooltips to quick action buttons
- Ensure keyboard navigation works on Kanban cards

### Technical Details

**New database table:**
```sql
CREATE TABLE lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON lead_interactions FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE lead_interactions;
```

**Budget parsing:** Extract numeric value from strings like "₹5,000" or "₹8,000 - ₹12,000" (use max value for pipeline total).

**New/modified files:**
- `src/types/lead.ts` — expanded types
- `src/hooks/useLeads.ts` — automation tags, pipeline value, interaction logging
- `src/components/crm/StatsCards.tsx` — pipeline value card
- `src/components/crm/DashboardCharts.tsx` — new, recharts weekly + source charts
- `src/components/crm/LeadCard.tsx` — quick actions, budget, priority colors
- `src/components/crm/PipelineBoard.tsx` — updated stages, responsive
- `src/components/crm/LeadFormDialog.tsx` — zod validation, new options
- `src/components/crm/LeadDetailDialog.tsx` — delete confirmation, interaction history
- `src/pages/Index.tsx` — add charts section

