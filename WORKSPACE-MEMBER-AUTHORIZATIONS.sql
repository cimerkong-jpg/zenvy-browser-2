-- ============================================================================
-- WORKSPACE MEMBER PROFILE/GROUP AUTHORIZATIONS
-- ============================================================================
-- Stores profile and profile-group access for non-owner workspace members.
-- Profile/group ids are text because the app stores local JSON ids as strings.
-- Pending invitation authorization is stored on workspace_invitations and copied
-- into member authorization rows when accept_pending_invitations() creates the
-- workspace_members row.
-- ============================================================================

begin;

create table if not exists public.workspace_member_profile_groups (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  group_id text not null,
  created_at timestamptz not null default now(),
  unique (member_id, group_id)
);

create table if not exists public.workspace_member_profiles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  profile_id text not null,
  created_at timestamptz not null default now(),
  unique (member_id, profile_id)
);

alter table public.workspace_invitations
  add column if not exists authorization_group_ids text[] not null default '{}',
  add column if not exists authorization_profile_ids text[] not null default '{}';

create index if not exists idx_workspace_member_profile_groups_member_id
  on public.workspace_member_profile_groups(member_id);
create index if not exists idx_workspace_member_profile_groups_workspace_id
  on public.workspace_member_profile_groups(workspace_id);
create index if not exists idx_workspace_member_profiles_member_id
  on public.workspace_member_profiles(member_id);
create index if not exists idx_workspace_member_profiles_workspace_id
  on public.workspace_member_profiles(workspace_id);

alter table public.workspace_member_profile_groups enable row level security;
alter table public.workspace_member_profiles enable row level security;

-- Reuse/update helper from member update migration.
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

drop policy if exists "Manage member profile group authorizations" on public.workspace_member_profile_groups;
drop policy if exists "Read member profile group authorizations" on public.workspace_member_profile_groups;
drop policy if exists "Manage member profile authorizations" on public.workspace_member_profiles;
drop policy if exists "Read member profile authorizations" on public.workspace_member_profiles;

create policy "Read member profile group authorizations"
on public.workspace_member_profile_groups
for select
using (
  public.user_can_manage_workspace_members(workspace_id)
  or public.user_is_authorization_owner(member_id)
);

create policy "Manage member profile group authorizations"
on public.workspace_member_profile_groups
for all
using (public.user_can_manage_workspace_members(workspace_id))
with check (public.user_can_manage_workspace_members(workspace_id));

create policy "Read member profile authorizations"
on public.workspace_member_profiles
for select
using (
  public.user_can_manage_workspace_members(workspace_id)
  or public.user_is_authorization_owner(member_id)
);

create policy "Manage member profile authorizations"
on public.workspace_member_profiles
for all
using (public.user_can_manage_workspace_members(workspace_id))
with check (public.user_can_manage_workspace_members(workspace_id));

-- Carry pending invitation authorizations to accepted workspace member rows.
drop function if exists public.accept_pending_invitations();

create or replace function public.accept_pending_invitations()
returns table (workspace_id uuid, invitation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv record;
  v_member_id uuid;
  v_group_id text;
  v_profile_id text;
begin
  select lower(email) into v_email from auth.users where id = v_user_id;

  for v_inv in
    select * from public.workspace_invitations wi
    where lower(wi.email) = v_email
      and wi.status = 'pending'
      and wi.expires_at > now()
  loop
    insert into public.workspace_members (
      workspace_id, user_id, email, role, status, user_group_id, profile_limit, note, invited_by
    )
    values (
      v_inv.workspace_id, v_user_id, v_email, v_inv.role, 'active', v_inv.user_group_id, v_inv.profile_limit, v_inv.note, v_inv.invited_by
    )
    on conflict (workspace_id, user_id) do update
      set status = 'active',
          role = excluded.role,
          user_group_id = excluded.user_group_id,
          profile_limit = excluded.profile_limit,
          note = excluded.note,
          invited_by = excluded.invited_by,
          updated_at = now()
    returning id into v_member_id;

    delete from public.workspace_member_profile_groups where member_id = v_member_id;
    delete from public.workspace_member_profiles where member_id = v_member_id;

    foreach v_group_id in array coalesce(v_inv.authorization_group_ids, '{}'::text[]) loop
      insert into public.workspace_member_profile_groups (workspace_id, member_id, group_id)
      values (v_inv.workspace_id, v_member_id, v_group_id)
      on conflict (member_id, group_id) do nothing;
    end loop;

    foreach v_profile_id in array coalesce(v_inv.authorization_profile_ids, '{}'::text[]) loop
      insert into public.workspace_member_profiles (workspace_id, member_id, profile_id)
      values (v_inv.workspace_id, v_member_id, v_profile_id)
      on conflict (member_id, profile_id) do nothing;
    end loop;

    update public.workspace_invitations
      set status = 'accepted', accepted_at = now(), updated_at = now()
      where id = v_inv.id;

    workspace_id := v_inv.workspace_id;
    invitation_id := v_inv.id;
    return next;
  end loop;

  update public.workspace_invitations
    set status = 'expired', updated_at = now()
    where lower(email) = v_email and status = 'pending' and expires_at <= now();
end;
$$;

grant execute on function public.accept_pending_invitations() to authenticated;

commit;

-- Verification:
-- select to_regclass('public.workspace_member_profile_groups'), to_regclass('public.workspace_member_profiles');
-- select authorization_group_ids, authorization_profile_ids from workspace_invitations order by created_at desc limit 5;
