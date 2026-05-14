-- ============================================================================
-- FIX SIGNUP TRIGGER FOR SUPABASE AUTH
-- ============================================================================
-- Root cause:
--   New auth.users rows can fire a signup trigger that inserts a default
--   workspace. The workspace insert also fires on_workspace_created_add_owner,
--   which inserts the owner into workspace_members. Older/default migrations
--   inserted the same owner membership again without ON CONFLICT, causing a
--   unique violation on workspace_members(workspace_id, user_id). Supabase Auth
--   surfaces that trigger failure as "Database error saving new user".
--
-- Run this in Supabase SQL Editor.
-- ============================================================================

begin;

alter table workspaces
  add column if not exists is_default boolean not null default false;

create unique index if not exists workspaces_owner_default_unique
  on workspaces(owner_id)
  where is_default = true;

-- Keep only one auth.users signup trigger. Both names have existed in this repo.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_workspace on auth.users;
drop function if exists handle_new_user() cascade;
drop function if exists handle_new_auth_user() cascade;

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
  v_workspace_id uuid;
begin
  insert into user_profiles (id, email, display_name)
  values (new.id, v_email, split_part(v_email, '@', 1))
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(user_profiles.display_name, excluded.display_name);

  select id into v_workspace_id
  from workspaces
  where owner_id = new.id
    and is_default = true
  order by created_at asc
  limit 1;

  if v_workspace_id is null then
    select id into v_workspace_id
    from workspaces
    where owner_id = new.id
      and name = 'My Workspace'
    order by created_at asc
    limit 1;

    if v_workspace_id is not null then
      update workspaces
      set is_default = true
      where id = v_workspace_id;
    else
      insert into workspaces (name, owner_id, is_default, settings)
      values ('My Workspace', new.id, true, '{}'::jsonb)
      returning id into v_workspace_id;
    end if;
  end if;

  -- Idempotent even when on_workspace_created_add_owner already inserted it.
  insert into workspace_members (workspace_id, user_id, email, role, status)
  values (v_workspace_id, new.id, v_email, 'owner', 'active')
  on conflict (workspace_id, user_id) do update
    set email = excluded.email,
        role = 'owner',
        status = 'active';

  if to_regprocedure('public.initialize_workspace_permissions(uuid)') is not null then
    perform initialize_workspace_permissions(v_workspace_id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row
  execute function handle_new_auth_user();

commit;

-- Verification queries:
-- select tgname, proname
-- from pg_trigger t
-- join pg_proc p on p.oid = t.tgfoid
-- where t.tgrelid = 'auth.users'::regclass
--   and not t.tgisinternal;
--
-- select u.id, u.email, up.id as profile_id, w.id as default_workspace_id, wm.id as owner_member_id, wm.role, wm.status
-- from auth.users u
-- left join user_profiles up on up.id = u.id
-- left join workspaces w on w.owner_id = u.id and w.is_default = true
-- left join workspace_members wm on wm.workspace_id = w.id and wm.user_id = u.id
-- order by u.created_at desc
-- limit 20;
