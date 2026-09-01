-- Allow the storefront (anon/authenticated, no login) to insert order line items
-- and an initial pending payment record when placing an order — mirrors the
-- existing "Anyone can place order" policy on public.orders.
GRANT INSERT ON public.order_items TO anon, authenticated;
CREATE POLICY "Anyone can add items to their order" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT INSERT ON public.payments TO anon, authenticated;
CREATE POLICY "Anyone can create a pending payment record" ON public.payments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
