-- The "no open return request" clause compared a row to itself
-- (r.order_id = r.order_id, always true) instead of to the order being
-- inserted against, so it checked "is there ANY open return request
-- anywhere in the table" rather than "on this order" — one open return
-- anywhere silently blocked every other customer's new return request.
-- Only this one comparison changes; ownership, delivered/collected status,
-- and the admin override are untouched.
drop policy if exists "return_requests_insert" on public.return_requests;
create policy "return_requests_insert" on public.return_requests
  for insert
  with check (
    (
      (select auth.uid()) = customer_id
      and exists (
        select 1 from website_orders o
        where o.id = return_requests.order_id
          and o.customer_id = (select auth.uid())
          and o.order_status = any (array['delivered', 'collected'])
      )
      and not exists (
        select 1 from return_requests r
        where r.order_id = return_requests.order_id
          and r.status = any (array['requested', 'approved'])
      )
    )
    or is_admin()
  );
