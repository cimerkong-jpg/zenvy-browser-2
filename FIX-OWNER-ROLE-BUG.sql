-- Fix: Invited members incorrectly created with role='owner'
-- This SQL corrects workspace_members rows where:
-- - role = 'owner'
-- - user_group_id IS NOT NULL (invited members should never be owner)
--
-- Run this AFTER deploying the backend fix to prevent new incorrect rows

-- Step 1: Review affected rows (DO NOT RUN UPDATE YET)
SELECT
  id,
  workspace_id,
  user_id,
  email,
  role,
  user_group_id,
  status,
  joined_at
FROM workspace_members
WHERE role = 'owner'
  AND user_group_id IS NOT NULL
  AND status = 'active';

-- Step 2: If the above query shows incorrect rows, run this UPDATE
-- This changes their role from 'owner' to 'member'
UPDATE workspace_members
SET
  role = 'member',
  updated_at = NOW()
WHERE role = 'owner'
  AND user_group_id IS NOT NULL
  AND status = 'active';

-- Step 3: Verify the fix
SELECT
  id,
  workspace_id,
  user_id,
  email,
  role,
  user_group_id,
  status
FROM workspace_members
WHERE user_group_id IS NOT NULL
  AND status = 'active'
ORDER BY workspace_id, joined_at;

-- Expected result: No rows with role='owner' AND user_group_id IS NOT NULL
