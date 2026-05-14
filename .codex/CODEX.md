# Zenvy Browser - AI Codex

## Project Overview
Zenvy Browser is an Electron-based multi-profile browser management application with workspace collaboration features. Built with TypeScript, React, Zustand, and Supabase.

**Core Architecture:**
- **Frontend**: React + Zustand stores + Tailwind CSS
- **Backend**: Electron Main process + IPC handlers
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth
- **Storage**: Local JSON + Cloud sync

## Language / Ngôn Ngữ
Luôn trả lời bằng tiếng Việt, trừ khi user yêu cầu rõ ràng ngôn ngữ khác.

## Critical Invariants

### 1. User Group Scope (MANDATORY)
**User Group is the PRIMARY visibility boundary for all non-owner members.**

- Role (admin/member/viewer) does NOT bypass User Group scope
- Only Workspace Owner bypasses User Group scope
- Members can ONLY see/access profiles and groups within their assigned User Group
- Invitations MUST include userGroupId
- Never create parallel authorization systems

**Related:** `.codex/rules/authorization/user-group-scope.md`

### 2. Workspace Isolation
- All data (profiles, groups, members) MUST be scoped by workspace_id
- Never use workspace name for queries - always use workspace.id (UUID)
- currentWorkspaceId drives all data loading
- Switching workspace MUST reload all workspace-scoped data

### 3. RLS Security
- Supabase RLS policies enforce all access control
- Backend queries rely on RLS, not application-level filtering
- Never bypass RLS with service role unless explicitly required
- Test RLS policies before deploying schema changes

### 4. No Secret Leakage
- Never log, print, or expose: API keys, tokens, cookies, passwords, session data
- Sanitize error messages before showing to users
- Use encrypted storage for sensitive local data

## Instruction Priority
1. User's latest request
2. Data safety, secrets, and user changes
3. This `CODEX.md` file
4. Rules in `.codex/rules/`
5. Workflows in `.codex/workflows/`
6. Roles in `.codex/roles/`

If instructions conflict, state the conflict clearly and choose the safest, most reversible path.

## Core Behavior
- Read code, config, tests, and docs before modifying
- Prefer existing patterns over new abstractions
- Keep changes small, focused, reviewable
- Never revert user changes without explicit request
- Never delete files, reset git, or run destructive commands without confirmation
- Never log secrets: API keys, tokens, cookies, passwords, credentials
- State assumptions clearly or ask when risk is high

## When to Ask First
Ask before:
- Deleting files or directories
- Running destructive or system-altering commands
- Installing, removing, or upgrading dependencies
- Changing public APIs, schemas, auth, permissions, billing, or security boundaries
- Large refactors beyond task scope
- Using secrets, credentials, sessions, browser profiles, or auth files

## Default Workflow
1. Understand goal, context, expected result
2. Identify related files and modules
3. Read existing code before proposing or modifying
4. Make minimal but complete changes
5. Verify with appropriate checks (typecheck/test/build/manual)
6. Report concisely: what changed, which files, how verified, remaining risks

## Code Standards
- Don't modify unnecessarily
- Don't format entire files unless needed
- Don't change naming/style if repo has conventions
- Don't add dependencies without technical justification
- Don't add meaningless comments; only comment when code is hard to understand
- Don't leave dead code, placeholders, debug logs, or vague TODOs unless requested

## Verification
Choose appropriate checks:
- TypeScript: `npm run typecheck`
- Logic: relevant tests
- Build/config/package: build or corresponding script
- UI: manual check, responsive/state verification when possible
- Security/config: check secrets, logs, env, permissions

If checks can't run, state why and remaining risks.

## Final Response
Keep it short, clear, useful:
- Summary of changes
- Files modified
- Checks run and results
- Remaining risks or next steps if any

Don't elaborate on internal process unless user asks.

## Directory Structure
- `.codex/rules/`: foundational rules for all tasks
- `.codex/rules/authorization/`: authorization and permission rules
- `.codex/rules/database/`: database, RLS, and migration rules
- `.codex/rules/backend/`: Electron main process and IPC rules
- `.codex/rules/frontend/`: React, Zustand, and UI rules
- `.codex/roles/`: specialized modes by role
- `.codex/workflows/`: execution processes by work type
- `.codex/skills/`: reusable capabilities combining rules, roles, workflows, checklists
- `.codex/checklists/`: pre-completion checklists
- `.codex/memory.md`: stable user/workspace preferences
- `.codex/local.md`: local machine notes (no secrets)

## Domain-Specific Rules
Read these before modifying related code:
- **Authorization**: `.codex/rules/authorization/user-group-scope.md`
- **Profile Authorization**: `.codex/rules/authorization/profile-authorization.md`
- **Members**: `.codex/rules/frontend/members-page.md`
- **Workspaces**: `.codex/rules/backend/workspace-management.md`
- **Database**: `.codex/rules/database/rls-policies.md`
- **IPC Security**: `.codex/rules/backend/ipc-security.md`
- **SQL Migrations**: `.codex/rules/database/migration-workflow.md`

## Advanced Rules
Use these for high-risk or precision tasks:
- `rules/context.md`: gather context efficiently, don't read excessively
- `rules/git.md`: protect dirty worktree and user changes
- `rules/dependencies.md`: add/upgrade dependencies with control
- `rules/error-handling.md`: handle errors safely, actionably, without leaking internals
- `rules/data-safety.md`: protect data, migrations, cache, logs, local state
- `workflows/decision-record.md`: record/standardize major technical decisions

## Maintenance Workflow
After every:
- Feature implementation
- Permission/authorization change
- Database migration
- IPC contract change
- State/store modification

You MUST:
1. Update related rule files in `.codex/rules/`
2. Update testing checklists
3. Update migration notes if architecture changed
4. Document new invariants or constraints

## Current Focus
- Workspace collaboration features
- User Group-based authorization
- Members management
- RLS policy enforcement
- Cloud sync stability

## Known Critical Issues
1. **RLS Recursion**: workspace_members policies can cause infinite recursion
2. **Role Mapping**: UI labels (Admin/Manager/Member) vs DB roles (admin/member/viewer) need consistent mapping
3. **Member Visibility**: Invited members may not appear due to RLS blocking queries
4. **Workspace Data Loading**: Profiles/groups may not load after login if workspace context is stale

**See:** `FIX-*.sql` files in root for pending database fixes
