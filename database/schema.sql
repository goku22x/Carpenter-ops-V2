create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer',
  department text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  owner text,
  site_contact text,
  dropbox_url text,
  notes text,
  sort_order int not null default 9999,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_phases (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  phase text not null check (phase in ('earthwork','storm_drain','sewer','water')),
  start_date date,
  end_date date,
  status text default 'Not Started',
  unique(job_id, phase)
);

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  full_name text not null,
  department text,
  position text,
  email text,
  phone text,
  notes text,
  active boolean not null default true
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  equipment_number text,
  equipment_type text,
  status text not null default 'Active',
  current_job_id uuid references public.jobs(id) on delete set null,
  current_site text,
  assigned_foreman_id uuid references public.personnel(id) on delete set null,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  department text not null,
  priority text not null default 'Medium',
  status text not null default 'New',
  assigned_personnel_id uuid references public.personnel(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  equipment_type_requested text,
  due_at timestamptz,
  description text not null,
  dropbox_url text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.work_requests(id) on delete cascade,
  event_type text not null default 'update',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.equipment_events (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment(id) on delete cascade,
  event_type text not null,
  from_job_id uuid references public.jobs(id) on delete set null,
  to_job_id uuid references public.jobs(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index work_requests_org_status_idx on public.work_requests(organization_id, status);
create index equipment_org_job_idx on public.equipment(organization_id, current_job_id);
create index jobs_org_idx on public.jobs(organization_id);
