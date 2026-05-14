-- ============================================================================
-- FIX: workspace member authorization functions - ambiguous references
-- ============================================================================
-- Purpose:
--   Recreate functions from WORKSPACE-MEMBER-AUTHORIZATIONS.sql using prefixed
--   parameters/local variables and table aliases to avoid PostgreSQL 42702
--   "column reference is ambiguous" errors.
-- ============================================================================

begin;

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

create or replace function public.user_is_authorization_owner(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.id = p_member_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

grant execute on function public.user_can_manage_workspace_members(uuid) to authenticated;
grant execute on function public.user_is_authorization_owner(uuid) to authenticated;

-- Optional helpers used by app/RLS diagnostics. They are safe to create even if
-- the app does not call them directly.
create or replace function public.user_can_access_profile(p_profile_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and exists (
        select 1
        from public.profiles p
        where p.id::text = p_profile_id
          and p.workspace_id = wm.workspace_id
      )
  )
  or exists (
    select 1
    from public.workspace_members wm
    join public.workspace_member_profiles wmp
      on wmp.member_id = wm.id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wmp.profile_id = p_profile_id
  )
  or exists (
    select 1
    from public.workspace_members wm
    join public.workspace_member_profile_groups wmpg
      on wmpg.member_id = wm.id
    join public.profiles p
      on p.workspace_id = wm.workspace_id
      and p.group_id::text = wmpg.group_id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and p.id::text = p_profile_id
  );
$$;

create or replace function public.user_can_access_profile_group(p_group_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
      and exists (
        select 1
        from public.groups g
        where g.id::text = p_group_id
          and g.workspace_id = wm.workspace_id
      )
  )
  or exists (
    select 1
    from public.workspace_members wm
    join public.workspace_member_profile_groups wmpg
      on wmpg.member_id = wm.id
    where wm.user_id = auth.uid()
      and wm.status = 'active'
      and wmpg.group_id = p_group_id
  );
$$;

grant execute on function public.user_can_access_profile(text) to authenticated;
grant execute on function public.user_can_access_profile_group(text) to authenticated;

-- Recreate accept_pending_invitations with non-conflicting output names and
-- fully-qualified table aliases.
drop function if exists public.accept_pending_invitations();

create or replace function public.accept_pending_invitations()
returns table (accepted_workspace_id uuid, accepted_invitation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_current_user_email text;
  v_invitation_record record;
  v_member_id uuid;
  v_group_id text;
  v_profile_id text;
begin
  select lower(au.email)
    into v_current_user_email
  from auth.users au
  where au.id = v_current_user_id;

  for v_invitation_record in
    select wi.*
    from public.workspace_invitations wi
    where lower(wi.email) = v_current_user_email
      and wi.status = 'pending'
      and wi.expires_at > now()
  loop
    insert into public.workspace_members (
      workspace_id,
      user_id,
      email,
      role,
      status,
      user_group_id,
      profile_limit,
      note,
      invited_by
    )
    values (
      v_invitation_record.workspace_id,
      v_current_user_id,
      v_current_user_email,
      v_invitation_record.role,
      'active',
      v_invitation_record.user_group_id,
      v_invitation_record.profile_limit,
      v_invitation_record.note,
      v_invitation_record.invited_by
    )
    on conflict (workspace_id, user_id) do update
      set status = 'active',
          role = excluded.role,
          user_group_id = excluded.user_group_id,
          profile_limit = excluded.profile_limit,
          note = excluded.note,
          invited_by = excluded.invited_by,
          updated_at = now()
    returning public.workspace_members.id into v_member_id;

    delete from public.workspace_member_profile_groups wmpg
    where wmpg.member_id = v_member_id;

    delete from public.workspace_member_profiles wmp
    where wmp.member_id = v_member_id;

    foreach v_group_id in array coalesce(v_invitation_record.authorization_group_ids, '{}'::text[]) loop
      insert into public.workspace_member_profile_groups (
        workspace_id,
        member_id,
        group_id
      )
      values (
        v_invitation_record.workspace_id,
        v_member_id,
        v_group_id
      )
      on conflict (member_id, group_id) do nothing;
    end loop;

    foreach v_profile_id in array coalesce(v_invitation_record.authorization_profile_ids, '{}'::text[]) loop
      insert into public.workspace_member_profiles (
        workspace_id,
        member_id,
        profile_id
      )
      values (
        v_invitation_record.workspace_id,
        v_member_id,
        v_profile_id
      )
      on conflict (member_id, profile_id) do nothing;
    end loop;

    update public.workspace_invitations wi
      set status = 'accepted',
          accepted_at = now(),
          updated_at = now()
    where wi.id = v_invitation_record.id;

    accepted_workspace_id := v_invitation_record.workspace_id;
    accepted_invitation_id := v_invitation_record.id;
    return next;
  end loop;

  update public.workspace_invitations wi
    set status = 'expired',
        updated_at = now()
  where lower(wi.email) = v_current_user_email
    and wi.status = 'pending'
    and wi.expires_at <= now();
end;
$$;

grant execute on function public.accept_pending_invitations() to authenticated;

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'accept_pending_invitations',
    'user_can_access_profile',
    'user_can_access_profile_group'
  );
