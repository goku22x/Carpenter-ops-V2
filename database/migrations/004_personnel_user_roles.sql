-- Carpenter Operations Hub V3.3
-- Personnel page user approvals and role assignment.
-- Run after 001_v3_company_foundation.sql.

alter table public.profiles
  add column if not exists status text not null default 'pending',
  add column if not exists phone text,
  add column if not exists updated_at timestamptz not null default now();

-- Keep the allowed account states simple.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_status_check'
  ) then
    alter table public.profiles drop constraint profiles_status_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending','active','disabled'));

-- Backfill existing users so current working accounts do not get locked out.
update public.profiles
set status = case when active = false then 'disabled' else 'active' end
where status is null or status = 'pending';

-- First/admin users stay active.
update public.profiles
set status = 'active', active = true
where role in ('admin','manager');

-- New signups should be created but not allowed into the app until approved in Personnel.
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
  resolved_role text;
  resolved_status text;
  resolved_active boolean;
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

  if existing_profile_count = 0 then
    resolved_role := 'admin';
    resolved_status := 'active';
    resolved_active := true;
  else
    resolved_role := 'viewer';
    resolved_status := 'pending';
    resolved_active := false;
  end if;

  insert into public.profiles (
    id,
    organization_id,
    email,
    full_name,
    role,
    department,
    active,
    status
  )
  values (
    new.id,
    target_org_id,
    new.email,
    coalesce(resolved_full_name, new.email),
    resolved_role,
    null,
    resolved_active,
    resolved_status
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    organization_id = coalesce(public.profiles.organization_id, excluded.organization_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- RLS helpers should treat only active approved users as valid app users.
create or replace function public.current_profile_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
    and active = true
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_profile_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select department
  from public.profiles
  where id = auth.uid()
    and active = true
    and status = 'active'
  limit 1;
$$;

comment on column public.profiles.status is 'Account approval status. New signups are pending until approved from the Personnel page.';
comment on column public.profiles.role is 'App visibility role: admin, dispatcher, maintenance, survey, foreman, field, manager, viewer.';
