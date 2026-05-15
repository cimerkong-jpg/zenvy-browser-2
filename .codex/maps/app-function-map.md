# Zenvy Browser App Function Map

Purpose: tester-oriented map of Zenvy Browser v1.0.0. Use this with `.codex/agents/tester-agent.md` and `.codex/rules/**` to audit workflows, permissions, data flow, and regression risk.

Status note: this map is based on current repository inspection. Marked "needs confirmation" items require manual app/Supabase validation.

## Global Architecture

### Runtime layers
- Renderer: React pages/components in `src/renderer/src/pages`, `src/renderer/src/components`.
- Renderer state: Zustand stores in `src/renderer/src/store`.
- Preload API: `src/preload/index.ts` exposes `window.api`.
- Main process: IPC handlers in `src/main/index.ts`.
- Workspace/auth logic: `src/main/workspaces.ts`, `src/main/auth.ts`, `src/main/supabase.ts`.
- Local persistence: `src/main/db.ts`, `src/main/cookies.ts`, automation/settings modules.
- Cloud persistence: `src/main/cloudSync.ts` and Supabase SQL migrations in root `*.sql`.

### Mandatory scope questions
Every test, query, and mutation must answer:
- What `workspace_id` does this belong to?
- What `user_group_id` scope is allowed?
- Is the current user workspace owner or non-owner?
- Is the target profile/member/group authorized?

### Critical invariants
- User Group is the primary visibility boundary for all non-owner workspace members.
- Role controls actions inside the current User Group only.
- Only workspace owner bypasses User Group scope.
- Backend + Supabase RLS are source of truth.
- Frontend-only hiding is not security.
- Workspace profile authorization mode is `workspace.settings.permissionMode`.
- Allowed permission modes: `group`, `profile`.
- Do not introduce parallel authorization systems.
- Renderer UI must use `useDialog`/`useToast`, not native `alert`/`confirm`/`prompt`.

# Modules

## Auth / Login

### User-facing entry points
- `src/renderer/src/pages/LoginPage.tsx`
- `src/renderer/src/pages/RegisterPage.tsx`
- `src/renderer/src/store/useAuth.ts`

### Backend / IPC entry points
- `auth:signUp`
- `auth:signIn`
- `auth:signOut`
- `auth:getCurrentUser`
- `auth:getCurrentSession`
- `auth:isAuthenticated`
- Main functions: `src/main/auth.ts`
- Supabase client: `src/main/supabase.ts`

### Data involved
- Supabase Auth users/session.
- `user_profiles`, `workspaces`, `workspace_members`, `workspace_invitations` through auth/signup/login triggers/RPCs.
- Renderer auth state in `useAuth`.

### Primary workflows
- Sign up with email/password.
- Sign in and load session.
- After sign in: ensure user profile, accept pending invitations, load workspaces, sync groups/profiles.
- Sign out clears auth and workspace store.

### Permissions / scope
- Auth establishes `auth.uid()` for all RLS helpers.
- Sign in must not select a workspace the user cannot access.
- Pending invitations are accepted by email match.

### Success paths
- New account creates/loads user profile, default workspace, owner active member row.
- Returning account restores session and workspace list.
- Accepted invitation creates active `workspace_members` row.

### Failure paths
- Supabase auth error.
- Database trigger/RPC failure during signup/login.
- RLS blocks workspace/member reads.
- Stale persisted workspace id no longer accessible.

### High-risk bug areas
- Masking Supabase error details.
- Signup trigger failures reported as generic auth error.
- Login succeeds but workspace context stale.
- Pending invitations accepted with wrong role/user group/authorization payload.

### Regression test ideas
- Fresh signup with new email.
- Login with invited user.
- Login after invitation expired/revoked.
- Login after user removed from workspace.
- Sign out and sign back in with persisted workspace id.

## Workspace Switching

### User-facing entry points
- `src/renderer/src/components/WorkspaceSwitcher.tsx`
- `src/renderer/src/pages/WorkspaceSettingsPage.tsx`
- `src/renderer/src/store/useWorkspace.ts`

### Backend / IPC entry points
- `workspaces:getWorkspaces`
- `workspaces:getCurrent`
- `workspaces:switchWorkspace`
- `workspaces:createWorkspace`
- `workspaces:deleteWorkspace`
- `workspaces:updateWorkspace`
- `workspaces:updateWorkspaceSettings`
- `workspaces:ensureDefaultWorkspace`

### Data involved
- Supabase: `workspaces`, `workspace_members`, `workspace_role_permissions`.
- Local current workspace id in main process `workspaces.ts`.
- Persisted renderer state: `workspace-storage.currentWorkspaceId`.
- Local profiles/groups in `zenvy-data.json` scoped by `workspaceId`.

### Primary workflows
- Load available workspaces.
- Switch workspace.
- Create/update/delete workspace.
- Save settings including `permissionMode` and `automationMode`.
- Sync local groups/profiles after switch.

### Permissions / scope
- Every switch must verify the user is an active workspace member.
- Owner can manage workspace settings/delete subject to app rules.
- Non-owner cannot bypass user group by switching or stale state.

### Success paths
- Switching workspace clears old members/invitations/groups/permissions, updates main current workspace, then reloads workspace data and profiles/groups.
- Deleted workspace switches to another accessible workspace or default workspace.

### Failure paths
- Workspace removed while app is open.
- Cloud sync timeout.
- RLS blocks workspace_members/workspaces read.
- Persisted workspace id no longer valid.

### High-risk bug areas
- Stale `currentWorkspaceId`.
- Data from previous workspace remains visible.
- Cloud sync merges profiles across workspace ids.
- Success toast before both switch and reload finish.

### Regression test ideas
- Switch A -> B and verify no A profiles/groups/members remain.
- Remove current user from workspace while app is open, then refresh.
- Delete current workspace and verify selected workspace changes safely.

## Members

### User-facing entry points
- `src/renderer/src/pages/MembersPage.tsx`
- Members tab: member table, edit/remove controls.
- Member modals: invite/edit authorization picker and role/user group fields.
- Store actions in `src/renderer/src/store/useWorkspace.ts`.

### Backend / IPC entry points
- `workspaces:getMembers`
- `workspaces:updateMember`
- `workspaces:updateMemberRole`
- `workspaces:removeMember`
- `workspaces:getMemberAuthorizations`
- `workspaces:updateMemberAuthorizations`
- Main functions in `src/main/workspaces.ts`.

### Data involved
- Supabase: `workspace_members`, `workspace_member_profiles`, `workspace_member_profile_groups`, `workspace_user_groups`, `workspace_role_permissions`.
- Types: `src/shared/workspace-types.ts`.

### Primary workflows
- List members.
- Edit role, user group, profile limit, note.
- Save profile/group authorizations.
- Remove member by marking status `removed`.
- Reload members/invitations/workspaces/permissions after mutation.

### Permissions / scope
- Owner can see/edit/remove all non-owner members.
- Non-owner can see/edit/remove only members in their own `user_group_id`, if role permissions allow.
- Non-owner cannot move a member to another User Group.
- Owner row cannot be removed or downgraded by app logic.
- Role labels map DB roles: `owner -> OWNER`, `admin -> ADMIN`, `member -> MANAGER`, `viewer -> MEMBER`.

### Success paths
- Update returns confirmed row from Supabase and UI reload shows new role/note/profile limit/group.
- Remove returns confirmed updated row and removed member disappears.
- Edit modal preloads `userGroupId`, role, and authorizations.

### Failure paths
- Target member not found.
- User group missing or belongs to another workspace.
- RLS returns no rows.
- Backend rejects missing `userGroupId` for non-owner member.

### High-risk bug areas
- Fake success on update/remove.
- `member` DB role displayed as MEMBER instead of MANAGER.
- Saving "Khong chon" user group.
- Role treated as user group bypass.
- Frontend hides rows but backend still returns them.

### Regression test ideas
- Owner edits member group/role/note and reloads app.
- Non-owner group A cannot see/edit/remove group B member.
- Remove owner is blocked.
- Missing user group member shows validation and cannot save.

## User Groups

### User-facing entry points
- Members page sidebar "Nhom nguoi dung".
- User group create/edit/delete modals in `MembersPage.tsx`.

### Backend / IPC entry points
- `workspaces:getUserGroups`
- `workspaces:createUserGroup`
- `workspaces:updateUserGroup`
- `workspaces:deleteUserGroup`

### Data involved
- Supabase: `workspace_user_groups`, `workspace_members.user_group_id`, `workspace_invitations.user_group_id`.
- `workspace_user_groups.description` is human-readable text; permission overrides live in `workspace_user_groups.permission_overrides`.
- Renderer store: `useWorkspace.userGroups`.

### Primary workflows
- Owner lists all user groups.
- Non-owner lists only current member's user group.
- Owner creates/updates/deletes groups.
- Deleting a user group affects members/invitations per backend implementation.

### Permissions / scope
- Only owner can create/update/delete user groups.
- Non-owner must be scoped to current member `user_group_id`.
- User Group is the primary data boundary.

### Success paths
- Owner CRUD returns confirmed Supabase row(s) and reloads user groups/members/invitations.
- Non-owner sees exactly one user group.

### Failure paths
- Non-owner tries user group CRUD.
- Missing `user_group_id` for non-owner.
- RLS blocks user group reads.

### High-risk bug areas
- Admin/manager treated as owner for user group CRUD.
- Sidebar leaks group names from other user groups.
- Deleted user group leaves members/invitations in inconsistent state.
- Any code path reading permissions from `description` instead of `permission_overrides`.

### Regression test ideas
- Owner creates group A/B.
- Non-owner A sees only A.
- Admin in A cannot create/edit/delete user groups.

## Invitations

### User-facing entry points
- Members page "Da moi" tab.
- Invite modal in `MembersPage.tsx`.
- Resend/revoke actions in invitation table.

### Backend / IPC entry points
- `workspaces:getInvitations`
- `workspaces:inviteMember`
- `workspaces:resendInvitation`
- `workspaces:revokeInvitation`
- `workspaces:acceptInvitations`

### Data involved
- Supabase: `workspace_invitations`, `workspace_members`, `workspace_member_profiles`, `workspace_member_profile_groups`.
- Invitation fields: `workspace_id`, `email`, `role`, `user_group_id`, `profile_limit`, `note`, `token`, `expires_at`, `status`, authorization arrays.

### Primary workflows
- Invite user to workspace and user group.
- Store invitation authorization payload based on `permissionMode`.
- List invitations by workspace and user group scope.
- Resend updates token/expiry/status.
- Revoke/delete removes or revokes pending invitation.
- Accepted invitations become member rows.

### Permissions / scope
- Invite requires `member.invite` and user group boundary.
- Owner can manage all workspace invitations.
- Non-owner can only manage invitations in own user group.
- `userGroupId` is mandatory for non-owner invitations.

### Success paths
- Invite returns confirmed invitation row and reloads invitations/members.
- Resend returns confirmed updated row and UI expiry changes.
- Revoke/delete returns confirmed affected row and row disappears.

### Failure paths
- Wrong invitation id.
- Invitation belongs to different workspace/user group.
- RLS no row affected.
- Email sending service absent.

### High-risk bug areas
- Invitation id confused with member id.
- Fake resend/revoke success.
- Pending authorization arrays copied in wrong permission mode.
- Non-owner resends/deletes group B invitation.

### Regression test ideas
- Owner resend/delete invitation from group A and B.
- Non-owner group A cannot resend/delete group B invitation.
- Expired invitation resend creates new token/expiry.
- Pending invited user logs in and receives correct authorizations.

## Profiles

### User-facing entry points
- `src/renderer/src/pages/ProfilesPage.tsx`
- `src/renderer/src/components/ProfileRow.tsx`
- `src/renderer/src/components/ProfileModal.tsx`
- `src/renderer/src/components/QuickEditProfileModal.tsx`

### Backend / IPC entry points
- `profiles:getAll`
- `profiles:create`
- `profiles:update`
- `profiles:delete`
- `profiles:deleteMany`
- `profiles:duplicate`
- `profiles:export`
- `profiles:import`
- `profiles:setVariables`

### Data involved
- Local JSON: `profiles` in `src/main/db.ts`.
- Supabase: `profiles`, `profile_cookies`.
- Cloud sync: `src/main/cloudSync.ts`.
- Fields: `id`, `workspaceId`, `groupId`, `proxy`, `fingerprint`, `variables`, `status`.

### Primary workflows
- List authorized profiles.
- Create/edit/quick edit.
- Delete single/bulk.
- Duplicate/import/export.
- Move profiles between profile groups.
- Set profile variables.

### Permissions / scope
- Workspace id required for every profile.
- Non-owner can only see/action authorized profiles inside their user group scope.
- `permissionMode=group`: profile access expands from authorized profile group ids via `profile.groupId`.
- `permissionMode=profile`: access requires explicit profile id authorization.
- Role permission controls action such as `profile.create`, `profile.edit`, `profile.delete`.
- Supabase DELETE RLS must require both profile authorization scope and `profile.delete`.

### Success paths
- Mutations update Supabase with confirmed affected rows where destructive/cloud operations apply, then local JSON/UI reload.
- Create/update/duplicate/setVariables await Supabase persistence before reporting normal success.
- `profiles:getAll` returns no unauthorized profiles.

### Failure paths
- No active workspace.
- Profile id not in current workspace.
- RLS blocks cloud mutation.
- Local JSON changed after cloud mutation failed.

### High-risk bug areas
- Fake success on delete/update.
- Local JSON update before Supabase confirmation.
- Backend returns profiles outside user group.
- Profile launch uses renderer-supplied profile object instead of stored authorized profile.

### Regression test ideas
- Delete single profile and verify Supabase + UI.
- Bulk delete partially unauthorized list.
- Non-owner A cannot see/open profile in B.
- Group mode: new profile added to authorized group becomes visible automatically.
- Profile mode: same-group profile not explicitly authorized stays hidden.

## Profile Groups

### User-facing entry points
- `GroupPanel` in `ProfilesPage.tsx`.
- `src/renderer/src/components/GroupModals.tsx`.

### Backend / IPC entry points
- `groups:getAll`
- `groups:create`
- `groups:update`
- `groups:delete`

### Data involved
- Local JSON: `groups`.
- Supabase: `groups`.
- Related profiles by `profiles.group_id` / local `profile.groupId`.

### Primary workflows
- List authorized profile groups.
- Create/update/delete profile group.
- Deleting group clears local `groupId` on profiles.

### Permissions / scope
- Workspace id required.
- Non-owner sees/action groups only if authorized and user group scoped.
- Group mode shows authorized groups.
- Profile mode should show groups containing allowed profiles or hide empty groups per current UX.
- Supabase DELETE RLS must require both group/profile authorization scope and `group.delete`.
- In `permissionMode=profile`, non-owner group delete is stricter than group visibility: every profile inside the group must be explicitly authorized, not just one profile.

### Success paths
- Delete group confirms Supabase row, then local JSON update and UI reload.
- Create/update group awaits Supabase persistence before reporting normal success.

### Failure paths
- Group id not current workspace.
- Group unauthorized.
- RLS blocks delete.
- Group contains profiles with mixed authorization.
- Empty group in profile mode has no explicit profile authorization proof for non-owner delete.

### High-risk bug areas
- Deleting local group even if Supabase delete failed.
- Empty group leakage in profile mode.
- Group name leak across user groups.

### Regression test ideas
- Delete empty group.
- Delete group with profiles and verify affected profile grouping.
- Non-owner A cannot list/delete group B.
- In profile mode, a non-owner with one authorized profile in a mixed group cannot delete the group.
- In profile mode, a non-owner with every profile in the group authorized and `group.delete` can delete the group.

## Profile Authorization

### User-facing entry points
- Invite/Edit member modals in `MembersPage.tsx`.
- Authorization picker labels: profile groups or profiles based on permission mode.

### Backend / IPC entry points
- `workspaces:getMemberAuthorizations`
- `workspaces:updateMemberAuthorizations`
- `workspaces:updateMember`
- `workspaces:inviteMember`
- `workspaces:acceptInvitations`
- Authorization helpers in `src/main/workspaces.ts`.

### Data involved
- Supabase: `workspace_member_profile_groups`, `workspace_member_profiles`.
- Pending invite arrays: `workspace_invitations.authorization_group_ids`, `authorization_profile_ids`.
- Workspace setting: `workspaces.settings.permissionMode`.

### Primary workflows
- In group mode, save only `groupIds` and clear `profileIds`.
- In profile mode, save only `profileIds` and clear `groupIds`.
- Filter profile/group reads and enforce profile/group IPC actions.

### Permissions / scope
- Owner bypasses profile authorization but not workspace id.
- Non-owner requires user group scope first, then permission mode authorization.
- Role permission still gates actions after visibility is established.

### Success paths
- Edit reload persists selected authorization.
- Accepted invitation copies only authorization data for active permission mode.
- Group mode expands dynamically through `profile.groupId in allowedGroupIds`.

### Failure paths
- Permission mode mismatch between frontend and backend.
- Old authorization type not cleared.
- Missing user group on member.

### High-risk bug areas
- Showing both group and profile authorization pickers.
- Persisting `authorizationIds` without type.
- Filtering only frontend.
- Browser/cookies/extensions/scheduler bypassing authorization.

### Regression test ideas
- Toggle permission mode and verify modal fields.
- Group mode: add new profile to allowed group and verify visibility.
- Profile mode: authorize one profile and deny sibling profile in same group.

## Browser Launch / Open / Close

### User-facing entry points
- Profile row launch/close actions.
- Automation can run browser actions through scripts.

### Backend / IPC entry points
- `browser:launch`
- `browser:close`
- `browser:running`
- `browser:sync`
- `browser:navigateTo`
- Main module: `src/main/browser.ts`.

### Data involved
- Local runtime profile directories under Electron user data.
- `Profile` rows and current workspace id.
- Running profile ids in `useStore.runningIds`.

### Primary workflows
- Launch authorized stored profile.
- Close profile by id.
- Sync running profile ids.
- Browser navigation is currently not implemented.
- Runtime tracing note:
  1. `browser.getRunningProfiles()` is internal global process state.
  2. `browser:running` and `browser:sync` are the user-visible IPC boundaries.
  3. QA should verify returned IPC ids are filtered, not assume the internal list itself is a leak.

### Permissions / scope
- Launch requires `profile.open`.
- Main process resolves stored profile by id/current workspace; renderer-supplied profile object must not be trusted.
- Non-owner access must obey user group and profile authorization.

### Success paths
- Authorized launch starts browser and emits status updates.
- Running list contains only authorized current workspace profile ids. `browser:running` and `browser:sync` must both filter in the main process.

### Failure paths
- Profile not in current workspace.
- Unauthorized profile.
- Chrome path/runtime failure.
- Browser already running/stale process state.

### High-risk bug areas
- `browser:running` leaking profile ids from other workspaces.
- Close/navigate by profile id without authorization.
- Scheduler launching unauthorized profiles.

### Regression test ideas
- Owner launches any workspace profile.
- Non-owner A cannot launch B profile by direct IPC.
- Switch workspace and verify running sync filters ids.

## Cookies

### User-facing entry points
- `src/renderer/src/components/CookieManager.tsx`
- Profile modal/row actions that open cookie tools.

### Backend / IPC entry points
- `cookies:get`
- `cookies:set`
- `cookies:delete`
- `cookies:clear`
- `cookies:import`
- `cookies:export`
- `cookies:sync`

### Data involved
- Local cookies per profile in `src/main/cookies.ts`.
- Supabase `profile_cookies` through `cloudSync`.

### Primary workflows
- Read cookies for profile.
- Add/delete/clear/import/export/sync cookies.

### Permissions / scope
- All cookie IPC must require authorized profile in current workspace.
- Mutations require edit/import/export role permissions as appropriate.

### Success paths
- Authorized cookie mutation updates local store and pushes cloud cookies.

### Failure paths
- Unauthorized profile id.
- Cloud cookie push/pull fails.
- User cancels file dialog.

### High-risk bug areas
- Cookie/token logging.
- Profile authorization bypass by direct profile id.
- Local cookie mutation before cloud failure handling.

### Regression test ideas
- Non-owner cannot read cookies for unauthorized profile.
- Clear cookies and verify cloud/local values.

## Proxy

### User-facing entry points
- Profile create/edit modals.
- Profile row/details display.

### Backend / IPC entry points
- Proxy is part of profile create/update/import/export and browser launch.

### Data involved
- `Profile.proxy` with `type`, `host`, `port`, `username`, `password`.
- Supabase `profiles.proxy`.

### Primary workflows
- Save proxy settings on profile.
- Apply proxy on browser launch.

### Permissions / scope
- Proxy data follows profile workspace/user group/authorization scope.
- Proxy credentials are sensitive and must not be logged.

### Success paths
- Saved proxy persists in local JSON and Supabase.
- Browser launches with selected proxy.

### Failure paths
- Invalid proxy config.
- Sensitive proxy data leaks to logs/UI.

### High-risk bug areas
- Password logged in debug output.
- Imported profiles carry unauthorized group/proxy data.

### Regression test ideas
- Update proxy, reload app, launch profile.
- Verify logs do not print proxy credentials.

## Extensions

### User-facing entry points
- `src/renderer/src/pages/ExtensionPage.tsx`
- Extension-related profile actions.

### Backend / IPC entry points
- `extensions:getAll`
- `extensions:toggle`
- `extensions:copyTo`
- Main module: `src/main/extensions.ts`.

### Data involved
- Profile extension data under workspace-scoped profile runtime directory.

### Primary workflows
- List extensions for profile.
- Toggle extension enabled state.
- Copy selected extensions to multiple profiles.

### Permissions / scope
- Source and target profile ids must be authorized.
- Toggle/copy requires `profile.edit`.

### Success paths
- Authorized extension operation changes profile extension files.

### Failure paths
- Source/target profile unauthorized.
- Runtime extension files missing.

### High-risk bug areas
- Copy-to target list includes unauthorized profile.
- Extension path not workspace scoped.

### Regression test ideas
- Non-owner A cannot copy extensions from/to group B profile.
- Toggle extension and reload extension list.

## Scheduler / Automation

### User-facing entry points
- `src/renderer/src/pages/AutomationPage.tsx`
- Script editor, scheduler controls, execution logs.

### Backend / IPC entry points
- `scripts:getAll`
- `scripts:get`
- `scripts:create`
- `scripts:update`
- `scripts:delete`
- `scripts:run`
- `scheduler:getAll`
- `scheduler:create`
- `scheduler:update`
- `scheduler:toggle`
- `scheduler:delete`
- `history:getAll`
- `history:delete`
- `history:clear`
- Modules: `src/main/automation/scripts.ts`, `executor.ts`, `scheduler.ts`, `history.ts`.

### Data involved
- Local JSON scripts/tasks/history.
- Profile ids attached to scheduled tasks/executions.
- Workspace id on scripts/tasks.
- Workspace id on automation history records.

### Primary workflows
- Create/edit/delete scripts.
- Run script on selected profile.
- Create/update/toggle/delete scheduled tasks.
- List execution history.
- Runtime tracing note:
  1. scheduler create/update validates task inputs at write time.
  2. scheduler execution must independently re-check current membership, action permission, workspace scope, and profile authorization at fire time.
  3. QA should inspect both phases before classifying scheduler authorization issues.

### Permissions / scope
- Automation actions require `automation.*` role permissions.
- Profile ids in script run/scheduler must pass profile authorization.
- Scripts/tasks are workspace scoped.
- Scheduled task execution must re-check active membership, User Group boundary, `automation.run`, and target profile authorization when the task fires.
- Automation history is scoped by `workspaceId`; non-owner history is further filtered to authorized profile ids.

### Success paths
- Script run returns execution result and emits execution updates.
- Scheduler lists only tasks whose profile ids are authorized.
- Scheduler skips unauthorized stale tasks and records only scoped failure history.
- History list/delete/clear never leaks profile names, script names, errors, or logs outside current workspace/profile authorization.

### Failure paths
- Script not in current workspace.
- Profile id unauthorized.
- Task references removed profile.
- Bulk run partial failure.
- Existing legacy history records without `workspaceId` are hidden from scoped history views until backfilled.

### High-risk bug areas
- Scheduler executes background task after user loses authorization.
- History leaks profile names from other user groups.
- Scripts not filtered by user group if scripts are workspace wide.

### Regression test ideas
- Non-owner runs script only on authorized profile.
- Create scheduler with unauthorized profile id via direct IPC should fail.
- Remove a member or revoke profile authorization after scheduling, then verify the task does not run.
- Verify history for group A does not show group B profile/script/log details.
- Switch workspace and verify old tasks not shown.

## Scripts

### User-facing entry points
- Script list/editor in `AutomationPage.tsx`.
- Components: `ScriptEditor`, `ActionLibrary`, `SnippetPanel`, `ExecutionLogs`.

### Backend / IPC entry points
- Same `scripts:*` IPC channels above.

### Data involved
- `AutomationScript` in shared types.
- Local JSON store through automation scripts module.

### Primary workflows
- Create/read/update/delete/run JavaScript or flowchart automation.

### Permissions / scope
- Workspace id is mandatory.
- Automation role permissions gate actions.
- Profile references inside runs must be authorized.

### Success paths
- Script CRUD is workspace scoped.

### Failure paths
- Native code execution bugs.
- Script id stale after workspace switch.

### High-risk bug areas
- Dangerous script execution surface.
- Scripts returned to non-owner from another user group if scripts later become group scoped.

### Regression test ideas
- Script CRUD across workspace switch.
- Unauthorized profile run blocked.

## Profile Variables

### User-facing entry points
- Automation page variable editing.
- Profile modal/details where variables are displayed.

### Backend / IPC entry points
- `profiles:setVariables`
- `profiles:update`

### Data involved
- `Profile.variables`.
- Supabase `profiles.variables`.

### Primary workflows
- Save variable key/value map to profile.
- Use variables during automation.

### Permissions / scope
- Requires `profile.edit`.
- Profile must be authorized in current workspace.

### Success paths
- Variables persist locally and cloud sync pushes profile row.

### Failure paths
- Unauthorized profile id.
- Cloud push fails after local update.

### High-risk bug areas
- Variables might contain secrets and must not be logged.
- Automation leaks variables through logs.

### Regression test ideas
- Save variables and reload app.
- Non-owner cannot set variables on unauthorized profile.

## Settings

### User-facing entry points
- `src/renderer/src/pages/SettingsPage.tsx`
- `src/renderer/src/pages/WorkspaceSettingsPage.tsx`

### Backend / IPC entry points
- `settings:get`
- `settings:update`
- `settings:getChromePath`
- `settings:browseChrome`
- `settings:openDataDir`
- `settings:getDataDir`
- `settings:backup`
- `settings:restore`
- Workspace settings IPC listed under Workspace Switching.

### Data involved
- Local app settings from `src/main/appSettings.ts`.
- Workspace settings in Supabase `workspaces.settings`.

### Primary workflows
- Update Chrome path/settings.
- Backup/restore local data.
- Change workspace `permissionMode` and `automationMode`.
- Delete workspace.

### Permissions / scope
- Workspace settings require owner/allowed role permission.
- Local app settings are local to device, not workspace security.

### Success paths
- Settings persist and UI reloads relevant state.

### Failure paths
- Invalid restore payload.
- User cancels file picker.
- Permission mode switch leaves stale authorization UI/data.

### High-risk bug areas
- Backup/restore crosses workspace boundaries.
- Permission mode UI diverges from `workspace.settings.permissionMode`.

### Regression test ideas
- Toggle permission mode and verify invite/edit modal behavior.
- Restore backup and ensure workspace ids remain scoped.

## Local JSON Sync vs Supabase Sync

### User-facing entry points
- Most profile/group/cookie workflows.
- Sync page: `src/renderer/src/pages/SyncPage.tsx` (status: needs confirmation).

### Backend / IPC entry points
- `cloudSync.syncGroupsAndProfiles`
- `cloudSync.pushGroup`, `pushProfile`, `deleteGroup`, `deleteProfile`, `deleteProfiles`, cookies helpers.
- `db.replaceGroupsAndProfiles`.

### Data involved
- Local `zenvy-data.json` with profiles/groups/scripts.
- Supabase `profiles`, `groups`, `profile_cookies`.

### Primary workflows
- Pull cloud profiles/groups for current workspace.
- Merge local/cloud data.
- Replace local workspace slice.
- Push merged rows back to cloud.
- Delete cloud row with affected-row verification, then delete local row.

### Permissions / scope
- Current workspace id is mandatory.
- Cloud queries must filter by `workspace_id`.
- RLS enforces Supabase visibility.
- Backend authorization must be checked before local mutation.

### Success paths
- Sync does not leak data across workspaces.
- Delete/update paths do not report success unless cloud mutation affected expected rows.
- No mutation may report success unless the intended persistence layer confirmed the change.
- Cloud-backed profile/group/cookie mutations either await Supabase or return an explicit sync status.

### Failure paths
- Sync timeout logs warning and continues local.
- RLS blocks mutation.
- Local row exists but cloud row missing.

### High-risk bug areas
- Push after local edit fails silently.
- Merge keeps unauthorized cloud/local rows.
- Delete local before cloud confirmation.
- Local JSON mutation is kept after Supabase push fails.

### Regression test ideas
- Create/update/delete profile and verify Supabase + local JSON.
- Switch workspace after sync and inspect local slice.
- Simulate RLS no-row delete and verify no success toast.

## RLS / Database Policies

### User-facing entry points
- Not direct; visible through auth/workspace/profile/member failures.

### Backend / IPC entry points
- Supabase queries in `src/main/workspaces.ts`, `src/main/cloudSync.ts`, `src/main/auth.ts`.
- SQL migrations in root, including `WORKSPACE-RLS-CANONICAL.sql`, `FIX-WORKSPACE-RLS-CORE-ONLY.sql`, `WORKSPACE-MEMBER-AUTHORIZATIONS.sql`, `FIX-*.sql`.

### Data involved
- `workspaces`
- `workspace_members`
- `workspace_invitations`
- `workspace_user_groups`
- `workspace_role_permissions`
- `workspace_member_profiles`
- `workspace_member_profile_groups`
- `profiles`
- `groups`
- `profile_cookies`
- Auth tables/functions/triggers.

### Primary workflows
- Auth trigger creates user/workspace/member rows.
- Workspace/member/invitation/profile/group CRUD.
- RLS helper functions enforce current user membership and authorization.

### Permissions / scope
- Avoid recursive policies on `workspace_members`.
- Use `SECURITY DEFINER` helpers with safe `search_path`.
- Alias SQL columns to avoid ambiguity.
- Policy behavior must match app-level owner/user group/permission mode rules.
- DELETE policies must check action permission as well as read/authorization scope; visibility alone must not permit destructive mutations.

### Success paths
- SELECT/UPDATE/DELETE policies allow expected flows and block cross-scope access.

### Failure paths
- Infinite recursion `42P17`.
- Ambiguous column `42702`.
- Optional table reference breaks migration.
- No rows affected but app reports success.

### High-risk bug areas
- RLS allows admin/manager global visibility.
- Helper function bypasses user group scope.
- DELETE policy allows a user with read/profile authorization but no `profile.delete` or `group.delete`.
- DELETE helper diverges from backend User Group permission overrides.
- Migration order or duplicate policy names.

### Regression test ideas
- Supabase SQL tests for owner, group A, group B, removed user.
- Verify `workspace_members` policies do not self-query directly.
- Verify destructive app queries use `.select().single()` or row count equivalent.
- Verify direct Supabase profile/group DELETE fails for authorized non-owner roles when delete permission is false.

## Dialog / Toast UX

### User-facing entry points
- `src/renderer/src/store/useDialog.ts`
- `src/renderer/src/components/DialogContainer.tsx`
- `src/renderer/src/store/useToast.ts`
- `src/renderer/src/components/ToastContainer.tsx`
- Delete/update flows across Profiles, Members, Automation, Templates, Workspace Settings.

### Backend / IPC entry points
- Any mutation IPC that UI awaits before toast.

### Data involved
- Dialog state and toast queue in Zustand.

### Primary workflows
- Confirm destructive actions.
- Show success after confirmed backend mutation and refresh.
- Show error with backend message.

### Permissions / scope
- UI affordances can hide unavailable actions, but backend remains source of truth.
- Destructive actions need confirmation.

### Success paths
- Confirm -> await IPC -> await refresh -> success toast.
- Error -> no success toast; show real error.
- Cloud-backed mutation success means Supabase confirmed, not only local JSON changed.

### Failure paths
- Missing await.
- Optimistic success toast.
- Native `confirm`/`alert`/`prompt`.
- Refresh fails after mutation.

### High-risk bug areas
- Fake success.
- Duplicate/unreachable toast code.
- Button remains enabled during async mutation.
- Vietnamese copy unclear or mojibake.

### Regression test ideas
- Force backend error and verify no success toast.
- Cancel delete confirmation and verify no IPC call.
- Double-click delete button and verify single mutation.

# Global Testing Matrix

## Accounts / roles
- Workspace owner.
- Non-owner in User Group A.
- Non-owner in User Group B.
- Removed member.
- Invited but not accepted user.
- Expired/revoked invitation.

## Workspace states
- Fresh login.
- Workspace switch.
- Removed from workspace while app is open.
- Multiple workspaces.
- No workspace selected.

## Authorization modes
- `workspace.settings.permissionMode = group`.
- `workspace.settings.permissionMode = profile`.

## Data states
- Profile with group.
- Profile without group.
- Profile group with profiles.
- Profile group empty.
- Member with `user_group_id`.
- Member missing `user_group_id`.
- Invitation pending.
- Invitation revoked/expired.

## Mutation types
- Create.
- Update.
- Delete.
- Bulk delete.
- Resend.
- Revoke.
- Launch browser.
- Background scheduler action.

## Expected checks
- Supabase row actually changed.
- UI refreshed after mutation.
- No fake success toast.
- No data from wrong workspace.
- No data from wrong user group.
- No unauthorized profile launch.

# Manual Confirmation Needed

- Whether invitation email sending exists outside current repo code; current code appears token/link only.
- Exact UI behavior of `SyncPage.tsx`.
- Runtime scheduler behavior when authorization changes after a task is created.
- Whether `profile_cookies` RLS fully matches workspace/user group/profile authorization.
- Whether scripts should become user-group scoped or remain workspace scoped.
