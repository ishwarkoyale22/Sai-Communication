-- Tests for the payment functions after 20261015000100_retire_old_payment_rpc.sql.
-- Seeded order: total 500.00 INR = 50000 paise, gateway order order_T1, status pending.

-- @@ the old amount-blind function is gone; the amount-checking one is the only applier
select test.assert('old web_apply_payment_result dropped', $q$select not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'web_apply_payment_result')$q$);
select test.assert('v2 exists', $q$select exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'web_apply_payment_result_v2')$q$);

-- @@ only service_role can execute the payment functions
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('P-1','t','9','500','order_T1');
select test.assert('execute grants', $q$select
  has_function_privilege('service_role','public.web_apply_payment_result_v2(text,text,text,bigint,text)','EXECUTE')
  and not has_function_privilege('anon','public.web_apply_payment_result_v2(text,text,text,bigint,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.web_apply_payment_result_v2(text,text,text,bigint,text)','EXECUTE')
  and not has_function_privilege('anon','public.web_place_order(jsonb,jsonb)','EXECUTE')
  and not has_function_privilege('authenticated','public.web_place_order(jsonb,jsonb)','EXECUTE')
  and has_function_privilege('service_role','public.web_place_order(jsonb,jsonb)','EXECUTE')$q$);
select test.expect('anon cannot mark paid', $q$select * from public.web_apply_payment_result_v2('order_T1','pay_X','paid',50000,'INR')$q$, '42501', 'anon', null, 'permission denied for function%');
select test.expect('authenticated cannot mark paid', $q$select * from public.web_apply_payment_result_v2('order_T1','pay_X','paid',50000,'INR')$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('still pending', $q$select payment_status = 'pending' from public.website_orders where order_number = 'P-1'$q$);

-- @@ a paid result needs the exact amount and currency
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('P-2','t','9','500','order_T1');
select test.assert('wrong amount is a mismatch', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_A','paid',100,'INR')) = 'mismatch'$q$);
select test.assert('wrong currency is a mismatch', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_B','paid',50000,'USD')) = 'mismatch'$q$);
select test.assert('missing amount is a mismatch', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_C','paid',null,'INR')) = 'mismatch'$q$);
select test.assert('missing currency is a mismatch', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_D','paid',50000,null)) = 'mismatch'$q$);
select test.assert('amount one paise too high is a mismatch', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_E','paid',50001,'INR')) = 'mismatch'$q$);
select test.assert('nothing changed by mismatches', $q$select payment_status = 'pending' and order_status = 'pending' and gateway_payment_id is null and payment_verified_at is null from public.website_orders where order_number = 'P-2'$q$);

-- @@ the correct payment is applied once; replays and late failures cannot change it
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('P-3','t','9','500','order_T1');
select test.assert('applied', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_OK','paid',50000,'inr')) = 'applied'$q$);
select test.assert('now paid and confirmed', $q$select payment_status = 'paid' and order_status = 'confirmed' and gateway_payment_id = 'pay_OK' and payment_verified_at is not null from public.website_orders where order_number = 'P-3'$q$);
select test.assert('replay is a no-op', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_OK','paid',50000,'INR')) = 'noop'$q$);
select test.assert('late failure cannot overwrite paid', $q$select (select payment_status from public.web_apply_payment_result_v2('order_T1','pay_LATE','failed',null,null)) = 'paid'$q$);
select test.assert('a different later payment id cannot overwrite either', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_OTHER','paid',50000,'INR')) = 'noop'$q$);
select test.assert('payment id unchanged', $q$select gateway_payment_id = 'pay_OK' from public.website_orders where order_number = 'P-3'$q$);

-- @@ failed payments can be retried: failed -> paid works, paid never goes back
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('P-4','t','9','500','order_T1');
select test.assert('failure recorded', $q$select (select payment_status from public.web_apply_payment_result_v2('order_T1','pay_F1','failed',null,null)) = 'failed'$q$);
select test.assert('order still open for retry', $q$select order_status = 'pending' from public.website_orders where order_number = 'P-4'$q$);
select test.assert('retry succeeds', $q$select (select result from public.web_apply_payment_result_v2('order_T1','pay_F2','paid',50000,'INR')) = 'applied'$q$);
select test.assert('final state paid', $q$select payment_status = 'paid' from public.website_orders where order_number = 'P-4'$q$);

-- @@ bad input
insert into public.website_orders(order_number, customer_name, customer_phone, total_amount, gateway_order_id) values ('P-5','t','9','500','order_T1');
select test.expect('invalid status', $q$select * from public.web_apply_payment_result_v2('order_T1','pay_X','refunded',50000,'INR')$q$, '*', 'service_role', null, '%Invalid payment status%');
select test.expect('unknown gateway order', $q$select * from public.web_apply_payment_result_v2('order_NOPE','pay_X','paid',50000,'INR')$q$, '*', 'service_role', null, '%No order found%');

-- @@ other payment helpers stay service_role-only
insert into public.website_orders(id, order_number, customer_name, customer_phone, total_amount) values ('e0000000-0000-0000-0000-000000000001','P-6','t','9','500');
select test.expect('anon web_get_order_for_payment', $q$select * from public.web_get_order_for_payment('e0000000-0000-0000-0000-000000000001')$q$, '42501', 'anon');
select test.expect('anon web_set_order_gateway', $q$select * from public.web_set_order_gateway('e0000000-0000-0000-0000-000000000001','razorpay','order_X')$q$, '42501', 'anon');
