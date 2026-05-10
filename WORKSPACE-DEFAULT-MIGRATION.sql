-- ============================================================================
-- WORKSPACE DEFAULT MIGRATION
-- ============================================================================
-- Purpose: Implement "My Workspace" as default workspace for every user
-- Date: 2026-05-09
-- ============================================================================

-- ============================================================================
-- STEP 1: Add is_default column to workspaces table
-- ============================================================================

ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- ============================================================================
-- STEP 2: Create unique index - each owner can have only 1 default workspace
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_default_unique 
ON workspaces(owner_id) 
WHERE is_default = true;

-- ============================================================================
-- STEP 3: Backfill existing users with default workspace
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  existing_workspace_id uuid;
  new_workspace_id uuid;
BEGIN
  -- Loop through all users in auth.users
  FOR user_record IN SELECT id, email FROM auth.users LOOP
    
    -- Check if user already has a workspace named "My Workspace"
    SELECT id INTO existing_workspace_id
    FROM workspaces
    WHERE owner_id = user_record.id 
      AND name = 'My Workspace'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF existing_workspace_id IS NOT NULL THEN
      -- User has "My Workspace", mark it as default
      UPDATE workspaces 
      SET is_default = true 
      WHERE id = existing_workspace_id;
      
      RAISE NOTICE 'Set existing workspace % as default for user %', existing_workspace_id, user_record.email;
    ELSE
      -- User doesn't have "My Workspace", create one
      INSERT INTO workspaces (name, owner_id, is_default, settings)
      VALUES ('My Workspace', user_record.id, true, '{}'::jsonb)
      RETURNING id INTO new_workspace_id;
      
      RAISE NOTICE 'Created default workspace % for user %', new_workspace_id, user_record.email;
    END IF;
    
    -- Ensure owner membership exists for the default workspace
    -- Use the workspace_id we just set or created
    IF existing_workspace_id IS NOT NULL THEN
      INSERT INTO workspace_members (workspace_id, user_id, email, role, status)
      VALUES (existing_workspace_id, user_record.id, user_record.email, 'owner', 'active')
      ON CONFLICT (workspace_id, user_id) 
      DO UPDATE SET role = 'owner', status = 'active';
    ELSE
      INSERT INTO workspace_members (workspace_id, user_id, email, role, status)
      VALUES (new_workspace_id, user_record.id, user_record.email, 'owner', 'active')
      ON CONFLICT (workspace_id, user_id) 
      DO UPDATE SET role = 'owner', status = 'active';
    END IF;
    
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Update trigger for new user registration
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default workspace "My Workspace"
  INSERT INTO workspaces (name, owner_id, is_default, settings)
  VALUES ('My Workspace', NEW.id, true, '{}'::jsonb)
  RETURNING id INTO new_workspace_id;
  
  -- Create owner membership
  INSERT INTO workspace_members (workspace_id, user_id, email, role, status)
  VALUES (new_workspace_id, NEW.id, NEW.email, 'owner', 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- STEP 5: Create trigger to protect default workspace from deletion
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS protect_default_workspace ON workspaces;
DROP FUNCTION IF EXISTS prevent_default_workspace_deletion() CASCADE;

-- Create function to prevent default workspace deletion
CREATE OR REPLACE FUNCTION prevent_default_workspace_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of default workspace
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete default workspace. Default workspace cannot be removed.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect default workspace
CREATE TRIGGER protect_default_workspace
  BEFORE DELETE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_workspace_deletion();

-- ============================================================================
-- STEP 6: Create trigger to prevent is_default from being set to false
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS protect_default_workspace_flag ON workspaces;
DROP FUNCTION IF EXISTS prevent_default_flag_removal() CASCADE;

-- Create function to prevent removing default flag
CREATE OR REPLACE FUNCTION prevent_default_flag_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing is_default from true to false on "My Workspace"
  IF OLD.is_default = true AND NEW.is_default = false AND OLD.name = 'My Workspace' THEN
    RAISE EXCEPTION 'Cannot remove default flag from "My Workspace"';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect default flag
CREATE TRIGGER protect_default_workspace_flag
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_flag_removal();

-- ============================================================================
-- STEP 7: Update RLS policies if needed
-- ============================================================================

-- Ensure owners can read their workspaces (including default)
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
    )
  );

-- Ensure owners can create workspaces
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
CREATE POLICY "Users can create their own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Ensure owners can update their workspaces (but triggers will protect default)
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
CREATE POLICY "Users can update their own workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Ensure owners can delete their workspaces (but triggers will protect default)
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;
CREATE POLICY "Users can delete their own workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- OPTIONAL: Clean up test workspaces (commented out for safety)
-- ============================================================================

-- Uncomment the following to delete non-default test workspaces
-- WARNING: This will permanently delete workspaces and their data

/*
DELETE FROM workspaces 
WHERE is_default = false 
  AND name IN ('111', '232', 'dsdsd', 'test', 'Test Workspace')
  AND created_at < NOW() - INTERVAL '1 day';
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all users have a default workspace
SELECT 
  u.email,
  w.id as workspace_id,
  w.name,
  w.is_default
FROM auth.users u
LEFT JOIN workspaces w ON w.owner_id = u.id AND w.is_default = true
ORDER BY u.email;

-- Check workspace counts per user
SELECT 
  u.email,
  COUNT(w.id) as total_workspaces,
  COUNT(CASE WHEN w.is_default THEN 1 END) as default_workspaces
FROM auth.users u
LEFT JOIN workspaces w ON w.owner_id = u.id
GROUP BY u.email
ORDER BY u.email;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
