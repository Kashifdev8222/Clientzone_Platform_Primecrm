-- ============================================================
-- Phase 2A.1 — Client extra fields (PrimeCRM-compatible register)
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'bm',
  ADD COLUMN IF NOT EXISTS custom_fields text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_id text,
  ADD COLUMN IF NOT EXISTS business_unit_id text;

-- Optional: allow multiple accounts already supported by trading_accounts table.

COMMENT ON COLUMN public.clients.tags IS 'PrimeCRM-compatible [{ "id": "uuid" }]';
COMMENT ON COLUMN public.clients.notes IS 'PrimeCRM-compatible [{ "text": "..." }]';
