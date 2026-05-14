-- ============================================================================
-- FIX: accept_pending_invitations RPC - Preserve invitation role
-- ============================================================================
-- Issue: RPC was creating all invited members with role='owner'
-- Fix: Preserve the role from workspace_invitations table
-- Date: 2026-05-14
-- ============================================================================

-- Step 1: Drop existing function
DROP FUNCTION IF EXISTS accept_pending_invitations();

-- Step 2: Create corrected function
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TABLE (workspace_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  invitation_record record;
  affected_workspace_id uuid;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email from auth.users
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  -- Process all pending invitations for this email
  FOR invitation_record IN
    SELECT
      wi.id,
      wi.workspace_id,
      wi.email,
      wi.role,
      wi.user_group_id,
      wi.profile_limit,
      wi.note,
      wi.invited_by,
      wi.expires_at
    FROM workspace_invitations wi
    WHERE LOWER(wi.email) = LOWER(current_user_email)
      AND wi.status = 'pending'
      AND wi.expires_at > NOW()
    ORDER BY wi.created_at ASC
  LOOP
    -- ✅ Validate: Reject owner role invitations
    IF invitation_record.role = 'owner' THEN
      -- Skip this invitation - invited users should never be owner
      CONTINUE;
    END IF;

    -- ✅ Validate: Ensure role is valid
    IF invitation_record.role NOT IN ('admin', 'member', 'viewer') THEN
      -- Default to member if invalid role
      invitation_record.role := 'member';
    END IF;

    -- Insert or update workspace member
    INSERT INTO workspace_members (
      workspace_id,
      user_id,
      email,
      role,
      status,
      user_group_id,
      profile_limit,
      note,
      invited_by,
      joined_at,
      updated_at
    ) VALUES (
      invitation_record.workspace_id,
      current_user_id,
      current_user_email,
      invitation_record.role,  -- ✅ Use role from invitation, NOT 'owner'
      'active',
      invitation_record.user_group_id,
      invitation_record.profile_limit,
      invitation_record.note,
      invitation_record.invited_by,
      NOW(),
      NOW()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET
      -- ✅ Reactivate if previously removed
      status = CASE
        WHEN workspace_members.status = 'removed' THEN 'active'
        ELSE workspace_members.status
      END,
      -- ✅ Update role from invitation (unless already owner)
      role = CASE
        WHEN workspace_members.role = 'owner' THEN workspace_members.role
        ELSE EXCLUDED.role
      END,
      -- Update other fields
      user_group_id = EXCLUDED.user_group_id,
      profile_limit = EXCLUDED.profile_limit,
      note = EXCLUDED.note,
      updated_at = NOW();

    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET
      status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = invitation_record.id;

    -- Track workspace for return value
    affected_workspace_id := invitation_record.workspace_id;
  END LOOP;

  -- Return the workspace_id of accepted invitations
  IF affected_workspace_id IS NOT NULL THEN
    RETURN QUERY SELECT affected_workspace_id;
  END IF;

  RETURN;
END;
$$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION accept_pending_invitations() TO authenticated;

-- Step 4: Add comment
COMMENT ON FUNCTION accept_pending_invitations() IS
'Accepts pending workspace invitations for the current user.
Preserves the role from invitation (admin/member/viewer).
Rejects invitations with role=owner.
Idempotent - can be called multiple times safely.';

-- ============================================================================
-- Step 5: Cleanup existing broken data
-- ============================================================================
-- Fix workspace_members that were incorrectly created with role='owner'
-- These are invited members (have user_group_id) that should be 'member'

UPDATE workspace_members
SET
  role = 'member',
  updated_at = NOW()
WHERE role = 'owner'
  AND user_group_id IS NOT NULL
  AND status = 'active';

-- ============================================================================
-- Step 6: Verification queries
-- ============================================================================

-- Verify no invited members have role='owner'
SELECT
  id,
  workspace_id,
  user_id,
  email,
  role,
  user_group_id,
  status
FROM workspace_members
WHERE role = 'owner'
  AND user_group_id IS NOT NULL
  AND status = 'active';
-- Expected: 0 rows

-- Verify function exists
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'accept_pending_invitations';
-- Expected: 1 row with SECURITY DEFINER

-- ============================================================================
-- Migration complete
-- ============================================================================
