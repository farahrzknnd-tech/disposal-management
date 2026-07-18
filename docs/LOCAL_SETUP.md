# Local Setup

## Prerequisites
- Node.js 20+
- npm
- Supabase project

## Environment
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Never use a `service_role` key in Vite/frontend env.

## Commands
- Install: `npm ci`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm run test`
- Build: `npm run build`
