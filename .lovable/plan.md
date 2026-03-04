

## Plan: F19 Owner Revenue Dashboard

### Overview
Create a secure, dark-themed admin revenue dashboard at `/admin` with authentication via Supabase Auth, protected routes, and comprehensive revenue analytics from the existing `leads` table.

### Architecture

```text
/admin/login  → AdminLogin page (email+password auth)
/admin        → AdminDashboard (protected, redirects if not logged in)
```

### Step 1: Database — Admin Role Setup
- Create `user_roles` table with `app_role` enum (`admin`, `user`)
- Create `has_role()` security definer function
- RLS policy: only admins can read `user_roles`
- After migration, manually insert a single admin row for the seeded admin user

### Step 2: Auth — Seed Admin Account
- Enable auto-confirm for the admin setup (or instruct you to confirm manually)
- The admin signs up with their email+password via the login page on first use
- After signup, their `user_id` gets an `admin` role in `user_roles`
- Alternative: ask for the admin email now, create the user and role via migration

**Decision needed**: Since you said "hardcoded for now," the simplest secure approach is:
- Admin logs in with Supabase Auth (email+password)
- A server-side `has_role()` check gates access
- We seed one admin role row for a specific email

### Step 3: Auth Pages & Protection
- **`src/pages/AdminLogin.tsx`** — email + password form, calls `supabase.auth.signInWithPassword()`, redirects to `/admin` on success
- **`src/components/admin/ProtectedAdminRoute.tsx`** — wrapper that checks auth session + `has_role(uid, 'admin')` via RPC, redirects to `/admin/login` if unauthorized
- Routes added in `App.tsx`

### Step 4: Revenue Dashboard Page — `src/pages/AdminDashboard.tsx`
Uses the existing `leads` table data (fetched server-side with Supabase client).

**3 Revenue Cards:**
1. **Completed Revenue** — `status = 'Completed'`, sum `parseBudget(budget)`, count
2. **Booked Value** — `status = 'Booked'`, sum + count
3. **Pending Value** — `status IN ('New Lead','Contacted','Interested','Negotiating')`, sum + count

**Filters (client-side):**
- Date range: This Week / This Month / Custom (date picker)
- Tattoo style multi-select
- Lead source multi-select

**Charts (Recharts):**
- Monthly completed revenue bar chart
- Pipeline value line chart (Booked + Pending over time)

**Table:**
- Completed tattoos: Client Name, Phone, Style, Final Price, Date, Payment Status (derived from status)

### Step 5: Dark Theme
The app already has a `.dark` theme in CSS. The admin dashboard will force dark mode using a `dark` class wrapper on its layout, giving it a distinct professional financial look without affecting the main CRM.

### Step 6: Navigation
- Add an "Admin" link in the main CRM header (visible only when logged in as admin)
- Admin dashboard has its own header with logout button and back-to-CRM link

### Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/migrations/...` | Create `user_roles` table, `has_role()` function, RLS |
| `src/pages/AdminLogin.tsx` | New — login form |
| `src/pages/AdminDashboard.tsx` | New — revenue dashboard |
| `src/components/admin/ProtectedAdminRoute.tsx` | New — auth guard |
| `src/components/admin/RevenueCards.tsx` | New — 3 stat cards |
| `src/components/admin/RevenueCharts.tsx` | New — monthly charts |
| `src/components/admin/CompletedTable.tsx` | New — completed tattoos table |
| `src/components/admin/RevenueFilters.tsx` | New — date/style/source filters |
| `src/App.tsx` | Add `/admin` and `/admin/login` routes |
| `src/pages/Index.tsx` | Add admin link in header (conditional) |

### Security
- Authentication via Supabase Auth (not localStorage or hardcoded credentials)
- Role check via `has_role()` security definer function (server-side)
- RLS on `user_roles` table
- No client-side role storage

