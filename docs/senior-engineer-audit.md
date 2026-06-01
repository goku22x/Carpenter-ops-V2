# Senior Engineer Architecture Audit — Carpenter Ops V2

## Reverse-engineered architecture

Current V2 architecture:

- GitHub stores source code.
- Vercel builds/deploys the Next.js app.
- Supabase provides Auth, Postgres, RLS, and future file storage.
- Login/signup happens in the browser with Supabase Auth.
- `/dashboard` is protected server-side by checking the Supabase session.
- Dashboard expects a matching row in `public.profiles`.
- Jobs are stored in `public.jobs`.
- Job phase dates are stored in `public.job_phases`.

## Complete auth data flow before this fix

1. User signs up/signs in in `LoginForm`.
2. Browser receives Supabase Auth session.
3. Client calls `/api/bootstrap`.
4. `/api/bootstrap` depends on `SUPABASE_SERVICE_ROLE_KEY`.
5. Bootstrap checks/creates:
   - `organizations`
   - `profiles`
6. Dashboard loads only if profile exists.

## Critical bad architecture decision

The app made login depend on an application-level bootstrap endpoint.

That creates multiple failure points:

- Vercel secret missing/misspelled
- wrong key type
- redeploy not picking up env vars
- bootstrap route fails with generic 500
- profile creation becomes detached from Supabase Auth user creation
- user exists in Auth but has no app profile
- debugging requires Vercel runtime logs

## Production-grade replacement

Profile creation should happen where the user is created: inside Supabase.

This update moves user provisioning into a database trigger:

- `auth.users` insert
- trigger creates/updates `public.profiles`
- first profile becomes `admin`
- later users become `viewer`
- no service-role key needed for normal login
- no `/api/bootstrap` dependency for sign-in

## Maintained functionality

Same user-facing behavior:

- users can sign up
- users can sign in
- first user becomes admin
- dashboard still requires a profile
- jobs module remains unchanged

## Improved maintainability

The auth boundary becomes:

- Supabase Auth owns identity
- Database trigger owns app profile creation
- Next.js dashboard only reads session + profile
- Bootstrap endpoint becomes non-critical compatibility no-op

## Remaining risks

- We still need full role/department policies before real company use.
- We need structured server logging for all API routes.
- We need a migration naming convention.
- We need seed scripts for test data.
- We need feature modules added one at a time: Active Work, Personnel, Equipment, Operations Board.

## Refactoring strategy

1. Stabilize auth/profile creation.
2. Keep `/api/bootstrap` from crashing stale client code.
3. Add Jobs module.
4. Add Active Work module.
5. Add Personnel module.
6. Add Equipment module.
7. Add request history and audit events.
8. Harden RLS policies.
