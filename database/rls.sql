alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_phases enable row level security;
alter table public.personnel enable row level security;
alter table public.equipment enable row level security;
alter table public.work_requests enable row level security;
alter table public.request_events enable row level security;
alter table public.equipment_events enable row level security;

create or replace function public.current_org_id()
returns uuid
language sql stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select public.current_role() in ('owner','admin')
$$;

create policy "jobs read own org" on public.jobs
for select using (organization_id = public.current_org_id());

create policy "jobs admin write" on public.jobs
for all using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

create policy "requests read own org" on public.work_requests
for select using (organization_id = public.current_org_id());

create policy "requests insert own org" on public.work_requests
for insert with check (organization_id = public.current_org_id());

create policy "equipment read own org" on public.equipment
for select using (organization_id = public.current_org_id());

create policy "equipment admin write" on public.equipment
for all using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());

create policy "personnel read own org" on public.personnel
for select using (organization_id = public.current_org_id());

create policy "personnel admin write" on public.personnel
for all using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());
