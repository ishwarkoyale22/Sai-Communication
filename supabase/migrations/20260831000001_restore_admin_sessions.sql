-- Restore the admin_sessions table. It's used by the app's password-based
-- admin login (createAdminSession/assertAdminSession in admin.server.ts) but
-- is missing from the current schema, so admin login is currently broken.
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours')
);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_sessions TO service_role;
-- No anon/authenticated policies: only the server (service role) touches
-- this table, matching the original design.
