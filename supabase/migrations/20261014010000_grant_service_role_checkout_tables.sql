-- Fix: grant service_role the same base-table privileges anon/authenticated already have on
-- the "new schema" checkout tables (introduced in 20260831000000_new_schema_public_access.sql),
-- which never explicitly granted anything to service_role.
--
-- Root cause (confirmed by live, boolean-only diagnostics — see chat history, not reproduced
-- here to avoid printing any key material):
--   * SUPABASE_SERVICE_ROLE_KEY now holds a REAL service_role key (previously it was an unset/
--     placeholder value, so src/lib/env-validation.ts's resolveSupabaseAdminKey() fell back to
--     the publishable key, which maps to the `anon` role — and `anon` already had these grants,
--     so checkout silently worked under the public role this whole time).
--   * service_role in Supabase bypasses Row Level Security (RLS) policies, but it does NOT
--     bypass plain PostgreSQL table-level GRANT/REVOKE privileges — those are a separate layer.
--   * A direct, masked REST probe against this project confirmed Postgres recognises the key
--     correctly as `service_role` (the error names that exact role) but returns 42501
--     "permission denied" for public.inventory, public.website_orders, public.hamper_items and
--     public.offers — because no migration ever ran `GRANT ... TO service_role` for them.
--   * src/lib/checkout.server.ts's supabaseAdmin (now correctly running AS service_role) reads
--     inventory/hamper_items/offers and inserts into website_orders/website_order_items directly
--     (not via a SECURITY DEFINER function), so it needs these grants itself.
--
-- This does not weaken any security check: service_role is the server's own privileged role,
-- already trusted with `GRANT ALL` on many other tables in this schema (see
-- 20260821000000_sai_full_schema.sql) and with EXECUTE on the service_role-only payment
-- functions in 20261011020000_razorpay_payments.sql. RLS policies on these tables are
-- unchanged; anon/authenticated privileges are unchanged.

GRANT SELECT ON public.inventory TO service_role;
GRANT SELECT ON public.hamper_items TO service_role;
GRANT SELECT ON public.offers TO service_role;
GRANT SELECT, INSERT ON public.website_orders TO service_role;
GRANT SELECT, INSERT ON public.website_order_items TO service_role;
