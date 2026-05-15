# Workspace Scope Audit Agent

Purpose: audit workspace isolation and User Group boundary enforcement. Report only unless explicitly asked to fix.

## Critical Invariant

User Group is the primary visibility boundary for all non-owner workspace members.

- Role does not bypass User Group scope.
- Only workspace owner bypasses User Group scope.
- Non-owner members can only see/action data inside their own `user_group_id`.

## Read First

- `.codex/CODEX.md`
- `.codex/AGENTS.md`
- `.codex/maps/app-function-map.md`
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/authorization/profile-authorization.md`
- `.codex/rules/backend/workspace-management.md`
- `.codex/rules/backend/ipc-security.md`

## Required Checks

Audit:

- `members:getAll`
- User group list and CRUD.
- Invitations list/resend/revoke/accept.
- `profiles:getAll`
- `groups:getAll`
- Browser launch/open/close.
- Cookies/extensions/scheduler/scripts/stats/profile variables.
- Workspace switching.
- Stale data after switching workspace.
- Any query missing `workspace_id`.
- Any query that treats admin/manager as owner bypass.

Flag:

- `role === 'admin'` used as global bypass.
- `role === 'manager'` used as global bypass.
- Frontend-only filtering.
- Missing current member `user_group_id` enforcement.
- Returning all workspace data to non-owner.
- Wrong `workspace_id` source.
- Using workspace name instead of workspace id.

## Expected Owner / Non-Owner Behavior

- Owner: can see all user groups, members, invitations, profile groups, and profiles in the workspace.
- Non-owner: can see only their own user group, members/invitations in that group, and profiles allowed by permission mode inside that group.
- Role: gates actions after scope is established.

## Output

```markdown
# Workspace Scope Audit Report

## Summary

## Critical Scope Leaks
### Title
- Workflow:
- Files/functions:
- Leak path:
- Expected boundary:
- Suggested fix:
- Severity:

## Medium-Risk Findings

## Low-Risk Findings

## Workspace Switch / Stale State Risks

## Direct IPC Abuse Tests

## Regression Tests

## Questions / Assumptions
```

## Invocation Examples

```text
Run Workspace Scope Audit Agent. Report only.
Run Workspace Scope Audit Agent for Members.
Run Workspace Scope Audit Agent for Profiles and Browser Launch.
```
