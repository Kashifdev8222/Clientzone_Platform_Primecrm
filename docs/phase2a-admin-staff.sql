-- ============================================================
-- Phase 2A: Admin staff + password reset tokens
-- Paste in Supabase → SQL Editor → Run (yourself)
-- Agent will NOT run this against your DB.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  email text NOT NULL,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  -- roles: super_admin | admin | agent | finance | kyc
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS staff_users_tenant_id_idx ON public.staff_users (tenant_id);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_type text NOT NULL, -- client | staff
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON public.password_reset_tokens (tenant_id, user_type, user_id);

-- RLS (same pattern as Phase 1)
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.staff_users FROM anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;

-- Default admin for tenant slug apex-ai
-- Email: admin@apex.ai
-- Password: Admin@12345
-- (bcrypt hash below — change password after first login)
INSERT INTO public.staff_users (
  tenant_id, email, password_hash, first_name, last_name, role, is_active
)
SELECT
  t.id,
  'admin@apex.ai',
  '$2b$12$4QxEj/bHth7.nuKXVzGXKedaLOc6K/3baZ/vTQj2niMtf4ayCfEKu',
  'Apex',
  'Admin',
  'admin',
  true
FROM public.tenants t
WHERE t.slug = 'apex-ai'
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ============================================================
-- After run:
-- 1) Confirm tables staff_users + password_reset_tokens exist
-- 2) Confirm one admin row in staff_users
-- 3) Tell developer → they will prisma generate / deploy code
-- 4) Postman: POST /api/v1/admin/auth/login
-- ============================================================
