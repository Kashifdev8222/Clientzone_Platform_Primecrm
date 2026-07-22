-- ============================================================
-- Phase 2B — Deposits / payment methods
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL,              -- CryptoPay | LemuxionPay | DepositLink
  name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type)
);

CREATE INDEX IF NOT EXISTS payment_methods_tenant_idx ON public.payment_methods (tenant_id);

-- Extra columns on transactions for deposits
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS pay_currency text,
  ADD COLUMN IF NOT EXISTS price_currency text,
  ADD COLUMN IF NOT EXISTS network text,
  ADD COLUMN IF NOT EXISTS redirect_url text,
  ADD COLUMN IF NOT EXISTS invoice_address text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_methods FROM anon, authenticated;

-- Seed methods for apex-ai tenant
INSERT INTO public.payment_methods (tenant_id, type, name, is_enabled, config, sort_order)
SELECT t.id, 'CryptoPay', 'Crypto Pay', true,
  '{"mode":"mock","supportedCoins":["BTC","ETH","USDT","USDC"]}'::jsonb, 1
FROM public.tenants t WHERE t.slug = 'apex-ai'
ON CONFLICT (tenant_id, type) DO NOTHING;

INSERT INTO public.payment_methods (tenant_id, type, name, is_enabled, config, sort_order)
SELECT t.id, 'LemuxionPay', 'Lemuxion Pay', true,
  '{"mode":"mock","currencies":["USD","EUR","GBP","AUD"]}'::jsonb, 2
FROM public.tenants t WHERE t.slug = 'apex-ai'
ON CONFLICT (tenant_id, type) DO NOTHING;

INSERT INTO public.payment_methods (tenant_id, type, name, is_enabled, config, sort_order)
SELECT t.id, 'DepositLink', 'Card / Deposit Link', false,
  '{"mode":"mock"}'::jsonb, 3
FROM public.tenants t WHERE t.slug = 'apex-ai'
ON CONFLICT (tenant_id, type) DO NOTHING;

-- ============================================================
-- After run: push/redeploy API code, then Postman deposit folder
-- Admin can mark deposit COMPLETED → balance increases
-- ============================================================
