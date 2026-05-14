-- ============================================================================
-- FIX: workspace_invitations RLS scoped by user group
-- ============================================================================
-- Purpose:
--   Allow invitation read/resend/delete only inside the current user's user
--   group unless the current user is the workspace owner. App logic still
--   checks member.invite/member.remove permissions.
--
-- Notes:
--   - Uses SECURITY DEFINER helpers to avoid recursive RLS.
--   - Does not expose invitation tokens in verification output.
-- ============================================================================

begin;

alter table public.workspace_invitations enable row level security;

create or replace function public.user_can_read_workspace_invitation_scope(
  p_workspace_id uuid,
  p_user_group_id uuid,
  p_email text
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
  )
  or lower(coalesce(p_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.user_can_manage_workspace_invitation_scope(
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

grant execute on function public.user_can_read_workspace_invitation_scope(uuid, uuid, text) to authenticated;
grant execute on function public.user_can_manage_workspace_invitation_scope(uuid, uuid) to authenticated;

drop policy if exists "Read workspace invitations" on public.workspace_invitations;
drop policy if exists "Users can view invitations in their workspaces" on public.workspace_invitations;
drop policy if exists "workspace_invitations_select_by_user_group" on public.workspace_invitations;

create policy "workspace_invitations_select_by_user_group"
on public.workspace_invitations
for select
using (public.user_can_read_workspace_invitation_scope(workspace_id, user_group_id, email));

drop policy if exists "workspace_invitations_update_by_user_group" on public.workspace_invitations;

create policy "workspace_invitations_update_by_user_group"
on public.workspace_invitations
for update
using (public.user_can_manage_workspace_invitation_scope(workspace_id, user_group_id))
with check (public.user_can_manage_workspace_invitation_scope(workspace_id, user_group_id));

drop policy if exists "workspace_invitations_delete_by_user_group" on public.workspace_invitations;

create policy "workspace_invitations_delete_by_user_group"
on public.workspace_invitations
for delete
using (public.user_can_manage_workspace_invitation_scope(workspace_id, user_group_id));

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_invitations'
order by policyname;
