# MVP Hardening Plan

## Current State
- React/Vite frontend talks directly to Supabase with anon key.
- `src/lib/supabase.ts` creates client without typed env validation and disables session persistence.
- `src/App.tsx` has protected product routes but no login, auth guard, unauthorized, or not-found route.
- Initial migration enables broad `anon`/`authenticated` policies on business tables.
- Audit log contains browser-writable actor fields and app code can hardcode user names.
- Workflow statuses are scattered across components and SQL using Indonesian display strings.
- Multi-table batch/SPK/tagihan flows run from browser code.
- Duplicate/generated build files exist: `vite.config.js`, `vite.config.d.ts`, `*.tsbuildinfo`, `tsconfig 2.json`.
- Build script exists; lint/typecheck/test scripts and Vitest setup are missing.

## Risks
- Anonymous users can read or mutate business data if unsafe policies are applied.
- Missing env vars can cause blank screens or obscure runtime failures.
- Partial workflow updates can leave batch, surat jalan, and SPK data inconsistent.
- UI-only authorization can be bypassed without RLS and RPC checks.
- Legacy status values can break dashboard counts, filters, and reports.
- Audit entries can be spoofed by browser clients.

## Locked Scope
- Add email/password Supabase auth only.
- Use roles: `ADMIN`, `OPERATOR`, `VIEWER`.
- Harden RLS with profile-backed role checks.
- Normalize workflow statuses to stable machine values.
- Move critical multi-table workflows to PostgreSQL RPC functions.
- Replace spoofable audit writes with authenticated DB helpers/triggers.
- Add env validation, error boundary, route guards, not-found and unauthorized pages.
- Add minimal high-value tests and production docs.

## File-Level Implementation Plan
- `src/lib/env.ts`: typed Vite env validation.
- `src/lib/supabase.ts`: `createClient<Database>` with persisted auth sessions.
- `src/lib/database.types.ts`: migration-derived Supabase types placeholder.
- `src/lib/status.ts`: shared status constants, labels, and legacy mapping.
- `src/lib/auth.tsx`: session/profile provider and permission helpers.
- `src/components/auth/RequireAuth.tsx`: protected route guard.
- `src/components/auth/RequireRole.tsx`: role guard for admin-only routes.
- `src/components/common/ErrorBoundary.tsx`: app error fallback.
- `src/pages/Login.tsx`, `src/pages/Unauthorized.tsx`, `src/pages/NotFound.tsx`, `src/pages/ConfigError.tsx`: auth and error pages.
- Existing pages/hooks/services: replace scattered workflow statuses and use RPC wrappers where practical.
- `supabase/migrations/*_mvp_hardening.sql`: additive profiles, RLS, constraints, status normalization, RPC, audit hardening.
- `package.json`, `vitest.config.ts`, tests under `src/**/*.test.tsx?`: quality commands and required tests.
- Docs: setup, Supabase, production checklist, README refresh.

## Migration Plan
- Create `profiles` tied to `auth.users` with role constraint.
- Add role helper functions using `auth.uid()`.
- Normalize existing legacy statuses into new values before adding constraints.
- Revoke/drop broad anon policies and add role-aware policies.
- Add safe numeric, uniqueness, role, and status constraints after normalization.
- Add audit helper/trigger functions that derive user from `auth.uid()`.
- Add RPC functions: send batch to QS, issue SPK, complete SPK workflow, cancel batch.

## Test Plan
- Env validation accepts complete config and rejects missing config.
- Auth guard protects private routes and allows authenticated users.
- Role guard blocks insufficient roles.
- Status mapping normalizes legacy labels.
- Workflow client calls correct RPC boundary.
- Error boundary renders fallback.

## Acceptance Criteria
- Missing env shows clear configuration screen.
- Login/logout/session restore work with Supabase Auth.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated users are redirected away from `/login`.
- Layout shows current user email and role.
- `anon` cannot access business tables under new RLS.
- Roles enforce MVP permissions in RLS and UI.
- Legacy statuses are preserved by mapping and normalized in DB.
- Critical workflows use RPC and reject invalid transitions.
- Audit actor derives from authenticated user.
- `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` are runnable.

## Out Of Scope
- Separate backend, social login, MFA, registration UI, user management UI, notifications, mobile/offline, AI, advanced analytics, multi-tenant model, granular permission matrix, framework migration, and full redesign.
