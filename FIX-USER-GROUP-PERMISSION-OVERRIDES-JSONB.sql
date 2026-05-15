-- ============================================================================
-- FIX: normalize User Group permission overrides into jsonb column
-- ============================================================================
-- Purpose:
--   Move legacy __ZENVY_GROUP_META__ permission metadata out of
--   workspace_user_groups.description and into permission_overrides jsonb.
--   description becomes human-readable text only.
-- ============================================================================

begin;

alter table public.workspace_user_groups
  add column if not exists permission_overrides jsonb;

do $$
declare
  v_group record;
  v_payload jsonb;
begin
  for v_group in
    select wug.id, wug.description, wug.permission_overrides
    from public.workspace_user_groups wug
    where wug.description like '__ZENVY_GROUP_META__:%'
  loop
    begin
      v_payload := substring(v_group.description from length('__ZENVY_GROUP_META__:') + 1)::jsonb;

      update public.workspace_user_groups wug
      set
        permission_overrides = coalesce(wug.permission_overrides, v_payload -> 'permissions'),
        description = coalesce(v_payload ->> 'note', ''),
        updated_at = now()
      where wug.id = v_group.id;
    exception
      when others then
        -- Preserve malformed legacy text for manual repair; do not destroy data.
        continue;
    end;
  end loop;
end $$;

-- Final source of truth after migration verification: permission_overrides only.
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

grant execute on function public.workspace_user_group_action_permission_override(uuid, text) to authenticated;

commit;

-- ============================================================================
-- Verification
-- ============================================================================

select
  wug.id,
  wug.description,
  wug.permission_overrides
from public.workspace_user_groups wug
order by wug.created_at desc;

select count(*) as remaining_legacy_metadata_rows
from public.workspace_user_groups wug
where wug.description like '__ZENVY_GROUP_META__:%';
