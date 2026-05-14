-- ============================================================================
-- FIX: workspace_members RLS infinite recursion
-- ============================================================================
-- Issue:
--   workspace_members SELECT policies that query workspace_members directly can
--   recursively evaluate RLS on the same table and fail with:
--     infinite recursion detected in policy for relation "workspace_members"
--     Code: 42P17
--
-- Fix:
--   Move membership checks into SECURITY DEFINER helper functions, then make the
--   workspace_members SELECT policy call those helpers instead of querying
--   workspace_members inside the policy expression.
-- ============================================================================

begin;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_user_groups enable row level security;
alter table public.workspace_group_members enable row level security;
alter table public.workspace_role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.scripts enable row level security;

-- Helper: current user is an active member of a workspace.
create or replace function public.user_is_active_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

-- Helper: current user can read the member list for a workspace.
create or replace function public.user_can_read_workspace_members(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
  );
$$;

grant execute on function public.user_is_active_workspace_member(uuid) to authenticated;
grant execute on function public.user_can_read_workspace_members(uuid) to authenticated;

comment on function public.user_is_active_workspace_member(uuid) is
'SECURITY DEFINER RLS helper: returns true when auth.uid() is an active member of the workspace.';

comment on function public.user_can_read_workspace_members(uuid) is
'SECURITY DEFINER RLS helper: returns true when auth.uid() is an active owner/admin member of the workspace.';

-- ---------------------------------------------------------------------------
-- workspace_members SELECT policy
-- ---------------------------------------------------------------------------
-- Drop known recursive/legacy policy names before creating the helper-backed
-- policy. Do not create a workspace_members policy that directly selects from
-- workspace_members.
drop policy if exists "Read workspace members" on public.workspace_members;
drop policy if exists "Users can view members in their workspaces" on public.workspace_members;
drop policy if exists "workspace_members_select" on public.workspace_members;
drop policy if exists "workspace_members_select_via_helper" on public.workspace_members;
drop policy if exists "wm_select" on public.workspace_members;

create policy "workspace_members_select_via_helper"
on public.workspace_members
for select
using (
  public.user_can_read_workspace_members(workspace_id)
  or user_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- Other SELECT policies that need membership checks.
-- These call the SECURITY DEFINER helper instead of embedding direct
-- workspace_members EXISTS queries in policy expressions.
-- ---------------------------------------------------------------------------

drop policy if exists "Read active member workspaces" on public.workspaces;
drop policy if exists "Users can view workspaces they are members of" on public.workspaces;
drop policy if exists "Users can view their own workspaces" on public.workspaces;
drop policy if exists "ws_select" on public.workspaces;

create policy "Read active member workspaces"
on public.workspaces
for select
using (public.user_is_active_workspace_member(id));

drop policy if exists "Read workspace profiles" on public.profiles;
drop policy if exists "Users can view their own profiles" on public.profiles;

create policy "Read workspace profiles"
on public.profiles
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace groups" on public.groups;
drop policy if exists "Users can view their own groups" on public.groups;

create policy "Read workspace groups"
on public.groups
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace scripts" on public.scripts;
drop policy if exists "Users can view their own scripts" on public.scripts;

create policy "Read workspace scripts"
on public.scripts
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace user groups" on public.workspace_user_groups;

create policy "Read workspace user groups"
on public.workspace_user_groups
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace group members" on public.workspace_group_members;

create policy "Read workspace group members"
on public.workspace_group_members
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace role permissions" on public.workspace_role_permissions;

create policy "Read workspace role permissions"
on public.workspace_role_permissions
for select
using (public.user_is_active_workspace_member(workspace_id));

commit;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Should return true for an owner/admin active member of this workspace.
select public.user_can_read_workspace_members('df1283f0-62ba-4a96-9133-d43f7f3631f9'::uuid);

-- Confirm workspace_members SELECT policy no longer embeds a direct
-- workspace_members subquery in the policy expression.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_members'
order by policyname;

-- Check active membership helper result for the same workspace.
select public.user_is_active_workspace_member('df1283f0-62ba-4a96-9133-d43f7f3631f9'::uuid);

-- Expected app-level checks after running this migration:
-- 1. Login works.
-- 2. ensureDefaultWorkspace no longer errors with 42P17.
-- 3. Owner/admin getWorkspaceMembers returns owner + invited member rows.
-- 4. profiles:getAll no longer fails because of "No active workspace".
-- 5. Member users can read at least their own workspace_members row.
