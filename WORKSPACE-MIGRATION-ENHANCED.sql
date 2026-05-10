-- ============================================
-- WORKSPACE ENHANCEMENT MIGRATION
-- Adds enhanced invitation fields and permission system
-- ============================================

-- Add enhanced fields to workspace_invitations table
ALTER TABLE workspace_invitations 
ADD COLUMN IF NOT EXISTS member_name TEXT,
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id),
ADD COLUMN IF NOT EXISTS delegated_group_id UUID REFERENCES groups(id),
ADD COLUMN IF NOT EXISTS profile_limit TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create role_permissions table to store custom permissions per role
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, role)
);

-- Enable RLS on role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_permissions
CREATE POLICY "Users can view permissions in their workspaces"
  ON role_permissions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage permissions"
  ON role_permissions FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Create index for role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_workspace_id ON role_permissions(workspace_id);

-- Function to initialize default permissions for a workspace
CREATE OR REPLACE FUNCTION initialize_workspace_permissions(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default permissions for admin role
  INSERT INTO role_permissions (workspace_id, role, permissions)
  VALUES (
    p_workspace_id,
    'admin',
    '{
      "profile": {
        "open": true, "create": true, "delete": true, "edit": true,
        "duplicate": true, "renew": true, "share": true, "export": true,
        "import": true, "transfer": true
      },
      "group": {
        "create": true, "edit": true, "delete": true
      },
      "automation": {
        "create": true, "edit": true, "delete": true, "share": true, "run": true
      }
    }'::jsonb
  )
  ON CONFLICT (workspace_id, role) DO NOTHING;

  -- Insert default permissions for member role
  INSERT INTO role_permissions (workspace_id, role, permissions)
  VALUES (
    p_workspace_id,
    'member',
    '{
      "profile": {
        "open": true, "create": true, "delete": false, "edit": true,
        "duplicate": true, "renew": false, "share": false, "export": true,
        "import": true, "transfer": false
      },
      "group": {
        "create": true, "edit": true, "delete": false
      },
      "automation": {
        "create": true, "edit": true, "delete": false, "share": false, "run": true
      }
    }'::jsonb
  )
  ON CONFLICT (workspace_id, role) DO NOTHING;

  -- Insert default permissions for viewer role
  INSERT INTO role_permissions (workspace_id, role, permissions)
  VALUES (
    p_workspace_id,
    'viewer',
    '{
      "profile": {
        "open": true, "create": false, "delete": false, "edit": false,
        "duplicate": false, "renew": false, "share": false, "export": false,
        "import": false, "transfer": false
      },
      "group": {
        "create": false, "edit": false, "delete": false
      },
      "automation": {
        "create": false, "edit": false, "delete": false, "share": false, "run": false
      }
    }'::jsonb
  )
  ON CONFLICT (workspace_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_default_workspace function to initialize permissions
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, owner_id)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;
  
  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  -- Initialize default permissions
  PERFORM initialize_workspace_permissions(new_workspace_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize permissions for existing workspaces
DO $$
DECLARE
  workspace_record RECORD;
BEGIN
  FOR workspace_record IN SELECT id FROM workspaces LOOP
    PERFORM initialize_workspace_permissions(workspace_record.id);
  END LOOP;
END $$;

-- Add comment to document the migration
COMMENT ON TABLE role_permissions IS 'Stores custom permission configurations for each role within a workspace';
COMMENT ON COLUMN workspace_invitations.member_name IS 'Display name for the invited member';
COMMENT ON COLUMN workspace_invitations.group_id IS 'Primary group assignment for the invited member';
COMMENT ON COLUMN workspace_invitations.delegated_group_id IS 'Delegated group for the invited member';
COMMENT ON COLUMN workspace_invitations.profile_limit IS 'Profile creation/access limits for the invited member';
COMMENT ON COLUMN workspace_invitations.notes IS 'Additional notes about the invitation';
