-- ============================================================================
-- FIX: accept_pending_invitations respects workspace.settings.permissionMode
-- ============================================================================
-- Existing setting:
--   workspaces.settings->>'permissionMode' = 'group' | 'profile'
--
-- group mode:
--   copy authorization_group_ids only
--
-- profile mode:
--   copy authorization_profile_ids only
-- ============================================================================

begin;

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
  v_authorization_mode text;
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
    select coalesce(w.settings ->> 'permissionMode', 'profile')
      into v_authorization_mode
    from public.workspaces w
    where w.id = v_invitation_record.workspace_id;

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

    if v_authorization_mode = 'group' then
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
    else
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
    end if;

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

-- Verification:
-- select routine_name from information_schema.routines where routine_schema = 'public' and routine_name = 'accept_pending_invitations';
