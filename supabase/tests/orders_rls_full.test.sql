-- Tests for 20261015000300_website_orders_service_role_only_insert.sql (the final lock-down).
-- State under test: only the server (service_role / web_place_order) can create orders and items.

-- @@ anon and signed-in users cannot insert orders or items at all
select test.expect('anon insert order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount) values ('F-1','x','9','100')$q$,
  '42501', 'anon', null, 'permission denied%');
select test.expect('authenticated insert order', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount) values ('F-2','x','9','100')$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004', 'permission denied%');
insert into public.website_orders(id, order_number, customer_name, customer_phone, total_amount) values ('c0000000-0000-0000-0000-000000000001','F-3','x','9','100');
select test.expect('anon insert item', $q$insert into public.website_order_items(order_id, item_type, item_name, quantity, unit_price, total_price) values ('c0000000-0000-0000-0000-000000000001','product','x',1,1,1)$q$,
  '42501', 'anon', null, 'permission denied%');
select test.expect('authenticated insert item', $q$insert into public.website_order_items(order_id, item_type, item_name, quantity, unit_price, total_price) values ('c0000000-0000-0000-0000-000000000001','product','x',1,1,1)$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004', 'permission denied%');

-- @@ even a forged "paid" insert is impossible
select test.expect('anon forged paid', $q$insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, payment_status) values ('F-4','x','9','100','paid')$q$,
  '42501', 'anon');

-- @@ no INSERT policy remains and no client role holds INSERT/TRUNCATE
select test.assert('no insert policies', $q$select count(*) = 0 from pg_policies where schemaname='public' and tablename in ('website_orders','website_order_items') and cmd = 'INSERT'$q$);
select test.assert('anon has no privileges on orders', $q$select not has_table_privilege('anon','public.website_orders','SELECT') and not has_table_privilege('anon','public.website_orders','INSERT') and not has_table_privilege('anon','public.website_orders','UPDATE') and not has_table_privilege('anon','public.website_orders','DELETE') and not has_table_privilege('anon','public.website_orders','TRUNCATE')$q$);
select test.assert('authenticated cannot insert or truncate', $q$select not has_table_privilege('authenticated','public.website_orders','INSERT') and not has_table_privilege('authenticated','public.website_orders','TRUNCATE') and not has_table_privilege('authenticated','public.website_order_items','INSERT')$q$);
select test.assert('service_role can still insert', $q$select has_table_privilege('service_role','public.website_orders','INSERT') and has_table_privilege('service_role','public.website_order_items','INSERT')$q$);

-- @@ the server path works: web_place_order creates the order and its items together
select test.expect('service_role places an order', $q$select * from public.web_place_order(
  '{"id":"d0000000-0000-0000-0000-000000000001","order_number":"F-10","customer_name":"t","customer_phone":"9","total_amount":500}'::jsonb,
  '[{"item_type":"product","item_name":"x","quantity":2,"unit_price":250,"total_price":500}]'::jsonb)$q$, null, 'service_role');
select test.assert('order and item exist, order is pending', $q$select (select payment_status from public.website_orders where order_number = 'F-10') = 'pending' and (select count(*) from public.website_order_items where order_id = 'd0000000-0000-0000-0000-000000000001') = 1$q$);

-- @@ web_place_order is all-or-nothing
select test.expect('bad item rolls back the whole order', $q$select * from public.web_place_order(
  '{"id":"d0000000-0000-0000-0000-000000000002","order_number":"F-11","customer_name":"t","customer_phone":"9","total_amount":100}'::jsonb,
  '[{"item_type":"product","item_name":"x","quantity":0,"unit_price":100,"total_price":100}]'::jsonb)$q$, '23514', 'service_role');
select test.assert('no partial order left behind', $q$select count(*) = 0 from public.website_orders where order_number = 'F-11'$q$);
select test.expect('total must match items', $q$select * from public.web_place_order(
  '{"id":"d0000000-0000-0000-0000-000000000003","order_number":"F-12","customer_name":"t","customer_phone":"9","total_amount":1}'::jsonb,
  '[{"item_type":"product","item_name":"x","quantity":1,"unit_price":100,"total_price":100}]'::jsonb)$q$, '23514', 'service_role', null, '%do not add up%');
select test.expect('empty items rejected', $q$select * from public.web_place_order(
  '{"id":"d0000000-0000-0000-0000-000000000004","order_number":"F-13","customer_name":"t","customer_phone":"9","total_amount":0}'::jsonb, '[]'::jsonb)$q$, '*', 'service_role', null, '%Order has no items%');
select test.expect('an order cannot be forced to paid via web_place_order', $q$select * from public.web_place_order(
  '{"id":"d0000000-0000-0000-0000-000000000005","order_number":"F-14","customer_name":"t","customer_phone":"9","total_amount":100,"payment_status":"paid","order_status":"confirmed"}'::jsonb,
  '[{"item_type":"product","item_name":"x","quantity":1,"unit_price":100,"total_price":100}]'::jsonb)$q$, null, 'service_role');
select test.assert('still pending', $q$select payment_status = 'pending' and order_status = 'pending' from public.website_orders where order_number = 'F-14'$q$);

-- @@ clients cannot call the privileged functions
select test.expect('anon web_place_order', $q$select * from public.web_place_order('{}'::jsonb, '[]'::jsonb)$q$, '42501', 'anon', null, 'permission denied for function%');
select test.expect('authenticated web_place_order', $q$select * from public.web_place_order('{}'::jsonb, '[]'::jsonb)$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000001', 'permission denied for function%');

-- @@ admin portal paths still work: admins read and update orders; shoppers read only their own
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, customer_id) values
  ('F-20','x','9000000004','100','a0000000-0000-0000-0000-000000000004'),
  ('F-21','y','9000000005','100','a0000000-0000-0000-0000-000000000005');
select test.expect('admin updates an order', $q$update public.website_orders set order_status = 'confirmed' where order_number = 'F-20'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('update applied', $q$select order_status = 'confirmed' from public.website_orders where order_number = 'F-20'$q$);
select test.assert('admin sees both', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000001','select count(*) from public.website_orders') = '2'$q$);
select test.assert('shopper sees own only', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000004','select string_agg(order_number, '','') from public.website_orders') = 'F-20'$q$);
select test.expect('shopper cannot update', $q$update public.website_orders set payment_status = 'paid' where order_number = 'F-20'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.assert('payment_status unchanged', $q$select payment_status = 'pending' from public.website_orders where order_number = 'F-20'$q$);
select test.expect('anon select denied', $q$select * from public.website_orders$q$, '42501', 'anon', null, 'permission denied%');
