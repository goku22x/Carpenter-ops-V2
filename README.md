# Carpenter Operations Hub MVP

Production-minded startup MVP for construction operations.

## Goal

Answer the daily field questions:

1. What work is active?
2. What jobs are active?
3. What people/equipment are assigned where?
4. What maintenance/mobilization issues need handled?

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- PostgreSQL with RLS
- Supabase Storage for fleet photos
- Tailwind CSS
- Zod validation

## Install

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Deploy

- App: Vercel
- DB/Auth/Storage: Supabase

## MVP Modules

- Auth
- Jobs
- Job Phases: Earthwork, Storm Drain, Sewer, Water
- Personnel
- Equipment
- Active Work
- Maintenance Requests
- Mobilization Requests
- Operations Board
- Request/Equipment history
