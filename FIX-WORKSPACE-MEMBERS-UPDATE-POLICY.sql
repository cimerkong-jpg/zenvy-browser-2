-- ============================================================================
-- FIX: workspace_members UPDATE policy for edit/remove members
-- ============================================================================
-- Purpose:
--   Allow active owner/admin users to update workspace_members rows in their
--   workspace without recursive RLS policy checks.
--
-- App logic still blocks changing/removing owner rows.
-- ============================================================================

begin;

alter table public.workspace_members enable row level security;

create or replace function public.user_can_manage_workspace_members(p_workspace_id uuid)
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

grant execute on function public.user_can_manage_workspace_members(uuid) to authenticated;

comment on function public.user_can_manage_workspace_members(uuid) is
'SECURITY DEFINER RLS helper: true when auth.uid() is an active owner/admin in the workspace.';

drop policy if exists "Edit workspace members" on public.workspace_members;
drop policy if exists "Owners and admins can update members" on public.workspace_members;
drop policy if exists "Owners and admins can remove members" on public.workspace_members;
drop policy if exists "workspace_members_update_via_helper" on public.workspace_members;
drop policy if exists "wm_update" on public.workspace_members;

create policy "workspace_members_update_via_helper"
on public.workspace_members
for update
using (public.user_can_manage_workspace_members(workspace_id))
with check (public.user_can_manage_workspace_members(workspace_id));

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_members'
order by policyname;

select public.user_can_manage_workspace_members('df1283f0-62ba-4a96-9133-d43f7f3631f9'::uuid);

select email, role, status, user_group_id, profile_limit, note
from workspace_members
where email = 'kongka0809@gmail.com'
order by updated_at desc;
