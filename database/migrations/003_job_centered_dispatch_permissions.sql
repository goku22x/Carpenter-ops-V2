-- Carpenter Operations Hub V3.2
-- Job-centered dispatch workflow and role visibility foundation.
-- Run after 001_v3_company_foundation.sql and 002_equipment_request_dispatch_flow.sql.

-- The app now uses Equipment Request as the user-facing request category.
-- Mobilization remains supported for older records, but new foreman requests should use Equipment Request.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'work_orders'
      and constraint_name = 'work_orders_work_type_check'
  ) then
    alter table public.work_orders drop constraint work_orders_work_type_check;
  end if;
end $$;

alter table public.work_orders
  add constraint work_orders_work_type_check
  check (work_type in ('Equipment Request','Survey','Maintenance','Mobilization','Trucking','Foreman Assignment','Office','General'));

-- Normalize new request language without destroying old records.
update public.work_orders
set
  title = 'Equipment Request',
  custom_fields = coalesce(custom_fields, '{}'::jsonb) || jsonb_build_object('request_kind', 'equipment_type_request')
where work_type = 'Equipment Request'
  and title in ('Mobilization Work Order', 'Mobilization Request', 'Equipment Request');

-- RLS helper functions for future policies/UI parity.
create or replace function public.current_profile_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select department from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_dispatch_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role() in ('admin','manager','dispatcher','operations','superintendent')
    or lower(coalesce(public.current_profile_department(), '')) like '%dispatch%'
    or lower(coalesce(public.current_profile_department(), '')) like '%equipment%'
    or lower(coalesce(public.current_profile_department(), '')) like '%operations%',
    false
  );
$$;

comment on table public.equipment_assignments is 'Dispatcher-only equipment assignment history. Field users should not use this as a general equipment tracking screen.';
comment on column public.work_orders.work_type is 'Request category. Equipment Request = foreman asks for type; dispatcher picks specific unit.';

-- Tighten assignment-history visibility: this is dispatcher/equipment/admin information,
-- not a general foreman/field history screen.
drop policy if exists equipment_assignments_org on public.equipment_assignments;
drop policy if exists equipment_assignments_select_dispatch on public.equipment_assignments;
drop policy if exists equipment_assignments_insert_dispatch on public.equipment_assignments;
drop policy if exists equipment_assignments_update_dispatch on public.equipment_assignments;

create policy equipment_assignments_select_dispatch
on public.equipment_assignments
for select
using (organization_id = public.current_profile_org_id() and public.is_dispatch_user());

create policy equipment_assignments_insert_dispatch
on public.equipment_assignments
for insert
with check (organization_id = public.current_profile_org_id() and public.is_dispatch_user());

create policy equipment_assignments_update_dispatch
on public.equipment_assignments
for update
using (organization_id = public.current_profile_org_id() and public.is_dispatch_user())
with check (organization_id = public.current_profile_org_id() and public.is_dispatch_user());
