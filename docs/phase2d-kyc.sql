-- ============================================================
-- Phase 2D — KYC documents
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL,          -- Passport | CardFront | ProofOfResidency | General | ...
  description text,
  file_name text NOT NULL,
  mime_type text,
  file_size int,
  storage_path text NOT NULL,           -- Supabase Storage path OR local fallback key
  public_url text,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_documents_client_idx
  ON public.kyc_documents (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS kyc_documents_status_idx
  ON public.kyc_documents (tenant_id, status);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kyc_documents FROM anon, authenticated;

-- ============================================================
-- ALSO create Storage bucket (Supabase UI or SQL below):
-- Dashboard → Storage → New bucket → name: kyc-documents → Private
--
-- Or run (if storage schema available):
-- insert into storage.buckets (id, name, public)
-- values ('kyc-documents', 'kyc-documents', false)
-- on conflict (id) do nothing;
-- ============================================================
