# Complete System Architecture

## Product boundary

Carpenter Operations Hub coordinates field operations:

- Jobs
- Active Work
- Personnel
- Equipment
- Maintenance
- Mobilization
- Operations Board
- History / audit trail

## Architecture

Browser:
- Next.js client components
- Responsive dashboard
- Active Work first on mobile

Application:
- Next.js App Router
- Server components for secure initial data load
- Route handlers for validated writes
- Zod schemas for input validation

Data:
- Supabase Auth
- PostgreSQL
- Row Level Security
- Multi-tenant organization_id on operational tables
- Event tables for audit history

Storage:
- Supabase Storage bucket for fleet photos
- photo_url on equipment

Scale path:
- Vercel edge/app hosting
- Postgres indexes for dashboard queries
- RLS tenant isolation
- Realtime subscriptions for Operations Board
- Background workers for SMS notifications

## API Endpoints

- GET /api/jobs
- POST /api/jobs
- GET /api/work-requests
- POST /api/work-requests
- POST /api/equipment/:id/move
- POST /api/work-requests/:id/complete
- POST /api/personnel
- POST /api/equipment

## UI Architecture

- DashboardShell
- ActiveWorkPanel
- CalendarPanel
- JobListPanel
- OperationsBoard
- JobOverviewDrawer
- WorkRequestDrawer
- PersonnelDrawer
- EquipmentDrawer

## Important business rules

- Equipment belongs to one current job/site.
- Maintenance requests use specific equipment.
- Mobilization requests use equipment type/category.
- Completing mobilization can update equipment location.
- Admin controls jobs/personnel/equipment.
- Field users create and complete assigned work.
