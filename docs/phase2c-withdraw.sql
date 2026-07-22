-- ============================================================
-- Phase 2C — Withdraw + transaction sources
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transaction_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Withdrawal',
  source text NOT NULL DEFAULT 'Crypto',  -- Crypto | Bank | Other
  value text NOT NULL,                   -- label / address / account name
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transaction_sources_client_idx
  ON public.transaction_sources (tenant_id, client_id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_source_id uuid REFERENCES public.transaction_sources(id),
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS tp_number text;

ALTER TABLE public.transaction_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.transaction_sources FROM anon, authenticated;

-- ============================================================
-- After run: push API + redeploy, then test Postman withdraw folders
-- ============================================================
