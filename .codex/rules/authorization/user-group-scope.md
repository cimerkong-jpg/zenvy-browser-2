# User Group Scope - Authorization Rule

## Purpose
Define the PRIMARY visibility boundary for workspace members. User Groups control what profiles and groups members can see and access.

## Critical Invariant
**User Group is the PRIMARY visibility boundary for all non-owner members.**

This is the MOST IMPORTANT authorization rule in the system.

## Architecture

### Hierarchy
```
Workspace Owner (bypasses all scopes)
  └─> User Groups (visibility boundary)
       └─> Members (scoped by User Group)
            └─> Profiles & Groups (scoped by User Group)
```

### Role vs User Group
- **Role** (admin/member/viewer): Defines PERMISSIONS (what actions can be done)
- **User Group**: Defines SCOPE (what data can be seen)
- **Role does NOT bypass User Group scope**
- Only Workspace Owner bypasses User Group scope

## Mandatory Rules

### 1. Invitation Requirements
```typescript
// ✅ CORRECT: Always require userGroupId
await inviteMember({
  email: 'user@example.com',
  role: 'member',
  userGroupId: 'uuid-here', // REQUIRED
  workspaceId: currentWorkspaceId
})

// ❌ WRONG: Never allow null userGroupId for non-owners
await inviteMember({
  email: 'user@example.com',
  role: 'member',
  userGroupId: null, // FORBIDDEN
  workspaceId: currentWorkspaceId
})
```

Invitation mutations are also scoped by User Group:
- Owner may resend/delete any invitation in the workspace.
- Non-owner members may resend/delete only invitations where `workspace_invitations.user_group_id` matches their own `workspace_members.user_group_id`.
- Resend/delete must filter by both `invitation.id` and `workspace_id`, then verify the updated/deleted row was returned.

### 2. Data Filtering
```typescript
// ✅ CORRECT: Filter by user's assigned User Group
const member = await getCurrentWorkspaceMember(workspaceId)
if (!isWorkspaceOwner(member)) {
  profiles = profiles.filter(p =>
    p.userGroupId === member.userGroupId
  )
}

// ❌ WRONG: Filter by role only
if (member.role !== 'admin') {
  // This bypasses User Group scope!
}
```

### 3. Authorization Checks
```typescript
// ✅ CORRECT: Check User Group match
async function assertSameUserGroupOrOwner(
  workspaceId: string,
  targetUserGroupId: string | null
) {
  const member = await getCurrentWorkspaceMember(workspaceId)
  if (isWorkspaceOwner(member)) return // Owner bypasses

  if (member.userGroupId !== targetUserGroupId) {
    throw new Error('Access denied: different User Group')
  }
}

// ❌ WRONG: Check role only
if (member.role === 'admin') {
  // Allow access - WRONG! Bypasses User Group scope
}
```

## Database Schema

### workspace_members
```sql
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role workspace_role NOT NULL,
  user_group_id uuid, -- NULL only for owner
  status member_status NOT NULL,
  CONSTRAINT fk_user_group
    FOREIGN KEY (user_group_id)
    REFERENCES workspace_user_groups(id)
)
```

### Constraints
- `user_group_id` MUST be NOT NULL for non-owner members
- `user_group_id` MUST belong to same workspace
- Owner can have `user_group_id = NULL`

### User Group Permission Overrides
- `workspace_user_groups.description` is human-readable text only.
- User Group permission overrides live in `workspace_user_groups.permission_overrides jsonb`.
- New code MUST NOT store metadata in `description`.
- Backend permission resolution in `getMyPermissions()` reads this exact field first:
  1. `workspace_user_groups.permission_overrides`
  2. role permissions through `get_my_permissions`
- RLS helpers that need action permission must mirror the same precedence.

## RLS Policies

### profiles Table
```sql
-- Members can only see profiles in their User Group
CREATE POLICY "members_see_own_group_profiles"
ON profiles FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND (
      wm.role = 'owner' -- Owner sees all
      OR wm.user_group_id = profiles.user_group_id -- Same group
    )
  )
);
```

## Forbidden Patterns

### ❌ Never Create Parallel Authorization
```typescript
// WRONG: Don't create workspace-level permissions that bypass User Groups
if (hasPermission('profile.view_all')) {
  // This breaks User Group scope!
}
```

### ❌ Never Use Role to Bypass Scope
```typescript
// WRONG: Admin role should not see all groups
if (member.role === 'admin') {
  return allProfiles // Bypasses User Group!
}
```

### ❌ Never Allow NULL userGroupId for Non-Owners
```typescript
// WRONG: Non-owners must have User Group
if (member.role !== 'owner' && !member.userGroupId) {
  // This member has no scope boundary!
}
```

## Implementation Checklist

When implementing features that touch authorization:

- [ ] Verify User Group is checked for non-owners
- [ ] Verify Owner bypass is explicit and intentional
- [ ] Verify invitations include userGroupId
- [ ] Verify RLS policies enforce User Group scope
- [ ] Verify no role-based scope bypass exists
- [ ] Test with multiple User Groups in same workspace
- [ ] Test that members cannot see other groups' data

## Related Files
- `src/main/workspaces.ts`: `assertSameUserGroupOrOwner()`, `filterAuthorizedProfiles()`, `filterAuthorizedGroups()`
- `src/main/workspaces.ts`: `getMyPermissions()`
- `src/shared/workspace-types.ts`: `WorkspaceMember.userGroupId`
- `.codex/rules/database/rls-policies.md`
- `.codex/rules/backend/workspace-management.md`

## Migration Notes
If changing User Group logic:
1. Update RLS policies first
2. Test with existing data
3. Provide migration for members without userGroupId
4. Update all authorization checks
5. Document breaking changes

## Changelog
- 2026-05-15: Documented that User Group permission overrides currently live in prefixed JSON metadata inside `workspace_user_groups.description`, and that backend/RLS permission resolution must use the same precedence.
- 2026-05-15: Finalized `permission_overrides jsonb` as the permission source of truth; `description` is human-readable only and legacy prefixed metadata is migration fallback only.
- 2026-05-15: Removed legacy prefixed-description fallback after migration verification; `permission_overrides` is now the only supported override source.
