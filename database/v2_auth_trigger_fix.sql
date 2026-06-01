-- V2 AUTH STABILIZATION
-- Run once in Supabase SQL Editor.
--
-- Purpose:
-- Move profile creation out of the fragile /api/bootstrap endpoint
-- and into Supabase itself.
--
-- Result:
-- - First user becomes admin.
-- - Later users become viewer.
-- - Existing auth users are backfilled into profiles.
-- - Login no longer depends on SUPABASE_SERVICE_ROLE_KEY.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  existing_profile_count integer;
  resolved_full_name text;
begin
  select id
  into target_org_id
  from public.organizations
  order by created_at asc
  limit 1;

  if target_org_id is null then
    insert into public.organizations (name)
    values ('Carpenter Excavation')
    returning id into target_org_id;
  end if;

  select count(*)
  into existing_profile_count
  from public.profiles;

  resolved_full_name :=
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    department,
    active
  )
  values (
    new.id,
    target_org_id,
    new.email,
    coalesce(resolved_full_name, new.email),
    case when existing_profile_count = 0 then 'admin' else 'viewer' end,
    null,
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    organization_id = coalesce(public.profiles.organization_id, excluded.organization_id),
    active = true;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill profiles for any users that already exist in Supabase Auth.
insert into public.organizations (name)
select 'Carpenter Excavation'
where not exists (select 1 from public.organizations);

insert into public.profiles (
  id,
  organization_id,
  email,
  full_name,
  role,
  department,
  active
)
select
  u.id,
  (select id from public.organizations order by created_at asc limit 1),
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), u.email),
  case
    when not exists (select 1 from public.profiles) then 'admin'
    else 'viewer'
  end,
  null,
  true
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

-- Make the user's requested account admin.
update public.profiles
set
  role = 'admin',
  full_name = coalesce(nullif(full_name, ''), 'Justin Butler'),
  department = coalesce(department, 'Survey'),
  active = true
where lower(email) = lower('justinbutler@carpenterexcavation.com');
