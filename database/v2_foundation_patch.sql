-- V2 FOUNDATION PATCH
-- Run this once in Supabase SQL Editor after the original schema.sql and rls.sql.

-- Make sure profile roles can support this MVP.
alter table public.profiles
alter column role set default 'viewer';

-- job_phases policies were intentionally added here after the first scaffold.
drop policy if exists "job phases read own org" on public.job_phases;
drop policy if exists "job phases admin write" on public.job_phases;

create policy "job phases read own org"
on public.job_phases
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.organization_id = public.current_org_id()
  )
);

create policy "job phases admin write"
on public.job_phases
for all
using (
  public.is_admin()
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.organization_id = public.current_org_id()
  )
)
with check (
  public.is_admin()
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.organization_id = public.current_org_id()
  )
);

-- Allow users to read their own profile immediately after login.
drop policy if exists "profiles own profile read" on public.profiles;

create policy "profiles own profile read"
on public.profiles
for select
using (id = auth.uid() or organization_id = public.current_org_id());

-- For first deployment testing, ensure organizations can be read by members.
alter table public.organizations enable row level security;

drop policy if exists "organizations own org read" on public.organizations;

create policy "organizations own org read"
on public.organizations
for select
using (id = public.current_org_id());
