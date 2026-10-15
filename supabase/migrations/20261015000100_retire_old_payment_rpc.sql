-- Retire web_apply_payment_result(text, text, text).
--
-- It marks an order paid knowing only the gateway order id: it never compares the paid amount or
-- currency. It was replaced by web_apply_payment_result_v2 (amount + currency + status checked
-- inside the database, 20261014171542_checkout_rpc_functions.sql). Nothing in the application
-- calls the old one any more (verified by searching both repositories; only the generated
-- src/integrations/supabase/types.ts still lists it), but service_role could still execute it, so a
-- bug or a stolen service key could bypass the amount check. Dropping it removes that path.
--
-- Rollback: re-create it from supabase/migrations/20261011020000_razorpay_payments.sql (lines
-- 97-156: the function and its revoke/grant), then
--   grant execute on function public.web_apply_payment_result(text, text, text) to service_role;
-- Only do that if a deployed build still calls it.

drop function if exists public.web_apply_payment_result(text, text, text);

-- Post-condition: the amount-checking version must still be there, and the old one gone.
do $check$
begin
  if exists (select 1 from pg_catalog.pg_proc
              where pronamespace = 'public'::regnamespace and proname = 'web_apply_payment_result') then
    raise exception 'old web_apply_payment_result still exists';
  end if;
  if not exists (select 1 from pg_catalog.pg_proc
                  where pronamespace = 'public'::regnamespace and proname = 'web_apply_payment_result_v2') then
    raise exception 'web_apply_payment_result_v2 is missing - refusing to leave payments without an applier';
  end if;
end
$check$;
