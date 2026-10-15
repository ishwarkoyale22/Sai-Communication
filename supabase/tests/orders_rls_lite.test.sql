-- Tests for 20261015000200_website_orders_pending_only_insert.sql (the interim policy).
-- State under test: public INSERT allowed ONLY for genuinely new (pending, unpaid) orders.
-- Ids: see seed.sql.

-- @@ anon cannot forge a paid order
select test.expect('anon insert paid', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_status) values ('T-1','x','9','100','paid')$q$,
  '42501', 'anon', null, 'new row violates row-level security%');

-- @@ anon cannot forge a confirmed order
select test.expect('anon insert confirmed', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, order_status) values ('T-2','x','9','100','confirmed')$q$,
  '42501', 'anon');

-- @@ anon cannot attach a gateway order / payment or mark it verified
select test.expect('anon insert with gateway order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('T-3','x','9','100','order_FAKE')$q$, '42501', 'anon');
select test.expect('anon insert with gateway payment', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_payment_id) values ('T-4','x','9','100','pay_FAKE')$q$, '42501', 'anon');
select test.expect('anon insert verified', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_verified_at) values ('T-5','x','9','100', now())$q$, '42501', 'anon');

-- @@ anon cannot link a sale or record a refund
insert into public.sales(id) values ('b0000000-0000-0000-0000-000000000001');
select test.expect('anon insert with sale', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, sale_id) values ('T-6','x','9','100','b0000000-0000-0000-0000-000000000001')$q$, '42501', 'anon');
select test.expect('anon insert refunded', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, refund_status, refund_amount, refunded_at, refund_method) values ('T-7','x','9','100','refunded','100', now(), 'cash')$q$, '42501', 'anon');

-- @@ anon cannot insert a negative total
select test.expect('anon negative total', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount) values ('T-8','x','9','-5')$q$, '42501', 'anon');

-- @@ an older storefront build can still place a normal order (anon and signed-in)
select test.expect('anon normal order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_status, order_status, payment_method) values ('T-9','x','9','100','pending','pending','cash')$q$, null, 'anon');
select test.expect('signed-in normal order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, customer_id) values ('T-10','x','9','100','a0000000-0000-0000-0000-000000000004')$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000004');

-- @@ a signed-in customer cannot forge a paid order either
select test.expect('authenticated insert paid', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_status) values ('T-11','x','9','100','paid')$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004');

-- @@ admins keep full insert rights
select test.expect('admin insert paid order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_status) values ('T-12','x','9','100','paid')$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');

-- @@ anon cannot change or remove orders, and cannot read them
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount) values ('T-13','x','9','100');
select test.expect('anon update', $q$update public.website_orders set payment_status = 'paid' where order_number = 'T-13'$q$, null, 'anon');
select test.expect('anon delete', $q$delete from public.website_orders where order_number = 'T-13'$q$, null, 'anon');
select test.assert('order untouched', $q$select payment_status = 'pending' from public.website_orders where order_number = 'T-13'$q$);
select test.assert('anon sees no orders', $q$select test.scalar_as('anon', null, 'select count(*) from public.website_orders') = '0'$q$);

-- @@ shoppers see only their own orders
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, customer_id) values
  ('T-14','x','9000000004','100','a0000000-0000-0000-0000-000000000004'),
  ('T-15','y','9000000005','100','a0000000-0000-0000-0000-000000000005');
select test.assert('shopper 1 sees only own order', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000004','select string_agg(order_number, '','') from public.website_orders') = 'T-14'$q$);

-- @@ interim limitation (documented): items can still be added by anon until the final lock-down
insert into public.website_orders(id, order_number, customer_name, customer_phone, total_amount) values ('c0000000-0000-0000-0000-000000000001','T-16','x','9','100');
select test.expect('anon adds item (interim)', $q$insert into public.website_order_items(order_id, item_type, item_name, quantity, unit_price, total_price) values ('c0000000-0000-0000-0000-000000000001','product','x',1,1,1)$q$, null, 'anon');
