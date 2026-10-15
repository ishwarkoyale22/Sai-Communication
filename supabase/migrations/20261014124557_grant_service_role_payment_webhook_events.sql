-- REPOSITORY RECORD of a migration that is ALREADY APPLIED to the live database.
--   live version : 20261014124557   live name : grant_service_role_payment_webhook_events
-- It was applied by hand (not from the repo), so the repo had no file for it. This file exists so
-- the repository and the live migration history agree; the version number intentionally equals the
-- live one, so tools that compare versions treat it as already applied. It is idempotent: running
-- it again changes nothing. Do NOT run `supabase db push`.
--
-- Why it exists: service_role bypasses RLS but not table-level GRANTs, and payment_webhook_events
-- (created in 20261011020000_razorpay_payments.sql) had no grant for it, so the webhook returned 500.
-- Live ACL after this migration: {postgres=arwdDxtm/postgres,service_role=ar/postgres}

grant select, insert on public.payment_webhook_events to service_role;
