# User Experience QA

Date: 2026-05-13

## Goal

Use this pass to validate Zenvy Browser as a real user would: sign in, enter a
workspace, manage profiles, invite members, and confirm permission boundaries.

## Before Starting

- Run `npm.cmd run typecheck`.
- Run `npm.cmd test`.
- Run `npm.cmd run build` when preparing a packaged app.
- Apply `WORKSPACE-RLS-CANONICAL.sql` in Supabase before testing workspace and
  member flows against the cloud project.

## Core Flow

1. Launch the app with `npm.cmd start`.
2. Sign in with a real test account.
3. Confirm the default workspace appears and can be selected.
4. Create a second workspace and switch between workspaces.
5. Create a profile in each workspace and confirm profiles do not leak between workspaces.
6. Create, edit, duplicate, launch, and close a profile.
7. Create and rename local profile groups.
8. Open workspace settings and update workspace name/settings.
9. Invite a member with `member` role.
10. Sign in as invited user, accept invitation, and confirm the workspace appears.
11. Create a user group as owner/admin and assign a member to it.
12. Confirm a member/viewer without permission cannot mutate user groups or role permissions.
13. Sign out and restart the app to confirm session persistence.

## Pass Criteria

- No uncaught renderer errors during the core flow.
- Workspace switch updates profiles, groups, members, and permissions consistently.
- RLS denies unauthorized mutation while allowing expected reads.
- No logs print tokens, session values, invitation tokens, or full Supabase keys.
- App remains usable after restart.

## Known Follow-Ups

- `.env` is still tracked by Git and should be removed from the index after explicit confirmation.
- Older archived fix files can be deleted after the canonical migration is proven in Supabase.
- Automated E2E coverage is still future work.
