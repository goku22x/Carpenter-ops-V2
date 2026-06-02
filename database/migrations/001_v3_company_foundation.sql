-- Carpenter Operations Hub V3 company foundation
-- Run this once in Supabase SQL Editor on the existing V2 database.
-- It is intentionally idempotent: safe to run again while developing.

create extension if not exists pgcrypto;

-- ---------- Generic updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Existing table hardening / missing columns ----------
alter table public.profiles
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.jobs
  add column if not exists active boolean not null default true,
  add column if not exists sort_order int not null default 9999,
  add column if not exists updated_at timestamptz not null default now();

alter table public.job_phases
  add column if not exists name text,
  add column if not exists progress_percent int not null default 0,
  add column if not exists sort_order int not null default 0,
  add column if not exists status text default 'Not Started';

update public.job_phases
set name = initcap(replace(coalesce(phase, 'phase'), '_', ' '))
where name is null;

alter table public.equipment
  add column if not exists ownership_type text not null default 'Owned',
  add column if not exists rental_company text,
  add column if not exists rental_return_date date,
  add column if not exists rental_notes text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.personnel
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ---------- Work orders: real company queue, not temporary requests ----------
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  work_type text not null check (work_type in ('Survey','Maintenance','Mobilization','Trucking','Foreman Assignment','Office','General')),
  title text not null,
  description text,
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
  status text not null default 'New' check (status in ('New','Assigned','In Progress','Waiting','Complete','Closed')),
  assigned_personnel_id uuid references public.personnel(id) on delete set null,
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  related_equipment_id uuid references public.equipment(id) on delete set null,
  due_date date,
  custom_fields jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- History and audit tables ----------
create table if not exists public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  event_type text not null default 'update',
  from_status text,
  to_status text,
  note text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  assigned_foreman_id uuid references public.personnel(id) on delete set null,
  assigned_by_profile_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  note text
);

create table if not exists public.maintenance_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  performed_by_personnel_id uuid references public.personnel(id) on delete set null,
  completed_at timestamptz not null default now(),
  cost numeric(12,2),
  meter_hours numeric(12,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Helpful indexes ----------
create index if not exists work_orders_org_status_idx on public.work_orders(organization_id, status);
create index if not exists work_orders_org_type_idx on public.work_orders(organization_id, work_type);
create index if not exists work_orders_equipment_idx on public.work_orders(related_equipment_id);
create index if not exists work_order_events_order_idx on public.work_order_events(work_order_id, created_at desc);
create index if not exists equipment_assignments_equipment_idx on public.equipment_assignments(equipment_id, assigned_at desc);
create index if not exists equipment_assignments_job_idx on public.equipment_assignments(job_id, assigned_at desc);
create index if not exists maintenance_history_equipment_idx on public.maintenance_history(equipment_id, completed_at desc);
create index if not exists audit_log_org_created_idx on public.audit_log(organization_id, created_at desc);

-- ---------- updated_at triggers ----------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_profiles_updated_at') then
    create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_jobs_updated_at') then
    create trigger set_jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_equipment_updated_at') then
    create trigger set_equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_personnel_updated_at') then
    create trigger set_personnel_updated_at before update on public.personnel for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_work_orders_updated_at') then
    create trigger set_work_orders_updated_at before update on public.work_orders for each row execute function public.set_updated_at();
  end if;
end $$;

-- ---------- RLS foundation ----------
alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;
alter table public.equipment_assignments enable row level security;
alter table public.maintenance_history enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_profile_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('admin','manager'), false);
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_orders' and policyname='work_orders_select_org') then
    create policy work_orders_select_org on public.work_orders for select using (organization_id = public.current_profile_org_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_orders' and policyname='work_orders_insert_org') then
    create policy work_orders_insert_org on public.work_orders for insert with check (organization_id = public.current_profile_org_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_orders' and policyname='work_orders_update_org') then
    create policy work_orders_update_org on public.work_orders for update using (organization_id = public.current_profile_org_id()) with check (organization_id = public.current_profile_org_id());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_order_events' and policyname='work_order_events_org') then
    create policy work_order_events_org on public.work_order_events for all using (organization_id = public.current_profile_org_id()) with check (organization_id = public.current_profile_org_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='equipment_assignments' and policyname='equipment_assignments_org') then
    create policy equipment_assignments_org on public.equipment_assignments for all using (organization_id = public.current_profile_org_id()) with check (organization_id = public.current_profile_org_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_history' and policyname='maintenance_history_org') then
    create policy maintenance_history_org on public.maintenance_history for all using (organization_id = public.current_profile_org_id()) with check (organization_id = public.current_profile_org_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_log' and policyname='audit_log_select_admin_org') then
    create policy audit_log_select_admin_org on public.audit_log for select using (organization_id = public.current_profile_org_id() and public.is_company_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_log' and policyname='audit_log_insert_org') then
    create policy audit_log_insert_org on public.audit_log for insert with check (organization_id = public.current_profile_org_id());
  end if;
end $$;

-- Optional one-time migration from the old work_requests prototype table into work_orders.
insert into public.work_orders (
  id, organization_id, job_id, work_type, title, description, priority, status,
  assigned_personnel_id, requested_by_profile_id, related_equipment_id, due_date,
  custom_fields, created_at, updated_at
)
select
  wr.id,
  wr.organization_id,
  wr.job_id,
  case wr.department
    when 'Survey' then 'Survey'
    when 'Maintenance' then 'Maintenance'
    when 'Mobilization' then 'Mobilization'
    when 'Trucks' then 'Trucking'
    when 'Earthwork' then 'Foreman Assignment'
    when 'Office' then 'Office'
    else 'General'
  end,
  coalesce(wr.department || ' Request', 'General Work Order'),
  wr.description,
  wr.priority,
  case when wr.status in ('New','Assigned','In Progress','Waiting','Complete','Closed') then wr.status else 'New' end,
  wr.assigned_personnel_id,
  wr.created_by,
  wr.equipment_id,
  wr.due_at::date,
  jsonb_build_object('legacy_work_request', true, 'equipment_type_requested', wr.equipment_type_requested, 'dropbox_url', wr.dropbox_url),
  wr.created_at,
  wr.updated_at
from public.work_requests wr
where to_regclass('public.work_requests') is not null
  and not exists (select 1 from public.work_orders wo where wo.id = wr.id);
