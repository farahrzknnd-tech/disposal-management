# Disposal Management System

Focused MVP for debris/disposal workflow management: master data, Surat Jalan, batch, QS, SPK, tagihan, completion, dashboard, monitoring, reporting, and audit log.

## Stack
React 18, TypeScript, Vite, React Router, TanStack React Query, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL, Recharts, jsPDF, XLSX.

## Local Development
See `docs/LOCAL_SETUP.md`.

## Supabase Setup
See `docs/SUPABASE_SETUP.md`.

## Production Checklist
See `docs/PRODUCTION_CHECKLIST.md`.

## Security Notes
- Frontend uses Supabase anon/publishable key only.
- RLS and RPC functions are source of truth for authorization.
- Roles are `ADMIN`, `OPERATOR`, `VIEWER` in `public.profiles`.
- Do not commit `.env` or service-role keys.
