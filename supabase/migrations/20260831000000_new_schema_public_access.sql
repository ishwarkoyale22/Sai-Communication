-- Public read/write access for the new storefront schema
-- (inventory, brands, hamper_items, offers, gallery, website_orders,
-- website_order_items, repair_enquiries, enquiries, reviews).
-- RLS is already enabled on all of these; no policies/grants exist yet,
-- so the storefront currently has zero access. This adds the minimum
-- needed for a public, unauthenticated storefront.

-- Public catalog reads
GRANT SELECT ON public.inventory TO anon, authenticated;
CREATE POLICY "Active inventory publicly viewable" ON public.inventory
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.brands TO anon, authenticated;
CREATE POLICY "Active brands publicly viewable" ON public.brands
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.hamper_items TO anon, authenticated;
CREATE POLICY "Active hamper items publicly viewable" ON public.hamper_items
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.offers TO anon, authenticated;
CREATE POLICY "Active offers publicly viewable" ON public.offers
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.gallery TO anon, authenticated;
CREATE POLICY "Gallery publicly viewable" ON public.gallery
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.reviews TO anon, authenticated;
CREATE POLICY "Featured reviews publicly viewable" ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_featured = true);

-- Checkout: place a website order
GRANT INSERT ON public.website_orders TO anon, authenticated;
CREATE POLICY "Anyone can place a website order" ON public.website_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT INSERT ON public.website_order_items TO anon, authenticated;
CREATE POLICY "Anyone can add items to their website order" ON public.website_order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Order tracking by phone number: customer enters their phone and sees
-- all matching orders. This necessarily allows anon SELECT on
-- website_orders (PostgREST needs a permissive policy to allow the
-- .eq('customer_phone', ...) filter to return rows) — same tradeoff as
-- any unauthenticated "track by phone" design: someone could still
-- query the table directly. Accepted per product decision.
GRANT SELECT ON public.website_orders TO anon, authenticated;
CREATE POLICY "Orders viewable for order tracking" ON public.website_orders
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.website_order_items TO anon, authenticated;
CREATE POLICY "Order items viewable for order tracking" ON public.website_order_items
  FOR SELECT TO anon, authenticated USING (true);

-- Repair enquiry form
GRANT INSERT ON public.repair_enquiries TO anon, authenticated;
CREATE POLICY "Anyone can submit a repair enquiry" ON public.repair_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Contact form
GRANT INSERT ON public.enquiries TO anon, authenticated;
CREATE POLICY "Anyone can submit a contact enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Realtime: add the three tables the storefront needs live updates on.
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_enquiries;
