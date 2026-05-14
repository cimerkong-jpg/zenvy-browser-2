# Phase 0 + Phase 1 Status

Date: 2026-05-13

## Scope

Phase 0 focuses on repo stabilization. Phase 1 focuses on workspace RLS and the
workspace/member/user-group permission flow.

## Completed In This Pass

- Fixed `npm test` so it no longer references missing `test-antidetect.js`.
- Removed high-noise workspace debug logs that included workspace/member/invite payloads.
- Removed Supabase URL/key startup logging.
- Switched session encryption to Electron `safeStorage` when available, with legacy read-and-migrate support.
- Added canonical RLS migration: `WORKSPACE-RLS-CANONICAL.sql`.
- Updated workspace fallback query to preserve `is_default`.
- Updated `.claude/rules/progress.md` with current Phase 0/1 status.

## Canonical RLS File

Use `WORKSPACE-RLS-CANONICAL.sql` as the current source of truth for workspace
RLS repair. Older files such as `FIX-*.sql` and `FINAL-*.sql` are retained for
history and should not be treated as the active migration unless explicitly
needed for comparison.

## Manual QA Needed

- Owner can create workspace.
- Owner can switch workspace.
- Owner/admin can invite member when `member.invite` is true.
- Invited user can accept invitation and sees the workspace.
- Active members can read workspace user groups.
- Owner/admin with `member.edit_role` can create, update, and delete user groups.
- Member/viewer without permission is denied user-group mutation.
- Role permissions load and update correctly.

## Remaining Phase 0 Items

- Decide whether to remove `.env` from Git tracking. This requires an explicit
  Git index change and was not done automatically.
- Decide which older root `FIX-*.sql` and report files should be archived or
  removed. No files were deleted in this pass.
- Run packaged build verification after the RLS migration is applied.
