# AI Architecture Summary - Zenvy Browser

## Overview
This document summarizes the AI instruction architecture created for the Zenvy Browser project. The architecture is designed to be scalable, maintainable, and optimized for AI agents.

## Philosophy
- **Minimal Root**: `CODEX.md` stays small and focused on critical invariants
- **Modular Rules**: Detailed logic split into focused domain-specific files
- **AI-Optimized**: Highly structured, low ambiguity, explicit invariants
- **Maintenance-First**: Rules must be updated when behavior changes

## Structure Created

### Root Files
```
/.codex/
├── CODEX.md              # Minimal root index (UPDATED)
├── AGENTS.md             # Quick reference for AI agents (UPDATED)
├── memory.md             # User preferences (existing)
└── local.md              # Local notes (existing)
```

### Domain-Specific Rules (NEW)
```
/.codex/rules/
├── authorization/
│   └── user-group-scope.md          # PRIMARY visibility boundary rule
├── database/
│   ├── rls-policies.md              # RLS security patterns
│   └── migration-workflow.md        # SQL migration workflow
├── backend/
│   ├── workspace-management.md      # Workspace operations
│   └── ipc-security.md              # IPC handler security
└── frontend/
    └── members-page.md              # Members UI patterns
```

### Existing Structure (Preserved)
```
/.codex/
├── roles/          # Specialized modes (architect, debugger, etc.)
├── workflows/      # Execution processes (bugfix, feature, etc.)
├── skills/         # Reusable capabilities
├── checklists/     # Pre-completion checklists
└── rules/          # Foundational rules (enhanced with new domains)
```

## Critical Invariants Documented

### 1. User Group Scope (MOST IMPORTANT)
**Location**: `.codex/rules/authorization/user-group-scope.md`

**Rule**: User Group is the PRIMARY visibility boundary for all non-owner members.

**Key Points**:
- Role (admin/member/viewer) defines PERMISSIONS, not SCOPE
- User Group defines SCOPE (what data can be seen)
- Only Workspace Owner bypasses User Group scope
- Never create parallel authorization systems

**Forbidden**:
- ❌ Using role to bypass User Group scope
- ❌ NULL userGroupId for non-owner members
- ❌ Workspace-level permissions that bypass User Groups

### 2. RLS Security
**Location**: `.codex/rules/database/rls-policies.md`

**Rule**: RLS is the PRIMARY security boundary. All access control enforced at database level.

**Key Points**:
- All tables with user data MUST have RLS enabled
- Backend queries rely on RLS, not application filtering
- Policies MUST check `workspace_members.status = 'active'`
- Avoid recursion in policies (especially on `workspace_members`)

**Forbidden**:
- ❌ Bypassing RLS with service role
- ❌ Recursive policies on `workspace_members`
- ❌ Missing status checks in policies

### 3. Workspace Isolation
**Location**: `.codex/CODEX.md`, `.codex/rules/backend/workspace-management.md`

**Rule**: All data MUST be scoped by workspace_id (UUID).

**Key Points**:
- Never use workspace name for queries
- currentWorkspaceId drives all data loading
- Switching workspace MUST reload all data
- Validate workspace scope in every IPC handler

**Forbidden**:
- ❌ Using workspace.name instead of workspace.id
- ❌ Cross-workspace data access
- ❌ Stale workspace context

### 4. IPC Security
**Location**: `.codex/rules/backend/ipc-security.md`

**Rule**: Every IPC handler MUST validate workspace scope and authorization.

**Key Points**:
- Validate resource belongs to current workspace
- Check User Group authorization for non-owners
- Sanitize all errors before returning
- Never log secrets

**Forbidden**:
- ❌ Trusting frontend authorization
- ❌ Skipping workspace validation
- ❌ Exposing internal paths in errors

## Architecture Detected

### Frontend
- **Framework**: React + TypeScript
- **State**: Zustand stores (`useWorkspace`, `useStore`, `useAuth`)
- **Styling**: Tailwind CSS
- **Key Pages**: MembersPage, ProfilesPage, WorkspaceSettingsPage

### Backend
- **Runtime**: Electron Main process
- **IPC**: Electron IPC handlers in `src/main/index.ts`
- **Core Logic**: `src/main/workspaces.ts`, `src/main/db.ts`, `src/main/cloudSync.ts`
- **Auth**: Supabase Auth via `src/main/auth.ts`

### Database
- **Provider**: Supabase (PostgreSQL)
- **Security**: Row Level Security (RLS) policies
- **Key Tables**: workspaces, workspace_members, workspace_user_groups, profiles, groups
- **Auth**: Supabase Auth with `auth.uid()`

### Data Flow
```
User Action
  → Frontend Component
  → Zustand Store
  → IPC Call (window.api.*)
  → Backend Handler (src/main/index.ts)
  → Business Logic (src/main/workspaces.ts)
  → Supabase Query (with RLS)
  → Response
```

## Known Issues Documented

### 1. RLS Recursion
**Issue**: Policies on `workspace_members` can cause infinite recursion

**Location**: Multiple `FIX-WORKSPACE-*.sql` files

**Solution**: Use direct workspace ownership checks, avoid subqueries on same table

### 2. Role Mapping Inconsistency
**Issue**: UI labels (Admin/Manager/Member) don't match DB roles (admin/member/viewer)

**Location**: Documented in `CODEX.md` and `rules/frontend/members-page.md`

**Solution**: Implement consistent mapping layer

### 3. Member Visibility
**Issue**: Invited members may not appear due to RLS blocking queries

**Location**: Multiple `FIX-*.sql` files

**Solution**: Fix RLS policies to allow owners/admins to read all workspace members

### 4. Ambiguous Column Names
**Issue**: RPC functions with ambiguous column references cause errors

**Location**: `FIX-ACCEPT-PENDING-INVITATIONS-AMBIGUOUS.sql`

**Solution**: Use prefixes (v_ for variables, aliases for tables)

## Maintenance Workflow

### After Every Change
1. **Update Related Rules**: If behavior changes, update `.codex/rules/` files
2. **Update Checklists**: Add new test cases to checklists
3. **Document Invariants**: Add new constraints to rule files
4. **Update Migration Notes**: If architecture changes

### When Adding Features
1. Read relevant rules in `.codex/rules/`
2. Follow established patterns
3. Update rules if introducing new patterns
4. Document new invariants

### When Fixing Bugs
1. Identify which rule was violated
2. Fix the code
3. Update rule if pattern was unclear
4. Add test case to prevent regression

## Missing/Inconsistent Areas

### 1. Profile Authorization
**Status**: Partially implemented

**Issue**: `filterAuthorizedProfiles()` exists but not consistently used

**Recommendation**: Audit all profile operations for authorization checks

### 2. Cloud Sync Authorization
**Status**: Unclear

**Issue**: `src/main/cloudSync.ts` may not enforce User Group scope

**Recommendation**: Add authorization checks to cloud sync operations

## Latest Architecture Update - 2026-05-14

- Added `.codex/rules/authorization/profile-authorization.md` for profile/profile-group access and mutation rules.
- Added backend-confirmed mutation invariant: delete/update flows must verify affected rows before returning success.
- Profile/profile-group deletes now require Supabase confirmed rows before local JSON is mutated or UI success toast is shown.
- Added `FIX-PROFILE-GROUP-DELETE-RLS.sql` for profile/group DELETE policies that support `delete().eq(...).select().single()` with RLS enabled.
- Dialog/toast rules now require success toast only after backend-confirmed mutation and refresh.

### 3. Local vs Cloud Data
**Status**: Mixed

**Issue**: Profiles/groups stored locally (JSON) AND in Supabase

**Recommendation**: Document data source and sync strategy clearly

### 4. Role Permission Templates
**Status**: Implemented but complex

**Issue**: Multiple permission systems (role-based, group-based, profile-based)

**Recommendation**: Simplify or document clearly which takes precedence

### 5. Workspace Settings
**Status**: Partially documented

**Issue**: `workspace.settings.permissionMode` exists but usage unclear

**Recommendation**: Document all workspace settings and their effects

## Risky Areas Needing Refactor

### 1. workspace_members RLS Policies
**Risk**: HIGH - Recursion errors

**Current**: Multiple failed attempts to fix

**Recommendation**: Use separate policy table or materialized view

### 2. Multiple Authorization Layers
**Risk**: MEDIUM - Confusion and bugs

**Current**: RLS + backend checks + frontend filtering

**Recommendation**: Consolidate to RLS + minimal backend validation

### 3. Workspace Name Usage
**Risk**: MEDIUM - Multiple workspaces can have same name

**Current**: Some code may still use workspace name

**Recommendation**: Audit and replace all name-based queries with ID-based

### 4. Stale Workspace Context
**Risk**: MEDIUM - Data from wrong workspace

**Current**: selectedGroup can be stale after workspace switch

**Recommendation**: Implement workspace context provider with automatic cleanup

## Files Created

### New Rule Files (6 files)
1. `.codex/rules/authorization/user-group-scope.md`
2. `.codex/rules/database/rls-policies.md`
3. `.codex/rules/database/migration-workflow.md`
4. `.codex/rules/backend/workspace-management.md`
5. `.codex/rules/backend/ipc-security.md`
6. `.codex/rules/frontend/members-page.md`

### Updated Files (2 files)
1. `.codex/CODEX.md` - Made minimal and focused
2. `.codex/AGENTS.md` - Added quick reference and rule links

### Summary Files (1 file)
1. `.codex/AI-ARCHITECTURE-SUMMARY.md` - This file

## Next Steps for Future Agents

### Immediate
1. Read `CODEX.md` for critical invariants
2. Read `AGENTS.md` for quick reference
3. Read relevant domain rules before coding

### When Implementing
1. Follow patterns in rule files
2. Validate against forbidden patterns
3. Update rules if introducing new patterns

### When Debugging
1. Check which rule was violated
2. Fix code to follow rule
3. Update rule if unclear

### When Refactoring
1. Document breaking changes
2. Update all related rules
3. Provide migration path

## Success Metrics

### Architecture Quality
- ✅ CODEX.md is minimal (< 200 lines)
- ✅ Rules are focused (1 domain per file)
- ✅ Critical invariants documented
- ✅ Forbidden patterns explicit
- ✅ Cross-references included

### AI Usability
- ✅ Highly structured
- ✅ Low ambiguity
- ✅ Explicit constraints
- ✅ Pattern examples included
- ✅ Quick reference available

### Maintainability
- ✅ Modular structure
- ✅ Clear ownership
- ✅ Update workflow defined
- ✅ No duplication
- ✅ Consistent terminology

## Conclusion

The AI instruction architecture is now established with:
- **Minimal root** (CODEX.md)
- **Focused domain rules** (6 new files)
- **Critical invariants documented** (User Group scope, RLS, workspace isolation)
- **Clear maintenance workflow**
- **Comprehensive analysis** of current state

Future AI agents should:
1. Start with `CODEX.md` and `AGENTS.md`
2. Read relevant domain rules before coding
3. Update rules when behavior changes
4. Follow established patterns

The architecture is designed to scale as the project grows while keeping individual files focused and maintainable.
