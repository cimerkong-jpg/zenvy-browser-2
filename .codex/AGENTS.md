# AGENTS.md - AI Agent Instructions

Read `.codex/CODEX.md` first.

Use the supporting folders when relevant:

- `.codex/rules/`: durable engineering rules and invariants.
- `.codex/maps/`: function maps and tester-oriented app maps.
- `.codex/agents/`: repeatable QA, audit, and testing workflows.
- `.codex/roles/`: specialist working modes.
- `.codex/workflows/`: execution flows for common task types.
- `.codex/skills/`: reusable skills combining rules, roles, workflows, and checklists.
- `.codex/checklists/`: pre-edit, pre-final, security, and UI checks.

Keep credentials, auth files, sessions, logs, caches, and local runtime state private.

## Agent System

Quick links:

- `.codex/maps/app-function-map.md`
- `.codex/agents/README.md`
- `.codex/agents/tester-agent.md`
- `.codex/agents/bug-hunter.md`
- `.codex/agents/security-audit.md`
- `.codex/agents/workspace-scope-audit.md`
- `.codex/agents/rls-audit.md`
- `.codex/agents/ui-consistency-audit.md`
- `.codex/agents/regression-test-planner.md`

When asked to "run an agent", read that agent file and execute its workflow exactly.

When asked to test like a QA tester, start from `.codex/maps/app-function-map.md` and `.codex/agents/tester-agent.md`.

Agents report first. They must not modify app code unless the user explicitly asks for implementation.

## Critical: Read Before Coding

### Authorization & Security
Before modifying workspace, member, profile, or authorization code:

- MUST READ: `.codex/rules/authorization/user-group-scope.md`
- MUST READ: `.codex/rules/authorization/profile-authorization.md`
- MUST READ: `.codex/rules/backend/ipc-security.md`

Key invariant: User Group is the primary visibility boundary. Role does not bypass User Group scope.

### Database Operations
Before modifying schema, RLS policies, or migrations:

- MUST READ: `.codex/rules/database/rls-policies.md`
- MUST READ: `.codex/rules/database/migration-workflow.md`

Key invariant: RLS is a source-of-truth security boundary. Do not disable RLS.

### Backend / IPC Operations
Before modifying IPC handlers or workspace operations:

- MUST READ: `.codex/rules/backend/ipc-security.md`
- MUST READ: `.codex/rules/backend/workspace-management.md`

Key invariant: every IPC must validate workspace scope, user group scope, owner/non-owner status, and target authorization.

### Frontend / UI Operations
Before modifying Members page or workspace UI:

- MUST READ: `.codex/rules/frontend/members-page.md`
- MUST READ: `.codex/rules/frontend/dialogs-and-toasts.md`

Key invariant: success toast only after backend-confirmed mutation and required refresh complete.

## Quick Reference

When working on:

- Members feature: read `rules/frontend/members-page.md` + `rules/authorization/user-group-scope.md`.
- Profiles/profile groups: read `rules/authorization/profile-authorization.md` + `rules/authorization/user-group-scope.md`.
- Invitations: read `rules/backend/workspace-management.md` + `rules/database/rls-policies.md`.
- SQL migrations: read `rules/database/migration-workflow.md`.
- IPC handlers: read `rules/backend/ipc-security.md`.
- RLS policies: read `rules/database/rls-policies.md`.
- Dialogs/toasts: read `rules/frontend/dialogs-and-toasts.md`.

## Forbidden Actions

- Never create parallel authorization systems.
- Never use workspace name for queries; use workspace id.
- Never allow null `userGroupId` for non-owner members.
- Never bypass User Group scope with role checks.
- Never log secrets: API keys, tokens, cookies, sessions, passwords, proxy credentials.
- Never skip workspace validation in IPC handlers.
- Never use native `alert`, `confirm`, or `prompt` in renderer UI.

## Always Remember

1. User Group is the primary visibility boundary.
2. Role controls actions only inside that user group.
3. Only workspace owner bypasses user group scope.
4. Backend + RLS are source of truth.
5. `currentWorkspaceId` drives workspace-scoped data loading.
6. Validate authorization before mutations.
7. Reload relevant data after confirmed mutations.

## Maintenance Workflow

After implementing:

- Feature with authorization: update `rules/authorization/`.
- Database migration: update `rules/database/`.
- IPC handler: update `rules/backend/`.
- UI component: update `rules/frontend/`.
- New QA/audit domain: update `.codex/maps/` or `.codex/agents/`.

Always update related rule files when behavior changes.

## Quality Assurance

Before major releases:

```text
Run Tester Agent using app-function-map. Report only. Do not change code.
Run Bug Hunter Agent. Report only. Do not change code.
Run Security Audit Agent. Report only.
Run RLS Audit Agent. Report only.
```

After authorization changes:

```text
Run Workspace Scope Audit Agent. Report only.
Run Security Audit Agent for IPC handlers. Report only.
```

After database migrations:

```text
Run RLS Audit Agent for latest migrations. Report only.
```
