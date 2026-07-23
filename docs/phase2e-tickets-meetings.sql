-- ============================================================
-- Phase 2E — Tickets + Meetings
-- Paste in Supabase → SQL Editor → Run (yourself)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_departments_tenant_idx
  ON public.ticket_departments (tenant_id, is_active);

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.ticket_departments(id),
  category text NOT NULL DEFAULT 'Other',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'New',
  -- New | Open | InProgress | Closed
  assigned_staff_id uuid REFERENCES public.staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_client_idx
  ON public.tickets (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS tickets_status_idx
  ON public.tickets (tenant_id, status);

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'client',
  -- client | staff
  author_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx
  ON public.ticket_comments (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  date timestamptz NOT NULL,
  meeting_period int NOT NULL DEFAULT 30,
  importance text NOT NULL DEFAULT 'normal',
  -- normal | urgent
  status text NOT NULL DEFAULT 'scheduled',
  -- scheduled | confirmed | canceled | completed
  is_user_confirmed boolean NOT NULL DEFAULT true,
  assigned_staff_id uuid REFERENCES public.staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meetings_client_idx
  ON public.meetings (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS meetings_date_idx
  ON public.meetings (tenant_id, date);

CREATE INDEX IF NOT EXISTS meetings_status_idx
  ON public.meetings (tenant_id, status);

ALTER TABLE public.ticket_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ticket_departments FROM anon, authenticated;
REVOKE ALL ON TABLE public.tickets FROM anon, authenticated;
REVOKE ALL ON TABLE public.ticket_comments FROM anon, authenticated;
REVOKE ALL ON TABLE public.meetings FROM anon, authenticated;

-- Default departments for tenant slug apex-ai
INSERT INTO public.ticket_departments (tenant_id, name, sort_order)
SELECT t.id, d.name, d.sort_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('Support', 1),
  ('Finance', 2),
  ('Verification', 3),
  ('Accounts', 4)
) AS d(name, sort_order)
WHERE t.slug = 'apex-ai'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_departments td
    WHERE td.tenant_id = t.id AND td.name = d.name
  );

-- ============================================================
-- After run: push API + redeploy, then test Postman folder 6
-- ============================================================
