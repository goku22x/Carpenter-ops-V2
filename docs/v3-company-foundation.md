# V3 Company Foundation

This version focuses on making Carpenter Operations Hub safe to grow as company software.

## Foundation entities

- `jobs`: active/inactive job records.
- `job_phases`: named phases with dates, progress percent, and sort order.
- `equipment`: owned/rental/subcontractor assets with current assignment fields.
- `work_orders`: real operational work orders.
- `work_order_events`: status/comment/history events for work orders.
- `equipment_assignments`: assignment history showing what equipment was on what job and when.
- `maintenance_history`: completed maintenance history tied to equipment and optionally work orders.
- `audit_log`: generic change tracking foundation.

## Development rule

Do not keep adding one-off SQL patch files forever. New database changes should go into numbered files under `database/migrations/`.

## Next structural refactor

Split `equipment-board.tsx` into smaller components before adding major new UI features.
