-- ============================================================================
-- FIX: profile/profile-group delete RLS with confirmed returning rows
-- ============================================================================
-- Purpose:
--   Allow backend deletes to use delete().eq(id).eq(workspace_id).select().single()
--   while preserving workspace, owner, user-group, and permissionMode scope.
-- ============================================================================

begin;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;

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
      and (
        wm.role = 'owner'
        or (
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
          coalesce(w.settings ->> 'permissionMode', 'profile') = 'profile'
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
      and (
        wm.role = 'owner'
        or (
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
          coalesce(w.settings ->> 'permissionMode', 'profile') = 'profile'
          and exists (
            select 1
            from public.workspace_member_profiles wmp
            join public.profiles p
              on p.id::text = wmp.profile_id
             and p.workspace_id = p_workspace_id
            where wmp.member_id = wm.id
              and wmp.workspace_id = p_workspace_id
              and p.group_id::text = p_group_id
          )
        )
      )
  );
$$;

grant execute on function public.user_can_delete_profile_row(uuid, text, text) to authenticated;
grant execute on function public.user_can_delete_profile_group_row(uuid, text) to authenticated;

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
