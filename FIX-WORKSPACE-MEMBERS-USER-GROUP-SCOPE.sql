-- ============================================================================
-- FIX: workspace_members RLS scoped by user group
-- ============================================================================
-- Rule:
--   - Workspace owner can read/manage all workspace member rows.
--   - Non-owner active members can only read/manage rows inside their own
--     user_group_id.
--   - App logic still decides which actions the role/group permissions allow.
--   - Policies use SECURITY DEFINER helpers to avoid recursive RLS.
-- ============================================================================

begin;

alter table public.workspace_members enable row level security;

create or replace function public.user_can_read_workspace_member_scope(
  p_workspace_id uuid,
  p_user_group_id uuid
)
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
      and (
        wm.role = 'owner'
        or (
          wm.user_group_id is not null
          and p_user_group_id is not null
          and wm.user_group_id = p_user_group_id
        )
      )
  );
$$;

create or replace function public.user_can_manage_workspace_member_scope(
  p_workspace_id uuid,
  p_user_group_id uuid
)
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
      and (
        wm.role = 'owner'
        or (
          wm.user_group_id is not null
          and p_user_group_id is not null
          and wm.user_group_id = p_user_group_id
        )
      )
  );
$$;

grant execute on function public.user_can_read_workspace_member_scope(uuid, uuid) to authenticated;
grant execute on function public.user_can_manage_workspace_member_scope(uuid, uuid) to authenticated;

drop policy if exists "workspace_members_select_via_helper" on public.workspace_members;
drop policy if exists "workspace_members_select_by_user_group" on public.workspace_members;

create policy "workspace_members_select_by_user_group"
on public.workspace_members
for select
using (
  public.user_can_read_workspace_member_scope(workspace_id, user_group_id)
  or user_id = auth.uid()
);

drop policy if exists "workspace_members_update_via_helper" on public.workspace_members;
drop policy if exists "workspace_members_update_by_user_group" on public.workspace_members;

create policy "workspace_members_update_by_user_group"
on public.workspace_members
for update
using (public.user_can_manage_workspace_member_scope(workspace_id, user_group_id))
with check (public.user_can_manage_workspace_member_scope(workspace_id, user_group_id));

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_members'
order by policyname;
