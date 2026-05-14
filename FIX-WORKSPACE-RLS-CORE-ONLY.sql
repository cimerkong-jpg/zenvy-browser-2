-- ============================================================================
-- FIX: workspace RLS core tables only
-- ============================================================================
-- Goal:
--   Fix infinite recursion on public.workspace_members RLS without touching
--   optional tables that may not exist or may not have workspace_id columns.
--
-- Core tables handled:
--   - workspace_members
--   - workspaces
--   - profiles
--   - groups
--   - workspace_user_groups
--   - workspace_role_permissions
--   - workspace_invitations
--
-- Do not add policy expressions on workspace_members that directly query
-- workspace_members. Use SECURITY DEFINER helpers.
-- ============================================================================

begin;

alter table public.workspace_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.workspace_user_groups enable row level security;
alter table public.workspace_role_permissions enable row level security;
alter table public.workspace_invitations enable row level security;

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
-- workspace_members: remove recursive SELECT policies and recreate safely.
-- ---------------------------------------------------------------------------

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
-- Required workspace data SELECT policies.
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

drop policy if exists "Read workspace user groups" on public.workspace_user_groups;

create policy "Read workspace user groups"
on public.workspace_user_groups
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace role permissions" on public.workspace_role_permissions;

create policy "Read workspace role permissions"
on public.workspace_role_permissions
for select
using (public.user_is_active_workspace_member(workspace_id));

drop policy if exists "Read workspace invitations" on public.workspace_invitations;
drop policy if exists "Users can view invitations in their workspaces" on public.workspace_invitations;

create policy "Read workspace invitations"
on public.workspace_invitations
for select
using (
  public.user_can_read_workspace_members(workspace_id)
  or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_members'
order by policyname;

select public.user_can_read_workspace_members('df1283f0-62ba-4a96-9133-d43f7f3631f9'::uuid);
