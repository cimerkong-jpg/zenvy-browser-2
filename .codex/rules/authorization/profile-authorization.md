# Profile Authorization Rule

## Purpose
Define authorization requirements for profile and profile-group reads, updates, deletes, and execution actions.

## Critical Invariants
- User Group is the primary visibility boundary for every non-owner workspace member.
- Role controls what action is allowed inside the current User Group; role never expands visibility scope.
- `workspace.settings.permissionMode` decides profile authorization:
  - `group`: access expands through authorized profile group IDs.
  - `profile`: access is limited to explicitly authorized profile IDs.
- Delete/update operations must verify affected rows using `select().single()` or an equivalent confirmed affected-row result.

## Backend Rules
- Every profile/group action must answer:
  1. Which `workspace_id` owns this resource?
  2. Is the current member workspace owner or non-owner?
  3. Which User Group scope is allowed?
  4. Does `permissionMode` allow this profile/group?
  5. Does the role/group permission allow this action?
- Profile delete must filter by both profile ID and `workspace_id`.
- Profile group delete must filter by both group ID and `workspace_id`.
- Never return success for delete/update if no row was affected.
- RLS must remain enabled and must permit returning deleted/updated rows only for authorized users.

## Frontend Rules
- Do not show success toast until the backend confirms the mutation and the store refresh completes.
- On backend error, show the backend error and do not mutate UI state optimistically.
- Destructive actions must use the app dialog/toast systems, not native browser dialogs.

## Testing Checklist
- [ ] Owner can delete authorized workspace profiles/groups.
- [ ] Non-owner with permission can delete only authorized profiles/groups in their User Group.
- [ ] Non-owner cannot delete outside User Group scope.
- [ ] Wrong workspace ID, RLS block, or missing row does not show success toast.
- [ ] Deleted profile/group disappears after refresh.
- [ ] `npm run typecheck` passes.

## Migration Notes
- Profile/group DELETE policies must allow `delete().eq('id').eq('workspace_id').select().single()` to return exactly one authorized deleted row.
- Use `FIX-PROFILE-GROUP-DELETE-RLS.sql` when Supabase RLS blocks confirmed profile/group deletes.
- Do not disable RLS or use service role for user-triggered profile/group deletes.

## Changelog
- 2026-05-14: Added profile/group mutation confirmation invariant for delete/update flows.
- 2026-05-14: Documented confirmed Supabase DELETE behavior for profiles and profile groups.

## Related Files
- `src/main/index.ts`
- `src/main/workspaces.ts`
- `src/main/cloudSync.ts`
- `src/renderer/src/pages/ProfilesPage.tsx`
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/frontend/dialogs-and-toasts.md`
- `.codex/rules/database/rls-policies.md`
