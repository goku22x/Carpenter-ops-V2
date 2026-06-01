-- Equipment Module V1 permissions.
-- Run once in Supabase SQL Editor if equipment save/read throws permission errors.

grant select, insert, update, delete on public.equipment to authenticated;
grant select on public.jobs to authenticated;

drop policy if exists "equipment read own org" on public.equipment;
drop policy if exists "equipment admin write" on public.equipment;

create policy "equipment read own org"
on public.equipment
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "equipment admin write"
on public.equipment
for all
to authenticated
using (organization_id = public.current_org_id() and public.is_admin())
with check (organization_id = public.current_org_id() and public.is_admin());
