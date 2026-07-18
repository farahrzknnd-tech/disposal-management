# Supabase Setup

## Project
- Create Supabase project.
- Enable email/password authentication.
- Apply migrations in `supabase/migrations` in timestamp order.

## First ADMIN
1. Create user in Supabase Dashboard Authentication.
2. Open SQL editor.
3. Run:

```sql
update public.profiles
set role = 'ADMIN', updated_at = now()
where email = 'admin@example.com';
```

## Roles
- `ADMIN`: full MVP access, master data, deletes, audit log.
- `OPERATOR`: operational reads/writes for Surat Jalan, batch, SPK, tagihan.
- `VIEWER`: read-only dashboard, monitoring, reports.

## Types
If Supabase CLI is available:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > src/lib/database.types.ts
```

Current `src/lib/database.types.ts` is migration-derived placeholder, not remote-generated.
