-- Canonical Workspace RLS Migration
-- Run this after WORKSPACE-SCHEMA.sql when workspace/member/user-group RLS
-- needs to be reset to the supported policy set.

begin;

-- Helper functions used by policies. They are SECURITY DEFINER so policies do
-- not recursively evaluate workspace_members/workspace_role_permissions RLS.
create or replace function user_is_active_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
      and status = 'active'
  );
$$;

create or replace function user_has_workspace_permission(
  p_workspace_id uuid,
  p_user_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      case
        when wm.role = 'owner' then true
        else coalesce((wrp.permissions ->> p_permission)::boolean, false)
      end
    from workspace_members wm
    left join workspace_role_permissions wrp
      on wrp.workspace_id = wm.workspace_id
      and wrp.role = wm.role
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
      and wm.status = 'active'
    limit 1
  ), false);
$$;

grant execute on function user_is_active_workspace_member(uuid, uuid) to authenticated;
grant execute on function user_has_workspace_permission(uuid, uuid, text) to authenticated;

-- get_my_workspaces has changed return shape over time. Drop first so the
-- canonical function can be reapplied without PostgreSQL return-type errors.
drop function if exists get_my_workspaces();

create or replace function get_my_workspaces()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  role workspace_role,
  member_status workspace_member_status,
  member_count bigint,
  profile_count bigint,
  settings jsonb,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    w.id,
    w.name,
    w.owner_id,
    wm.role,
    wm.status,
    (select count(*)::bigint from workspace_members m where m.workspace_id = w.id and m.status = 'active'),
    (select count(*)::bigint from profiles p where p.workspace_id = w.id and p.deleted_at is null),
    w.settings,
    coalesce(w.is_default, false),
    w.created_at,
    w.updated_at
  from workspaces w
  join workspace_members wm on wm.workspace_id = w.id
  where wm.user_id = auth.uid()
    and wm.status = 'active'
  order by coalesce(w.is_default, false) desc, w.created_at asc;
end;
$$;

grant execute on function get_my_workspaces() to authenticated;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;
alter table workspace_user_groups enable row level security;
alter table workspace_role_permissions enable row level security;

drop policy if exists "Read active member workspaces" on workspaces;
drop policy if exists "Users can view workspaces they are members of" on workspaces;
drop policy if exists "Users can view their own workspaces" on workspaces;
drop policy if exists "ws_select" on workspaces;
create policy "Read active member workspaces"
on workspaces
for select
using (user_is_active_workspace_member(id, auth.uid()));

drop policy if exists "Create own workspaces" on workspaces;
drop policy if exists "Users can create their own workspaces" on workspaces;
drop policy if exists "ws_insert" on workspaces;
create policy "Create own workspaces"
on workspaces
for insert
with check (owner_id = auth.uid());

drop policy if exists "Manage workspace settings" on workspaces;
drop policy if exists "Owners can update their workspaces" on workspaces;
drop policy if exists "Users can update their own workspaces" on workspaces;
drop policy if exists "ws_update" on workspaces;
create policy "Manage workspace settings"
on workspaces
for update
using (user_has_workspace_permission(id, auth.uid(), 'workspace.settings'))
with check (user_has_workspace_permission(id, auth.uid(), 'workspace.settings'));

drop policy if exists "Delete workspace" on workspaces;
drop policy if exists "Owners can delete their workspaces" on workspaces;
drop policy if exists "Users can delete their own workspaces" on workspaces;
drop policy if exists "ws_delete" on workspaces;
create policy "Delete workspace"
on workspaces
for delete
using (user_has_workspace_permission(id, auth.uid(), 'workspace.delete'));

drop policy if exists "Read workspace members" on workspace_members;
drop policy if exists "Users can view members in their workspaces" on workspace_members;
drop policy if exists "wm_select" on workspace_members;
create policy "Read workspace members"
on workspace_members
for select
using (user_is_active_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Invite creates members only via permission" on workspace_members;
drop policy if exists "Owners and admins can add members" on workspace_members;
drop policy if exists "wm_insert" on workspace_members;
create policy "Invite creates members only via permission"
on workspace_members
for insert
with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));

drop policy if exists "Edit workspace members" on workspace_members;
drop policy if exists "Owners and admins can update members" on workspace_members;
drop policy if exists "Owners and admins can remove members" on workspace_members;
drop policy if exists "wm_update" on workspace_members;
create policy "Edit workspace members"
on workspace_members
for update
using (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.remove')
  or user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')
)
with check (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.remove')
  or user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')
);

drop policy if exists "wm_delete" on workspace_members;
create policy "Delete workspace members"
on workspace_members
for delete
using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.remove'));

drop policy if exists "Read workspace invitations" on workspace_invitations;
drop policy if exists "Users can view invitations in their workspaces" on workspace_invitations;
create policy "Read workspace invitations"
on workspace_invitations
for select
using (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite')
  or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

drop policy if exists "Create workspace invitations" on workspace_invitations;
drop policy if exists "Owners and admins can create invitations" on workspace_invitations;
create policy "Create workspace invitations"
on workspace_invitations
for insert
with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));

drop policy if exists "Update workspace invitations" on workspace_invitations;
create policy "Update workspace invitations"
on workspace_invitations
for update
using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'))
with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));

drop policy if exists "Read workspace user groups" on workspace_user_groups;
create policy "Read workspace user groups"
on workspace_user_groups
for select
using (user_is_active_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Manage workspace user groups" on workspace_user_groups;
drop policy if exists "Create workspace user groups" on workspace_user_groups;
create policy "Create workspace user groups"
on workspace_user_groups
for insert
with check (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')
  and created_by = auth.uid()
);

drop policy if exists "Update workspace user groups" on workspace_user_groups;
create policy "Update workspace user groups"
on workspace_user_groups
for update
using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role'))
with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role'));

drop policy if exists "Delete workspace user groups" on workspace_user_groups;
create policy "Delete workspace user groups"
on workspace_user_groups
for delete
using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role'));

drop policy if exists "Read workspace role permissions" on workspace_role_permissions;
create policy "Read workspace role permissions"
on workspace_role_permissions
for select
using (user_is_active_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Manage workspace role permissions" on workspace_role_permissions;
create policy "Manage workspace role permissions"
on workspace_role_permissions
for all
using (user_has_workspace_permission(workspace_id, auth.uid(), 'workspace.settings'))
with check (user_has_workspace_permission(workspace_id, auth.uid(), 'workspace.settings'));

commit;
