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
- RLS DELETE policies must enforce both profile/profile-group authorization scope and the delete action permission.
- In `permissionMode=profile`, deleting a profile group requires authorization over every profile inside that group, not just one profile.

## Backend Rules
- Every profile/group action must answer:
  1. Which `workspace_id` owns this resource?
  2. Is the current member workspace owner or non-owner?
  3. Which User Group scope is allowed?
  4. Does `permissionMode` allow this profile/group?
  5. Does the role/group permission allow this action?
- Profile delete must filter by both profile ID and `workspace_id`.
- Profile group delete must filter by both group ID and `workspace_id`.
- Profile DELETE RLS must require `profile.delete`.
- Profile group DELETE RLS must require `group.delete`.
- In profile mode, non-owner profile-group delete must fail when any profile inside the group is not explicitly authorized to that member.
- Empty profile groups in profile mode are owner-only unless the authorization model gains an explicit group authorization source for that mode.
- A user with profile/group visibility authorization but no delete permission must be denied by RLS.
- Never return success for delete/update if no row was affected.
- RLS must remain enabled and must permit returning deleted/updated rows only for authorized users.
- Runtime state is also profile data:
  - `browser:running` must only return authorized profile IDs.
  - Automation history must include `workspaceId` and be filtered by workspace and authorized profile IDs.
  - Scheduled tasks must re-check profile authorization and `automation.run` at execution time, not only at creation/update time.

## Frontend Rules
- Do not show success toast until the backend confirms the mutation and the store refresh completes.
- On backend error, show the backend error and do not mutate UI state optimistically.
- Destructive actions must use the app dialog/toast systems, not native browser dialogs.

## Testing Checklist
- [ ] Owner can delete authorized workspace profiles/groups.
- [ ] Non-owner with permission can delete only authorized profiles/groups in their User Group.
- [ ] Non-owner with authorization but without `profile.delete` cannot delete profiles through app or direct Supabase.
- [ ] Non-owner with authorization but without `group.delete` cannot delete profile groups through app or direct Supabase.
- [ ] In profile mode, a non-owner with only one authorized profile in a multi-profile group cannot delete the group.
- [ ] In profile mode, a non-owner with every profile in the group authorized plus `group.delete` can delete the group.
- [ ] Non-owner cannot delete outside User Group scope.
- [ ] Wrong workspace ID, RLS block, or missing row does not show success toast.
- [ ] Deleted profile/group disappears after refresh.
- [ ] `browser:running` returns only authorized current-workspace profile IDs.
- [ ] Automation history does not leak profile/script/log data across workspace or User Group scope.
- [ ] Scheduled task does not run after member removal or profile authorization revocation.
- [ ] `npm run typecheck` passes.

## Migration Notes
- Profile/group DELETE policies must allow `delete().eq('id').eq('workspace_id').select().single()` to return exactly one authorized deleted row.
- Profile/group DELETE policies must call SECURITY DEFINER helpers that combine active membership, owner/user group scope, permissionMode authorization, and role action permission.
- DELETE permission helpers must honor User Group permission overrides before role permissions so direct Supabase behavior matches backend `hasPermission()`.
- Use `FIX-PROFILE-GROUP-DELETE-RLS.sql` when Supabase RLS blocks confirmed profile/group deletes.
- Do not disable RLS or use service role for user-triggered profile/group deletes.

## Changelog
- 2026-05-14: Added profile/group mutation confirmation invariant for delete/update flows.
- 2026-05-14: Documented confirmed Supabase DELETE behavior for profiles and profile groups.
- 2026-05-14: Added authorization-scoped runtime/history/scheduler requirements.
- 2026-05-14: Required profile/group DELETE RLS to enforce `profile.delete` and `group.delete`, not only visibility authorization.
- 2026-05-15: Finalized profile-mode group delete rule: every profile inside the group must be authorized, not merely one profile.

## Related Files
- `src/main/index.ts`
- `src/main/workspaces.ts`
- `src/main/cloudSync.ts`
- `src/renderer/src/pages/ProfilesPage.tsx`
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/frontend/dialogs-and-toasts.md`
- `.codex/rules/database/rls-policies.md`
