# SQL Migration Workflow

## Purpose
Define safe workflow for database schema changes and RLS policy updates.

## File Naming Convention
```
FIX-<DESCRIPTION>-<ISSUE>.sql
WORKSPACE-<FEATURE>-MIGRATION.sql
```

Examples:
- `FIX-ACCEPT-PENDING-INVITATIONS-AMBIGUOUS.sql`
- `WORKSPACE-MEMBER-AUTHORIZATIONS.sql`
- `FIX-WORKSPACE-INVITATIONS-USER-GROUP-SCOPE.sql`
- `FIX-PROFILE-GROUP-DELETE-RLS.sql`

## Migration Structure

### Template
```sql
-- ============================================================================
-- Title: Brief description
-- ============================================================================
-- Issue: What problem this fixes
-- Solution: How it fixes it
-- Date: YYYY-MM-DD
-- ============================================================================

-- Step 1: Drop existing objects if needed
DROP FUNCTION IF EXISTS function_name();

-- Step 2: Create/alter schema
CREATE TABLE IF NOT EXISTS table_name (...);

-- Step 3: Migrate data if needed
UPDATE table_name SET ...;

-- Step 4: Create RLS policies
CREATE POLICY "policy_name" ON table_name ...;

-- Step 5: Grant permissions
GRANT SELECT ON table_name TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
-- Test queries to verify migration worked
SELECT * FROM table_name WHERE ...;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP POLICY "policy_name" ON table_name;
```

## Critical Rules

### 1. Always Include Verification
```sql
-- Verify the fix worked
SELECT
  COUNT(*) as broken_count
FROM workspace_members
WHERE role = 'owner'
AND user_group_id IS NOT NULL;
-- Expected: 0
```

### 2. Test for Recursion
```sql
-- Test RLS policy doesn't cause recursion
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "test-user-id"}';

SELECT * FROM workspace_members LIMIT 1;
-- Should not error with "infinite recursion"

RESET role;
```

### 3. Avoid Ambiguous Column Names
```sql
-- ❌ WRONG: Ambiguous columns in RPC
CREATE FUNCTION my_function()
RETURNS TABLE (workspace_id uuid)
AS $$
DECLARE
  workspace_id uuid; -- Conflicts with return column!
BEGIN
  -- ...
END;
$$;

-- ✅ CORRECT: Use prefixes
CREATE FUNCTION my_function()
RETURNS TABLE (result_workspace_id uuid)
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
BEGIN
  -- ...
END;
$$;
```

### 4. Preserve Data
```sql
-- Always backup before destructive operations
CREATE TABLE workspace_members_backup AS
SELECT * FROM workspace_members;

-- Then perform migration
UPDATE workspace_members SET ...;

-- Verify
SELECT COUNT(*) FROM workspace_members;
SELECT COUNT(*) FROM workspace_members_backup;

-- Drop backup after verification
-- DROP TABLE workspace_members_backup;
```

### 5. Verify Mutating Policies Return Rows
For app mutations that rely on `update/delete ... select().single()`, RLS must allow the mutation and the returned row for the intended actor. This is required for invitation/profile/group resend/delete so the UI cannot show optimistic success.

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('workspace_invitations', 'profiles', 'groups')
order by policyname;
```

### 6. Persistence Confirmation
No mutation may report success unless the intended persistence layer confirmed the change. For Supabase-backed data, use `insert/update/delete/upsert ... select().single()` or an equivalent affected-row verification. If a flow is intentionally local-first/offline, the caller must receive an explicit `pendingSync` or `failedSync` state instead of normal success.

## RPC Functions

### Pattern: Safe RPC with Qualified Columns
```sql
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TABLE (result_workspace_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_invitation_record record;
BEGIN
  v_current_user_id := auth.uid();

  FOR v_invitation_record IN
    SELECT
      wi.id AS inv_id,
      wi.workspace_id AS inv_workspace_id,
      wi.role AS inv_role
    FROM workspace_invitations wi
    WHERE wi.user_id = v_current_user_id
  LOOP
    -- Use qualified names
    INSERT INTO workspace_members (workspace_id, role)
    VALUES (v_invitation_record.inv_workspace_id, v_invitation_record.inv_role);
  END LOOP;

  RETURN;
END;
$$;
```

## Deployment Checklist

### Pre-Deployment
- [ ] Migration file follows naming convention
- [ ] Includes verification queries
- [ ] Includes rollback plan
- [ ] Tested locally with real data
- [ ] No ambiguous column names
- [ ] No infinite recursion
- [ ] Preserves existing data

### Deployment
- [ ] Run during low-traffic window
- [ ] Monitor for errors
- [ ] Run verification queries
- [ ] Check application logs
- [ ] Test critical user flows

### Post-Deployment
- [ ] Verify no errors in logs
- [ ] Verify data integrity
- [ ] Update related documentation
- [ ] Update `.codex/rules/` if behavior changed
- [ ] Archive migration file

## Changelog
- 2026-05-15: Added persistence-confirmation invariant for Supabase-backed mutations and explicit sync-state requirement for local-first flows.

## Common Issues

### Issue 1: Ambiguous Columns
**Symptom:** `column reference "workspace_id" is ambiguous`

**Fix:** Use prefixes for all variables and aliases
```sql
-- Use v_ for variables, alias tables
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT wm.workspace_id INTO v_workspace_id
  FROM workspace_members wm
  WHERE wm.user_id = auth.uid();
END;
```

### Issue 2: Infinite Recursion
**Symptom:** `infinite recursion detected in policy`

**Fix:** Don't reference same table in RLS policy
```sql
-- WRONG
CREATE POLICY "bad" ON workspace_members
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
  )
);

-- CORRECT
CREATE POLICY "good" ON workspace_members
USING (
  workspace_id IN (
    SELECT w.id FROM workspaces w
    WHERE w.owner_id = auth.uid()
  )
);
```

### Issue 3: Data Loss
**Symptom:** Migration deleted or corrupted data

**Fix:** Always backup first, verify counts
```sql
-- Backup
CREATE TABLE backup AS SELECT * FROM original;

-- Migrate
UPDATE original SET ...;

-- Verify
SELECT
  (SELECT COUNT(*) FROM backup) as before_count,
  (SELECT COUNT(*) FROM original) as after_count;
```

## Related Files
- `WORKSPACE-SCHEMA.sql`: Full schema
- `FIX-*.sql`: Pending migrations
- `.codex/rules/database/rls-policies.md`
