-- Zenvy Browser workspace + member schema
-- Run in Supabase SQL Editor after the base cloud-sync schema.

create extension if not exists "uuid-ossp";

do $$ begin
  create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type workspace_member_status as enum ('active', 'removed', 'suspended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type workspace_invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_user_groups (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role workspace_role not null,
  status workspace_member_status not null default 'active',
  user_group_id uuid references workspace_user_groups(id) on delete set null,
  profile_limit integer,
  note text not null default '',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  constraint owner_member_active check (role <> 'owner' or status = 'active')
);

create table if not exists workspace_invitations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null check (role <> 'owner'),
  user_group_id uuid references workspace_user_groups(id) on delete set null,
  profile_limit integer,
  note text not null default '',
  invited_by uuid not null references auth.users(id),
  status workspace_invitation_status not null default 'pending',
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_invitations_pending_email
  on workspace_invitations (workspace_id, lower(email))
  where status = 'pending';

create table if not exists workspace_role_permissions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role workspace_role not null check (role <> 'owner'),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, role)
);

create table if not exists workspace_group_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_group_id uuid not null references workspace_user_groups(id) on delete cascade,
  member_id uuid not null references workspace_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_group_id, member_id)
);

alter table profiles add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table profiles add column if not exists created_by uuid references auth.users(id);
alter table profiles add column if not exists updated_by uuid references auth.users(id);
alter table groups add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table groups add column if not exists created_by uuid references auth.users(id);
alter table groups add column if not exists updated_by uuid references auth.users(id);
alter table scripts add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table scripts add column if not exists created_by uuid references auth.users(id);
alter table scripts add column if not exists updated_by uuid references auth.users(id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_profiles_updated_at on user_profiles;
create trigger update_user_profiles_updated_at before update on user_profiles for each row execute function update_updated_at_column();
drop trigger if exists update_workspaces_updated_at on workspaces;
create trigger update_workspaces_updated_at before update on workspaces for each row execute function update_updated_at_column();
drop trigger if exists update_workspace_members_updated_at on workspace_members;
create trigger update_workspace_members_updated_at before update on workspace_members for each row execute function update_updated_at_column();
drop trigger if exists update_workspace_invitations_updated_at on workspace_invitations;
create trigger update_workspace_invitations_updated_at before update on workspace_invitations for each row execute function update_updated_at_column();
drop trigger if exists update_workspace_role_permissions_updated_at on workspace_role_permissions;
create trigger update_workspace_role_permissions_updated_at before update on workspace_role_permissions for each row execute function update_updated_at_column();
drop trigger if exists update_workspace_user_groups_updated_at on workspace_user_groups;
create trigger update_workspace_user_groups_updated_at before update on workspace_user_groups for each row execute function update_updated_at_column();

create or replace function default_permissions_for_role(p_role workspace_role)
returns jsonb as $$
begin
  if p_role = 'admin' then
    return '{"profile.open":true,"profile.create":true,"profile.edit":true,"profile.delete":true,"profile.import":true,"profile.export":true,"profile.clone":true,"profile.transfer":true,"group.create":true,"group.edit":true,"group.delete":true,"automation.create":true,"automation.edit":true,"automation.run":true,"automation.delete":true,"member.invite":true,"member.remove":true,"member.edit_role":true,"workspace.settings":true,"workspace.billing":false,"workspace.delete":false}'::jsonb;
  elsif p_role = 'member' then
    return '{"profile.open":true,"profile.create":true,"profile.edit":true,"profile.delete":false,"profile.import":true,"profile.export":true,"profile.clone":true,"profile.transfer":false,"group.create":true,"group.edit":true,"group.delete":false,"automation.create":true,"automation.edit":true,"automation.run":true,"automation.delete":false,"member.invite":false,"member.remove":false,"member.edit_role":false,"workspace.settings":false,"workspace.billing":false,"workspace.delete":false}'::jsonb;
  else
    return '{"profile.open":true,"profile.create":false,"profile.edit":false,"profile.delete":false,"profile.import":false,"profile.export":false,"profile.clone":false,"profile.transfer":false,"group.create":false,"group.edit":false,"group.delete":false,"automation.create":false,"automation.edit":false,"automation.run":false,"automation.delete":false,"member.invite":false,"member.remove":false,"member.edit_role":false,"workspace.settings":false,"workspace.billing":false,"workspace.delete":false}'::jsonb;
  end if;
end;
$$ language plpgsql immutable;

create or replace function initialize_workspace_permissions(p_workspace_id uuid)
returns void as $$
begin
  insert into workspace_role_permissions (workspace_id, role, permissions)
  values
    (p_workspace_id, 'admin', default_permissions_for_role('admin')),
    (p_workspace_id, 'member', default_permissions_for_role('member')),
    (p_workspace_id, 'viewer', default_permissions_for_role('viewer'))
  on conflict (workspace_id, role) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function user_is_active_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id and status = 'active'
  );
$$ language sql stable security definer set search_path = public;

create or replace function user_has_workspace_permission(p_workspace_id uuid, p_user_id uuid, p_permission text)
returns boolean as $$
  select coalesce((
    select
      case
        when wm.role = 'owner' then true
        else coalesce((wrp.permissions ->> p_permission)::boolean, false)
      end
    from workspace_members wm
    left join workspace_role_permissions wrp on wrp.workspace_id = wm.workspace_id and wrp.role = wm.role
    where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id and wm.status = 'active'
    limit 1
  ), false);
$$ language sql stable security definer set search_path = public;

create or replace function create_workspace_owner_member()
returns trigger as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = new.owner_id;
  insert into workspace_members (workspace_id, user_id, email, role, status)
  values (new.id, new.owner_id, lower(v_email), 'owner', 'active')
  on conflict (workspace_id, user_id) do update set role = 'owner', status = 'active';

  perform initialize_workspace_permissions(new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_workspace_created_add_owner on workspaces;
create trigger on_workspace_created_add_owner after insert on workspaces for each row execute function create_workspace_owner_member();

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  v_workspace_id uuid;
begin
  insert into user_profiles (id, email, display_name)
  values (new.id, lower(new.email), split_part(new.email, '@', 1))
  on conflict (id) do update set email = excluded.email;

  insert into workspaces (name, owner_id)
  values ('My Workspace', new.id)
  returning id into v_workspace_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_workspace on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created_workspace after insert on auth.users for each row execute function handle_new_auth_user();

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
  created_at timestamptz,
  updated_at timestamptz
) as $$
begin
  return query
  select
    w.id,
    w.name,
    w.owner_id,
    wm.role,
    wm.status,
    (select count(*) from workspace_members m where m.workspace_id = w.id and m.status = 'active'),
    (select count(*) from profiles p where p.workspace_id = w.id and p.deleted_at is null),
    w.settings,
    w.created_at,
    w.updated_at
  from workspaces w
  join workspace_members wm on wm.workspace_id = w.id
  where wm.user_id = auth.uid() and wm.status = 'active'
  order by w.created_at desc;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function accept_pending_invitations()
returns table (workspace_id uuid, invitation_id uuid) as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv record;
begin
  select lower(email) into v_email from auth.users where id = v_user_id;

  for v_inv in
    select * from workspace_invitations
    where lower(email) = v_email
      and status = 'pending'
      and expires_at > now()
  loop
    insert into workspace_members (
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
          invited_by = excluded.invited_by;

    update workspace_invitations
      set status = 'accepted', accepted_at = now()
      where id = v_inv.id;

    workspace_id := v_inv.workspace_id;
    invitation_id := v_inv.id;
    return next;
  end loop;

  update workspace_invitations
    set status = 'expired'
    where lower(email) = v_email and status = 'pending' and expires_at <= now();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function get_my_permissions(p_workspace_id uuid)
returns jsonb as $$
declare
  v_role workspace_role;
  v_permissions jsonb;
begin
  select role into v_role
  from workspace_members
  where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
  limit 1;

  if v_role is null then
    return '{}'::jsonb;
  elsif v_role = 'owner' then
    return '{"profile.open":true,"profile.create":true,"profile.edit":true,"profile.delete":true,"profile.import":true,"profile.export":true,"profile.clone":true,"profile.transfer":true,"group.create":true,"group.edit":true,"group.delete":true,"automation.create":true,"automation.edit":true,"automation.run":true,"automation.delete":true,"member.invite":true,"member.remove":true,"member.edit_role":true,"workspace.settings":true,"workspace.billing":true,"workspace.delete":true}'::jsonb;
  end if;

  select permissions into v_permissions
  from workspace_role_permissions
  where workspace_id = p_workspace_id and role = v_role;

  return coalesce(v_permissions, default_permissions_for_role(v_role));
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function protect_owner_member()
returns trigger as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    raise exception 'Workspace owner cannot be removed, downgraded, or disabled';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists protect_owner_member_update on workspace_members;
create trigger protect_owner_member_update before update or delete on workspace_members for each row execute function protect_owner_member();

create or replace function protect_soft_delete_permissions()
returns trigger as $$
declare
  v_permission text;
begin
  if tg_table_name = 'profiles' then
    v_permission := 'profile.delete';
  elsif tg_table_name = 'groups' then
    v_permission := 'group.delete';
  else
    v_permission := 'automation.delete';
  end if;

  if old.deleted_at is null and new.deleted_at is not null and not user_has_workspace_permission(old.workspace_id, auth.uid(), v_permission) then
    raise exception 'Permission denied: %', v_permission;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_profile_soft_delete on profiles;
create trigger protect_profile_soft_delete before update on profiles for each row execute function protect_soft_delete_permissions();
drop trigger if exists protect_group_soft_delete on groups;
create trigger protect_group_soft_delete before update on groups for each row execute function protect_soft_delete_permissions();
drop trigger if exists protect_script_soft_delete on scripts;
create trigger protect_script_soft_delete before update on scripts for each row execute function protect_soft_delete_permissions();

create index if not exists idx_workspaces_owner_id on workspaces(owner_id);
create index if not exists idx_workspace_members_workspace_id on workspace_members(workspace_id);
create index if not exists idx_workspace_members_user_id on workspace_members(user_id);
create index if not exists idx_workspace_members_active on workspace_members(workspace_id, user_id) where status = 'active';
create index if not exists idx_workspace_invitations_workspace_id on workspace_invitations(workspace_id);
create index if not exists idx_workspace_invitations_email on workspace_invitations(lower(email));
create index if not exists idx_workspace_user_groups_workspace_id on workspace_user_groups(workspace_id);
create index if not exists idx_workspace_role_permissions_workspace_id on workspace_role_permissions(workspace_id);
create index if not exists idx_profiles_workspace_id on profiles(workspace_id);
create index if not exists idx_groups_workspace_id on groups(workspace_id);
create index if not exists idx_scripts_workspace_id on scripts(workspace_id);

alter table user_profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;
alter table workspace_user_groups enable row level security;
alter table workspace_group_members enable row level security;
alter table workspace_role_permissions enable row level security;
alter table profiles enable row level security;
alter table groups enable row level security;
alter table scripts enable row level security;

drop policy if exists "Users can read their profile" on user_profiles;
create policy "Users can read their profile" on user_profiles for select using (id = auth.uid());
drop policy if exists "Users can upsert their profile" on user_profiles;
create policy "Users can upsert their profile" on user_profiles for insert with check (id = auth.uid());
drop policy if exists "Users can update their profile" on user_profiles;
create policy "Users can update their profile" on user_profiles for update using (id = auth.uid());

drop policy if exists "Read active member workspaces" on workspaces;
drop policy if exists "Users can view workspaces they are members of" on workspaces;
create policy "Read active member workspaces" on workspaces for select using (user_is_active_workspace_member(id, auth.uid()));
drop policy if exists "Create own workspaces" on workspaces;
drop policy if exists "Users can create their own workspaces" on workspaces;
create policy "Create own workspaces" on workspaces for insert with check (owner_id = auth.uid());
drop policy if exists "Manage workspace settings" on workspaces;
drop policy if exists "Owners can update their workspaces" on workspaces;
create policy "Manage workspace settings" on workspaces for update using (user_has_workspace_permission(id, auth.uid(), 'workspace.settings'));
drop policy if exists "Delete workspace" on workspaces;
drop policy if exists "Owners can delete their workspaces" on workspaces;
create policy "Delete workspace" on workspaces for delete using (user_has_workspace_permission(id, auth.uid(), 'workspace.delete'));

drop policy if exists "Read workspace members" on workspace_members;
drop policy if exists "Users can view members in their workspaces" on workspace_members;
create policy "Read workspace members" on workspace_members for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Invite creates members only via permission" on workspace_members;
drop policy if exists "Owners and admins can add members" on workspace_members;
create policy "Invite creates members only via permission" on workspace_members for insert with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));
drop policy if exists "Edit workspace members" on workspace_members;
drop policy if exists "Owners and admins can update members" on workspace_members;
drop policy if exists "Owners and admins can remove members" on workspace_members;
create policy "Edit workspace members" on workspace_members for update using (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.remove')
  or user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')
);

drop policy if exists "Read workspace invitations" on workspace_invitations;
drop policy if exists "Users can view invitations in their workspaces" on workspace_invitations;
create policy "Read workspace invitations" on workspace_invitations for select using (
  user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite')
  or lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);
drop policy if exists "Create workspace invitations" on workspace_invitations;
drop policy if exists "Owners and admins can create invitations" on workspace_invitations;
create policy "Create workspace invitations" on workspace_invitations for insert with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));
drop policy if exists "Update workspace invitations" on workspace_invitations;
create policy "Update workspace invitations" on workspace_invitations for update using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.invite'));

drop policy if exists "Read workspace user groups" on workspace_user_groups;
create policy "Read workspace user groups" on workspace_user_groups for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Manage workspace user groups" on workspace_user_groups;
create policy "Manage workspace user groups" on workspace_user_groups for all using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')) with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role'));

drop policy if exists "Read workspace role permissions" on workspace_role_permissions;
create policy "Read workspace role permissions" on workspace_role_permissions for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Manage workspace role permissions" on workspace_role_permissions;
create policy "Manage workspace role permissions" on workspace_role_permissions for all using (user_has_workspace_permission(workspace_id, auth.uid(), 'workspace.settings')) with check (user_has_workspace_permission(workspace_id, auth.uid(), 'workspace.settings'));

drop policy if exists "Read workspace group members" on workspace_group_members;
create policy "Read workspace group members" on workspace_group_members for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Manage workspace group members" on workspace_group_members;
create policy "Manage workspace group members" on workspace_group_members for all using (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role')) with check (user_has_workspace_permission(workspace_id, auth.uid(), 'member.edit_role'));

drop policy if exists "Users can view their own profiles" on profiles;
drop policy if exists "Users can insert their own profiles" on profiles;
drop policy if exists "Users can update their own profiles" on profiles;
drop policy if exists "Users can delete their own profiles" on profiles;
drop policy if exists "Read workspace profiles" on profiles;
create policy "Read workspace profiles" on profiles for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Create workspace profiles" on profiles;
create policy "Create workspace profiles" on profiles for insert with check (user_has_workspace_permission(workspace_id, auth.uid(), 'profile.create'));
drop policy if exists "Update workspace profiles" on profiles;
create policy "Update workspace profiles" on profiles for update using (user_has_workspace_permission(workspace_id, auth.uid(), 'profile.edit'));
drop policy if exists "Delete workspace profiles" on profiles;
create policy "Delete workspace profiles" on profiles for delete using (user_has_workspace_permission(workspace_id, auth.uid(), 'profile.delete'));

drop policy if exists "Users can view their own groups" on groups;
drop policy if exists "Users can insert their own groups" on groups;
drop policy if exists "Users can update their own groups" on groups;
drop policy if exists "Users can delete their own groups" on groups;
drop policy if exists "Read workspace groups" on groups;
create policy "Read workspace groups" on groups for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Create workspace groups" on groups;
create policy "Create workspace groups" on groups for insert with check (user_has_workspace_permission(workspace_id, auth.uid(), 'group.create'));
drop policy if exists "Update workspace groups" on groups;
create policy "Update workspace groups" on groups for update using (user_has_workspace_permission(workspace_id, auth.uid(), 'group.edit'));
drop policy if exists "Delete workspace groups" on groups;
create policy "Delete workspace groups" on groups for delete using (user_has_workspace_permission(workspace_id, auth.uid(), 'group.delete'));

drop policy if exists "Users can view their own scripts" on scripts;
drop policy if exists "Users can insert their own scripts" on scripts;
drop policy if exists "Users can update their own scripts" on scripts;
drop policy if exists "Users can delete their own scripts" on scripts;
drop policy if exists "Read workspace scripts" on scripts;
create policy "Read workspace scripts" on scripts for select using (user_is_active_workspace_member(workspace_id, auth.uid()));
drop policy if exists "Create workspace scripts" on scripts;
create policy "Create workspace scripts" on scripts for insert with check (user_has_workspace_permission(workspace_id, auth.uid(), 'automation.create'));
drop policy if exists "Update workspace scripts" on scripts;
create policy "Update workspace scripts" on scripts for update using (user_has_workspace_permission(workspace_id, auth.uid(), 'automation.edit'));
drop policy if exists "Delete workspace scripts" on scripts;
create policy "Delete workspace scripts" on scripts for delete using (user_has_workspace_permission(workspace_id, auth.uid(), 'automation.delete'));
