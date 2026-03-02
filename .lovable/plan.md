
Issue recap I found:
- The app is intermittently failing backend requests (`TypeError: Load failed`) from the browser.
- Lead creation UX currently closes the dialog immediately, even when save fails, so it feels like “Add Lead is broken.”
- Lead status updates rely mostly on realtime updates (not optimistic local updates), so pipeline columns and stats can feel out-of-sync when network/realtime is unstable.
- Form state is initialized once and not reliably reset between Add/Edit flows, which can cause inconsistent behavior.

Implementation plan:

1) Fix Add Lead submission reliability (UI + flow)
- Update `LeadFormDialog` to support async submit properly:
  - Change `onSubmit` contract to return success/failure (`Promise<boolean>`).
  - Add `isSubmitting` state and disable submit while request is in progress.
  - Only close dialog when save succeeds.
  - Keep form open and show clear inline error/toast if save fails.
- Reset form on dialog open + mode switch (Add vs Edit) using `useEffect`, so Add always starts from clean defaults and Edit always loads selected lead.

2) Make leads/pipeline/stats update from one resilient local source
- In `useLeads`, add optimistic local updates for:
  - `updateLead`
  - `updateLeadStatus`
  - `deleteLead`
- Keep rollback logic if API call fails.
- Keep realtime subscription, but treat it as sync reinforcement (not sole source of UI updates).
- Ensure add/update/delete all produce immediate consistent changes across:
  - Pipeline columns
  - Column counts
  - Stats cards

3) Improve recovery from temporary backend connectivity errors
- Add shared retry helper for mutations (not just initial fetch).
- Expose `refetchLeads()` from `useLeads`.
- Auto-refetch on reconnect/focus to recover from transient failures.
- Show a lightweight “sync issue” banner with Retry action if loading/mutation errors persist.

4) Wire page-level integration
- Update `Index.tsx` to pass/handle the new async boolean submit flow.
- Add loading/sync UI state so users can tell whether data is still syncing or failed.

5) Validation checklist (end-to-end)
- Add a lead with status “Contacted” and confirm it appears in the correct pipeline column immediately.
- Add a lead with status “Booked” and confirm booked stats update immediately.
- Edit a lead and move via drag/drop; verify counts/cards update instantly.
- Refresh page and verify all changes persist from backend.
- Temporarily simulate request failure and confirm:
  - form does not close on failure
  - user sees actionable error
  - retry succeeds without losing entered data.

Files to update:
- `src/components/crm/LeadFormDialog.tsx`
- `src/hooks/useLeads.ts`
- `src/pages/Index.tsx`
- (optional small UI helper component for error banner if needed)

Technical details:
```text
Current:
LeadFormDialog submit -> onSubmit() fire-and-forget -> dialog closes
                                    |
                                    v
                           network may fail silently for user

Target:
LeadFormDialog submit -> await onSubmit() -> success? close : keep open + error
                                    |
                                    v
                   useLeads does optimistic local update + rollback on error
                                    |
                                    v
                  Pipeline + Stats stay synchronized from same local state
```
