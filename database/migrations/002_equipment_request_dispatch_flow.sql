-- Carpenter Operations Hub V3.1
-- Equipment request dispatch flow:
-- Foreman requests equipment TYPE. Dispatcher selects the exact UNIT.
-- A big equipment unit can only have one active job assignment at a time.

-- If development data already has duplicate active assignment rows, close the older duplicates first
-- so the unique index can be created safely.
with ranked as (
  select
    id,
    row_number() over (partition by equipment_id order by assigned_at desc, id desc) as rn
  from public.equipment_assignments
  where removed_at is null
)
update public.equipment_assignments ea
set removed_at = now(), note = coalesce(ea.note, '') || ' Auto-closed duplicate active assignment before V3.1 dispatch rule.'
from ranked
where ea.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists equipment_assignments_one_active_unit
on public.equipment_assignments(equipment_id)
where removed_at is null;

-- Helpful JSON fields now used on mobilization work_orders.custom_fields:
-- equipment_type_needed: what foreman requested
-- quantity: requested count, usually 1
-- assigned_equipment_id: exact unit selected by dispatch
-- assigned_equipment_name: selected equipment name
-- assigned_equipment_number: selected equipment number
-- completed_equipment_number: compatibility field for older UI references
