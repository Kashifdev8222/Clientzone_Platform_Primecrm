-- ============================================================
-- Phase 2E.1 — Numeric TP numbers for existing trading accounts
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================
-- Assigns a random 11-digit TP into external_login when missing
-- or when it still looks like a UUID (portal was showing UUID as TP).

UPDATE public.trading_accounts
SET external_login = (
  '2' || lpad((floor(random() * 10000000000))::bigint::text, 10, '0')
)
WHERE external_login IS NULL
   OR external_login ~* '^[0-9a-f]{8}-[0-9a-f]{4}-';

-- Optional uniqueness check (safe to re-run if rare collision):
-- SELECT external_login, count(*) FROM trading_accounts
-- WHERE external_login IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
