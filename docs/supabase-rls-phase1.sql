-- ============================================================
-- Supabase: Fix UNRESTRICTED tables (Phase 1)
-- Paste this yourself in: Supabase → SQL Editor → New query → Run
-- Do NOT run from NestJS / Prisma automatically.
-- ============================================================
-- Goal:
--   Enable Row Level Security (RLS) on CRM tables so the
--   Supabase "anon" / public API cannot read/write them.
--   NestJS keeps working because it uses the Postgres
--   connection string (DATABASE_URL), not the anon key.
-- ============================================================

-- 1) Enable RLS on all CRM tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Optional: also lock migrations table from Data API
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- 2) Revoke privileges from anon + authenticated (PostgREST roles)
--    NestJS / Prisma still connect as the DB user in DATABASE_URL.
REVOKE ALL ON TABLE public.tenants FROM anon, authenticated;
REVOKE ALL ON TABLE public.clients FROM anon, authenticated;
REVOKE ALL ON TABLE public.trading_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.transactions FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;

-- 3) Do NOT add policies for anon/authenticated.
--    With RLS ON and no policies → public Data API cannot access rows.
--    Your NestJS API on Render is the only app entry point.

-- ============================================================
-- After running:
--   Table Editor should show RLS enabled (no red UNRESTRICTED).
--   Postman register/login/accounts should still work via Render URL.
-- ============================================================

-- VERIFY (optional):
-- SELECT relname AS table_name, relrowsecurity AS rls_enabled
-- FROM pg_class
-- WHERE relname IN (
--   'tenants','clients','trading_accounts','transactions','audit_logs','_prisma_migrations'
-- );
