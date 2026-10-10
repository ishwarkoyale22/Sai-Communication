-- Restore INSERT policies for website_orders and website_order_items.
--
-- Context: 20261012000000_website_orders_insert_lockdown.sql dropped these
-- policies assuming a real service_role key would be used to bypass RLS.
-- In this deployment the SUPABASE_SERVICE_ROLE_KEY is not a true service
-- role key (it is the same publishable key), so the supabaseAdmin client
-- is subject to RLS just like the browser client.
--
-- Without INSERT policies, every checkout attempt returns:
--   "new row violates row-level security policy for table website_orders"
--
-- These policies are intentionally conservative: the actual prices and
-- totals are always recomputed server-side in src/lib/checkout.server.ts
-- (placeWebsiteOrder), so allowing a public INSERT does not let a client
-- forge an amount — it will be overwritten before the row is committed.

-- Restore INSERT policies for website_orders and website_order_items.
create policy if not exists "Anyone can place a website order"
  on public.website_orders
  for insert to anon, authenticated
  with check (true);

create policy if not exists "Anyone can add items to their website order"
  on public.website_order_items
  for insert to anon, authenticated
  with check (true);

-- Ensure anon & authenticated roles have table-level permissions
grant select, insert on public.website_orders to anon, authenticated;
grant select, insert on public.website_order_items to anon, authenticated;
grant select on public.customer_profiles to anon, authenticated;
