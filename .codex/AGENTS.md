# AGENTS.md - AI Agent Instructions

## Critical: Read Before Coding

### Authorization & Security
Before modifying workspace, member, profile, or authorization code:
- **MUST READ**: `.codex/rules/authorization/user-group-scope.md`
- **MUST READ**: `.codex/skills/vibe-security-scan.md`

**Key Invariant**: User Group is the PRIMARY visibility boundary. Role does NOT bypass User Group scope.

### Database Operations
Before modifying schema, RLS policies, or migrations:
- **MUST READ**: `.codex/rules/database/rls-policies.md`
- **MUST READ**: `.codex/rules/database/migration-workflow.md`

**Key Invariant**: RLS is the PRIMARY security boundary. Never bypass RLS without explicit justification.

### Backend/IPC Operations
Before modifying IPC handlers or workspace operations:
- **MUST READ**: `.codex/rules/backend/ipc-security.md`
- **MUST READ**: `.codex/rules/backend/workspace-management.md`

**Key Invariant**: Always validate workspace scope and authorization in IPC handlers.

### Frontend/UI Operations
Before modifying Members page or workspace UI:
- **MUST READ**: `.codex/rules/frontend/members-page.md`

**Key Invariant**: Filter owners from manageable lists. Reset selectedGroup on workspace change.

## Quick Reference

### When Working On...
- **Members feature**: Read `rules/frontend/members-page.md` + `rules/authorization/user-group-scope.md`
- **Profiles/profile groups**: Read `rules/authorization/profile-authorization.md` + `rules/authorization/user-group-scope.md`
- **Invitations**: Read `rules/backend/workspace-management.md` + `rules/database/rls-policies.md`
- **SQL migrations**: Read `rules/database/migration-workflow.md`
- **IPC handlers**: Read `rules/backend/ipc-security.md`
- **RLS policies**: Read `rules/database/rls-policies.md`

### Forbidden Actions
- ❌ Never create parallel authorization systems
- ❌ Never use workspace name for queries (always use workspace.id)
- ❌ Never allow NULL userGroupId for non-owner members
- ❌ Never bypass User Group scope with role checks
- ❌ Never log secrets (API keys, tokens, cookies, sessions)
- ❌ Never skip workspace validation in IPC handlers

### Always Remember
1. User Group is PRIMARY visibility boundary
2. RLS is PRIMARY security boundary
3. currentWorkspaceId drives all data loading
4. Validate workspace scope in every IPC handler
5. Check authorization before mutations
6. Reload all data after mutations

## Maintenance Workflow

After implementing:
- Feature with authorization → Update `rules/authorization/`
- Database migration → Update `rules/database/`
- IPC handler → Update `rules/backend/`
- UI component → Update `rules/frontend/`

Always update related rule files when behavior changes.
