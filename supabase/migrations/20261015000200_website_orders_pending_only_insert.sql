-- INTERIM hardening of public order inserts (safe while an older storefront build may still insert
-- orders with the public key).
--
-- Problem (verified read-only on live): "Anyone can place a website order" is
--   FOR INSERT TO anon, authenticated WITH CHECK (true)
-- so anybody holding the public key could POST an order straight to the REST API with
-- payment_status = 'paid', order_status = 'confirmed', a fake gateway id, a refund, a sale link...
--
-- This replaces it with a policy that only accepts what a genuinely NEW order looks like. The
-- checkout code of every build (old and new) inserts exactly that: payment_status 'pending',
-- order_status 'pending', no gateway fields. Signed-in admins keep full insert rights.
-- It does NOT stop a client from sending a wrong total or a made-up customer_id; that needs the
-- final lock-down (20261015000300_website_orders_service_role_only_insert.sql), which must wait
-- until no deployed build inserts orders with the public key.
--
-- website_order_items: its insert policy is left as it is (an item can only be attached to an
-- order id, which is an unguessable uuid, and the items table has quantity/price check constraints).
--
-- Rollback (restores the previous, insecure policy):
--   drop policy "Anyone can place a pending website order" on public.website_orders;
--   create policy "Anyone can place a website order" on public.website_orders
--     for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can place a website order" on public.website_orders;
drop policy if exists "Anyone can place a pending website order" on public.website_orders;

create policy "Anyone can place a pending website order"
  on public.website_orders
  for insert
  to anon, authenticated
  with check (
    public.is_admin()
    or (
      payment_status = 'pending'
      and order_status = 'pending'
      and gateway_name is null
      and gateway_order_id is null
      and gateway_payment_id is null
      and payment_verified_at is null
      and sale_id is null
      and refunded_at is null
      and refund_amount is null
      and coalesce(refund_status, 'none') = 'none'
      and total_amount >= 0
    )
  );

do $check$
begin
  if exists (select 1 from pg_catalog.pg_policies
              where schemaname = 'public' and tablename = 'website_orders'
                and cmd = 'INSERT' and with_check = 'true') then
    raise exception 'an unrestricted INSERT policy is still present on website_orders';
  end if;
end
$check$;
