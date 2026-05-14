-- ============================================================================
-- FIX: accept_pending_invitations RPC - Fix ambiguous column references
-- ============================================================================
-- Issue: Column references were ambiguous (workspace_id, user_id, etc.)
-- Fix: Fully qualify all column references with table aliases
-- Date: 2026-05-14
-- ============================================================================

-- Step 1: Drop existing function
DROP FUNCTION IF EXISTS accept_pending_invitations();

-- Step 2: Create corrected function with fully qualified columns
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TABLE (result_workspace_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_email text;
  v_invitation_record record;
  v_affected_workspace_id uuid;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email from auth.users
  SELECT au.email INTO v_current_user_email
  FROM auth.users au
  WHERE au.id = v_current_user_id;

  IF v_current_user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  -- Process all pending invitations for this email
  FOR v_invitation_record IN
    SELECT
      wi.id AS inv_id,
      wi.workspace_id AS inv_workspace_id,
      wi.email AS inv_email,
      wi.role AS inv_role,
      wi.user_group_id AS inv_user_group_id,
      wi.profile_limit AS inv_profile_limit,
      wi.note AS inv_note,
      wi.invited_by AS inv_invited_by,
      wi.expires_at AS inv_expires_at
    FROM workspace_invitations wi
    WHERE LOWER(wi.email) = LOWER(v_current_user_email)
      AND wi.status = 'pending'
      AND wi.expires_at > NOW()
    ORDER BY wi.created_at ASC
  LOOP
    -- ✅ Validate: Reject owner role invitations
    IF v_invitation_record.inv_role = 'owner' THEN
      -- Skip this invitation - invited users should never be owner
      CONTINUE;
    END IF;

    -- ✅ Validate: Ensure role is valid
    IF v_invitation_record.inv_role NOT IN ('admin', 'member', 'viewer') THEN
      -- Default to member if invalid role
      v_invitation_record.inv_role := 'member';
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
      v_invitation_record.inv_workspace_id,
      v_current_user_id,
      v_current_user_email,
      v_invitation_record.inv_role,  -- ✅ Use role from invitation, NOT 'owner'
      'active',
      v_invitation_record.inv_user_group_id,
      v_invitation_record.inv_profile_limit,
      v_invitation_record.inv_note,
      v_invitation_record.inv_invited_by,
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
    UPDATE workspace_invitations wi
    SET
      status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE wi.id = v_invitation_record.inv_id;

    -- Track workspace for return value
    v_affected_workspace_id := v_invitation_record.inv_workspace_id;
  END LOOP;

  -- Return the workspace_id of accepted invitations
  IF v_affected_workspace_id IS NOT NULL THEN
    RETURN QUERY SELECT v_affected_workspace_id;
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
Idempotent - can be called multiple times safely.
Fixed: All column references fully qualified to avoid ambiguity.';

-- ============================================================================
-- Step 5: Cleanup existing broken data
-- ============================================================================
-- Fix workspace_members that were incorrectly created with role='owner'
-- These are invited members (have user_group_id) that should be 'member'

UPDATE workspace_members wm
SET
  role = 'member',
  updated_at = NOW()
WHERE wm.role = 'owner'
  AND wm.user_group_id IS NOT NULL
  AND wm.status = 'active';

-- ============================================================================
-- Step 6: Verification queries
-- ============================================================================

-- Verify no invited members have role='owner'
SELECT
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.email,
  wm.role,
  wm.user_group_id,
  wm.status
FROM workspace_members wm
WHERE wm.role = 'owner'
  AND wm.user_group_id IS NOT NULL
  AND wm.status = 'active';
-- Expected: 0 rows

-- Verify function exists with correct security
SELECT
  r.routine_name,
  r.routine_type,
  r.security_type
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'accept_pending_invitations';
-- Expected: 1 row with SECURITY DEFINER

-- Test function can be called (should not error)
-- SELECT * FROM accept_pending_invitations();
-- Expected: Returns workspace_id if invitations accepted, or empty if none

-- ============================================================================
-- Migration complete
-- ============================================================================
-- All column references are now fully qualified with aliases:
-- - v_* prefix for PL/pgSQL variables
-- - wi.* for workspace_invitations columns
-- - wm.* for workspace_members columns
-- - au.* for auth.users columns
-- - EXCLUDED.* for ON CONFLICT values
-- This eliminates all ambiguous column reference errors.
-- ============================================================================
