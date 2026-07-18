# Production Checklist

- Apply all migrations.
- Confirm `anon` has no business-table policies.
- Create first `ADMIN` profile.
- Verify email/password auth only.
- Store only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in frontend env.
- Confirm `.env` remains ignored by Git.
- Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Verify login, logout, refresh session restore, protected routes, role guards.
- Verify VIEWER cannot write via UI and RLS.
- Verify workflow buttons call RPC functions.
- Verify missing env shows config error screen.
- Review audit log access with ADMIN account.

## MVP Limitations
- Users are created from Supabase Dashboard.
- No user management UI.
- No MFA/SSO/social login.
- Supabase types should be regenerated from live project before production signoff.
