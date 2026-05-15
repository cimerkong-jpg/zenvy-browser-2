# RLS Policies - Database Security Rule

## Purpose
Define Row Level Security (RLS) policies that enforce authorization at the database level. RLS is the PRIMARY security boundary.

## Critical Principles

### 1. RLS is Mandatory
- ALL tables with user data MUST have RLS enabled
- Backend queries rely on RLS, not application filtering
- Never bypass RLS with service role unless explicitly required for system operations

### 2. RLS Enforces User Group Scope
- Policies MUST respect User Group boundaries
- Owner bypass MUST be explicit in policies
- Policies MUST check `workspace_members.status = 'active'`

### 3. Mutations Require Action Permission
- DELETE/UPDATE policies MUST enforce both visibility/authorization scope and the specific action permission.
- A member who can read or open a profile/group must still be blocked from DELETE unless their role permission grants `profile.delete` or `group.delete`.
- App IPC checks are not enough; direct Supabase calls with an authenticated user session must also be blocked by RLS.
- RLS permission resolution must match backend precedence: `workspace_user_groups.permission_overrides` overrides role permissions; owner is the only bypass.
- `workspace_user_groups.description` is not a permission source.

### 4. Avoid Recursion
- Policies referencing `workspace_members` can cause infinite recursion
- Use CTEs or separate policy tables when needed
- Test policies thoroughly before deployment

## Common Patterns

### Pattern 1: Workspace Member Check
```sql
-- Check if user is active member of workspace
CREATE POLICY "policy_name"
ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = table_name.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  )
);
```

### Pattern 2: Owner or Same User Group
```sql
-- Owner sees all, members see own User Group only
CREATE POLICY "policy_name"
ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = table_name.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND (
      wm.role = 'owner' -- Owner bypass
      OR wm.user_group_id = table_name.user_group_id -- Same group
    )
  )
);
```

### Pattern 3: Permission-Based
```sql
-- Check specific permission via RPC
CREATE POLICY "policy_name"
ON table_name FOR INSERT
WITH CHECK (
  (SELECT get_my_permissions(workspace_id))->>'permission.key' = 'true'
);
```

### Pattern 4: Scoped Delete With Action Permission
```sql
-- DELETE needs both resource authorization and action permission.
CREATE POLICY "profiles_delete_by_authorization"
ON profiles FOR DELETE
USING (
  user_can_delete_profile_row(workspace_id, id::text, group_id::text)
);
```

## Critical Tables

### workspace_members
**⚠️ HIGH RISK OF RECURSION**

```sql
-- SAFE: Use direct role check, no subquery on same table
CREATE POLICY "members_read_workspace_members"
ON workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT w.id FROM workspaces w
    WHERE w.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);
```

### profiles
```sql
-- Members see profiles in their User Group
CREATE POLICY "members_see_own_group_profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = profiles.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND (
      wm.role = 'owner'
      OR wm.user_group_id = profiles.user_group_id
    )
  )
);
```

### groups (profile groups)
```sql
-- Members see groups in their User Group
CREATE POLICY "members_see_own_user_group_groups"
ON groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = groups.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND (
      wm.role = 'owner'
      OR wm.user_group_id = groups.user_group_id
    )
  )
);
```

### workspace_user_groups
```sql
-- All active members can see User Groups in their workspace
CREATE POLICY "members_see_workspace_user_groups"
ON workspace_user_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_user_groups.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  )
);
```

## Forbidden Patterns

### ❌ Recursive Policies
```sql
-- WRONG: This causes infinite recursion!
CREATE POLICY "bad_policy"
ON workspace_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
    AND wm2.user_id = auth.uid()
  )
);
```

### ❌ Missing Status Check
```sql
-- WRONG: Doesn't check if member is active
CREATE POLICY "bad_policy"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = profiles.workspace_id
    AND wm.user_id = auth.uid()
    -- Missing: AND wm.status = 'active'
  )
);
```

### ❌ Bypassing User Group
```sql
-- WRONG: Admin role bypasses User Group scope
CREATE POLICY "bad_policy"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = profiles.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin') -- Admin should NOT bypass!
  )
);
```

## Testing RLS Policies

### Test Checklist
- [ ] Owner can see all data in workspace
- [ ] Member can only see data in their User Group
- [ ] Member cannot see data in other User Groups
- [ ] Removed members cannot see any data
- [ ] Policies don't cause recursion errors
- [ ] Policies don't cause performance issues
- [ ] INSERT/UPDATE/DELETE policies are consistent with SELECT
- [ ] DELETE/UPDATE policies deny users who have read/access scope but lack the action permission
- [ ] Direct Supabase DELETE as authenticated non-owner fails when `profile.delete` or `group.delete` is false
- [ ] User Group permission overrides and direct Supabase DELETE behavior match backend `hasPermission()`
- [ ] `workspace_user_groups.permission_overrides` is the only User Group override source used by RLS
- [ ] In `permissionMode=profile`, a non-owner cannot delete a group that contains any unauthorized profile

### Test Queries
```sql
-- Test as specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Should return only authorized rows
SELECT * FROM profiles;

-- Reset
RESET role;
```

## Changelog
- 2026-05-14: Added invariant that profile/group DELETE RLS must check action permission as well as workspace, user group, and profile authorization scope.
- 2026-05-15: Required RLS DELETE helpers to honor User Group permission overrides and tightened profile-mode group delete to require authorization for every profile inside the group.
- 2026-05-15: Moved User Group override source of truth to `workspace_user_groups.permission_overrides jsonb`; legacy description parsing is transitional only.
- 2026-05-15: Removed legacy description parsing from RLS after migration verification.

## Deployment Workflow

1. **Write Policy**
   - Follow patterns above
   - Include status checks
   - Respect User Group scope

2. **Test Locally**
   - Test with multiple users
   - Test with multiple User Groups
   - Test edge cases (removed members, etc.)

3. **Deploy to Staging**
   - Run migration
   - Verify no recursion errors
   - Verify performance

4. **Deploy to Production**
   - Run during low-traffic window
   - Monitor for errors
   - Have rollback plan ready

## Related Files
- `WORKSPACE-SCHEMA.sql`: Full schema with RLS policies
- `FIX-*.sql`: Pending RLS policy fixes
- `.codex/rules/authorization/user-group-scope.md`
- `.codex/rules/database/migration-workflow.md`

## Known Issues
1. **workspace_members recursion**: Policies on this table must be carefully designed
2. **Performance**: Complex policies can slow queries - use indexes
3. **get_my_permissions RPC**: Can be slow if called in policies - cache when possible
