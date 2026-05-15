-- ============================================================================
-- FIX: profile/profile-group delete RLS with confirmed returning rows
-- ============================================================================
-- Purpose:
--   Allow backend deletes to use delete().eq(id).eq(workspace_id).select().single()
--   while preserving workspace, owner, user-group, permissionMode scope, and
--   role/action permission checks.
-- ============================================================================

begin;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;

-- Mirrors the app permission model for direct Supabase RLS checks:
-- User Group permission_overrides overrides role permissions; otherwise
-- workspace_role_permissions overrides default role permissions. Owner is
-- always allowed.
create or replace function public.workspace_role_has_action_permission(
  p_workspace_id uuid,
  p_role text,
  p_permission_key text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        case
          when wrp.permissions ? p_permission_key then (wrp.permissions ->> p_permission_key)::boolean
          else null
        end
      from public.workspace_role_permissions wrp
      where wrp.workspace_id = p_workspace_id
        and wrp.role::text = p_role
      limit 1
    ),
    case
      when p_role = 'owner' then true
      when p_role = 'admin' and p_permission_key in ('profile.delete', 'group.delete') then true
      when p_role in ('member', 'viewer') and p_permission_key in ('profile.delete', 'group.delete') then false
      else false
    end
  );
$$;

create or replace function public.workspace_user_group_action_permission_override(
  p_user_group_id uuid,
  p_permission_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permission_overrides jsonb;
begin
  select wug.permission_overrides
    into v_permission_overrides
  from public.workspace_user_groups wug
  where wug.id = p_user_group_id;

  if v_permission_overrides is null then return null; end if;
  return coalesce((v_permission_overrides ->> p_permission_key)::boolean, false);
exception
  when others then
    return null;
end;
$$;

create or replace function public.workspace_member_has_action_permission(
  p_workspace_id uuid,
  p_user_group_id uuid,
  p_role text,
  p_permission_key text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case
    when p_role = 'owner' then true
    else coalesce(
      public.workspace_user_group_action_permission_override(p_user_group_id, p_permission_key),
      public.workspace_role_has_action_permission(p_workspace_id, p_role, p_permission_key)
    )
  end;
$$;

create or replace function public.user_can_delete_profile_row(
  p_workspace_id uuid,
  p_profile_id text,
  p_group_id text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w
      on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and public.workspace_member_has_action_permission(
        p_workspace_id,
        wm.user_group_id,
        wm.role::text,
        'profile.delete'
      )
      and (
        wm.role = 'owner'
        or (
          wm.user_group_id is not null
          and
          coalesce(w.settings ->> 'permissionMode', 'profile') = 'group'
          and p_group_id is not null
          and exists (
            select 1
            from public.workspace_member_profile_groups wmpg
            where wmpg.member_id = wm.id
              and wmpg.workspace_id = p_workspace_id
              and wmpg.group_id = p_group_id
          )
        )
        or (
          wm.user_group_id is not null
          and coalesce(w.settings ->> 'permissionMode', 'profile') = 'profile'
          and exists (
            select 1
            from public.workspace_member_profiles wmp
            where wmp.member_id = wm.id
              and wmp.workspace_id = p_workspace_id
              and wmp.profile_id = p_profile_id
          )
        )
      )
  );
$$;

create or replace function public.user_can_delete_profile_group_row(
  p_workspace_id uuid,
  p_group_id text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w
      on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and public.workspace_member_has_action_permission(
        p_workspace_id,
        wm.user_group_id,
        wm.role::text,
        'group.delete'
      )
      and (
        wm.role = 'owner'
        or (
          wm.user_group_id is not null
          and
          coalesce(w.settings ->> 'permissionMode', 'profile') = 'group'
          and exists (
            select 1
            from public.workspace_member_profile_groups wmpg
            where wmpg.member_id = wm.id
              and wmpg.workspace_id = p_workspace_id
              and wmpg.group_id = p_group_id
          )
        )
        or (
          wm.user_group_id is not null
          and coalesce(w.settings ->> 'permissionMode', 'profile') = 'profile'
          and exists (
            select 1
            from public.profiles p
            where p.workspace_id = p_workspace_id
              and p.group_id::text = p_group_id
          )
          and not exists (
            select 1
            from public.profiles p
            where p.workspace_id = p_workspace_id
              and p.group_id::text = p_group_id
              and not exists (
                select 1
                from public.workspace_member_profiles wmp
                where wmp.member_id = wm.id
                  and wmp.workspace_id = p_workspace_id
                  and wmp.profile_id = p.id::text
              )
          )
        )
      )
  );
$$;

grant execute on function public.workspace_role_has_action_permission(uuid, text, text) to authenticated;
grant execute on function public.workspace_user_group_action_permission_override(uuid, text) to authenticated;
grant execute on function public.workspace_member_has_action_permission(uuid, uuid, text, text) to authenticated;
grant execute on function public.user_can_delete_profile_row(uuid, text, text) to authenticated;
grant execute on function public.user_can_delete_profile_group_row(uuid, text) to authenticated;

comment on function public.workspace_role_has_action_permission(uuid, text, text) is
'SECURITY DEFINER RLS helper: returns true when a workspace role has the requested action permission, using workspace_role_permissions override with app default fallback.';

comment on function public.workspace_user_group_action_permission_override(uuid, text) is
'SECURITY DEFINER RLS helper: returns workspace_user_groups.permission_overrides for the requested action permission.';

comment on function public.workspace_member_has_action_permission(uuid, uuid, text, text) is
'SECURITY DEFINER RLS helper: mirrors app permission resolution by preferring valid User Group metadata overrides before role permissions; owner is always allowed.';

comment on function public.user_can_delete_profile_row(uuid, text, text) is
'SECURITY DEFINER RLS helper: profile DELETE requires active membership, role action permission, and profile authorization scope.';

comment on function public.user_can_delete_profile_group_row(uuid, text) is
'SECURITY DEFINER RLS helper: profile group DELETE requires active membership, role action permission, and group/profile authorization scope.';

drop policy if exists "profiles_delete_by_authorization" on public.profiles;
drop policy if exists "groups_delete_by_authorization" on public.groups;

create policy "profiles_delete_by_authorization"
on public.profiles
for delete
using (public.user_can_delete_profile_row(workspace_id, id::text, group_id::text));

create policy "groups_delete_by_authorization"
on public.groups
for delete
using (public.user_can_delete_profile_group_row(workspace_id, id::text));

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'groups')
  and cmd = 'DELETE'
order by tablename, policyname;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'workspace_role_has_action_permission',
    'workspace_user_group_action_permission_override',
    'workspace_member_has_action_permission',
    'user_can_delete_profile_row',
    'user_can_delete_profile_group_row'
  )
order by routine_name;
