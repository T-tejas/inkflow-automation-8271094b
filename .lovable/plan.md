

## Root Cause

The `leads` table has an RLS policy created as **RESTRICTIVE** instead of **PERMISSIVE**. In PostgreSQL, if there are no permissive policies, all access is denied by default — restrictive policies can only further narrow access granted by permissive ones. This means every INSERT/SELECT/UPDATE/DELETE silently fails with no data returned, which the retry logic interprets as transient errors.

## Plan

### 1. Fix the RLS policy (database migration)
- Drop the existing restrictive policy `Allow all access to leads`
- Create a new **PERMISSIVE** policy with the same `true` conditions for ALL operations
- This immediately unblocks all CRUD operations

### 2. Remove `as any` casts in useLeads.ts
- Use proper typed inserts/updates via the generated `TablesInsert` and `TablesUpdate` types from `src/integrations/supabase/types.ts`
- Build the insert/update objects with explicit typed fields instead of dynamic `leadToDb` mapping with `Record<string, unknown>`
- This ensures TypeScript catches field name mismatches at compile time

### 3. Add phone validation in LeadFormDialog.tsx
- Validate phone is not just the default `+91 ` prefix before allowing submit
- Show inline error if phone is empty/invalid

### Files to change
- **Database migration**: Fix RLS policy from restrictive to permissive
- `src/hooks/useLeads.ts`: Remove `as any` casts, use typed Supabase operations
- `src/components/crm/LeadFormDialog.tsx`: Add phone validation

