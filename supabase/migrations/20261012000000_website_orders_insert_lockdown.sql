-- website_orders/website_order_items INSERT policies had WITH CHECK (true)
-- for anon/authenticated — meaning anyone could POST directly to the
-- Supabase REST API and forge an order with any total_amount/unit_price,
-- bypassing whatever the checkout UI computed.
--
-- Dropping both policies with NO anon/authenticated replacement blocks that
-- direct path (RLS defaults to deny when no policy matches). It does not
-- affect the new placeWebsiteOrder server function (src/lib/checkout.server.ts),
-- which inserts using the service-role client (supabaseAdmin) — service_role
-- bypasses RLS entirely, independent of these policies, so guest checkout
-- (customer_id null, no Supabase Auth session) and logged-in checkout both
-- keep working exactly as before. No other policy on either table (SELECT,
-- UPDATE, DELETE) is touched.
drop policy if exists "Anyone can place a website order" on public.website_orders;
drop policy if exists "Anyone can add items to their website order" on public.website_order_items;
