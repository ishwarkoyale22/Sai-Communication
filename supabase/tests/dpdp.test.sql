-- Tests for 20261011010000_dpdp_compliance.sql + 20261015000400_dpdp_hardening.sql.

-- @@ the consent and data-rights tables exist
select test.assert('tables exist', $q$select to_regclass('public.consent_records') is not null and to_regclass('public.data_rights_requests') is not null$q$);

-- @@ anyone can record a consent decision, with server-side timestamp and policy version
select test.expect('anon consent insert', $q$insert into public.consent_records(full_name, phone, email, purpose, granted, source_page) values ('Test','9000000001',null,'order_processing',true,'checkout')$q$, null, 'anon');
select test.expect('signed-in consent insert', $q$insert into public.consent_records(phone, purpose, granted, source_page) values ('9000000004','marketing_communications',false,'checkout')$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.assert('timestamp and version were filled in', $q$select count(*) = 2 and bool_and(created_at <= now() and created_at > now() - interval '1 minute') and bool_and(policy_version = '2026-10-11') from public.consent_records$q$);

-- @@ the public endpoint cannot be used to read, change or delete the audit trail
insert into public.consent_records(phone, purpose, granted, source_page) values ('9000000001','order_processing',true,'checkout');
select test.expect('anon select', $q$select * from public.consent_records$q$, '42501', 'anon', null, 'permission denied%');
select test.expect('anon update', $q$update public.consent_records set granted = false$q$, '42501', 'anon');
select test.expect('anon delete', $q$delete from public.consent_records$q$, '42501', 'anon');
select test.expect('authenticated update', $q$update public.consent_records set granted = false$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.expect('authenticated delete', $q$delete from public.consent_records$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.assert('a shopper sees no consent rows (admin-only)', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000004','select count(*) from public.consent_records') = '0'$q$);
select test.assert('an admin sees the audit trail', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000001','select count(*) from public.consent_records') = '1'$q$);
select test.assert('row still granted', $q$select granted from public.consent_records$q$);

-- @@ validation: unknown purpose, oversized fields, future timestamps
select test.expect('unknown purpose', $q$insert into public.consent_records(purpose, granted, source_page) values ('sell_my_data',true,'x')$q$, '23514', 'anon');
select test.expect('oversized name', $q$insert into public.consent_records(full_name, purpose, granted, source_page) values (repeat('x',201),'order_processing',true,'checkout')$q$, '23514', 'anon');
select test.expect('oversized phone', $q$insert into public.consent_records(phone, purpose, granted, source_page) values (repeat('9',21),'order_processing',true,'checkout')$q$, '23514', 'anon');
select test.expect('missing granted flag', $q$insert into public.consent_records(purpose, source_page) values ('order_processing','checkout')$q$, '23502', 'anon');
select test.expect('future timestamp', $q$insert into public.consent_records(created_at, purpose, granted, source_page) values (now() + interval '2 days','order_processing',true,'checkout')$q$, '23514', 'anon');

-- @@ data-rights requests: public intake only, admin triage
select test.expect('anon request insert', $q$insert into public.data_rights_requests(full_name, phone, request_type, details) values ('T','9000000001','erasure','please')$q$, null, 'anon');
insert into public.data_rights_requests(full_name, phone, request_type) values ('T','9000000001','access');
select test.expect('anon request select', $q$select * from public.data_rights_requests$q$, '42501', 'anon', null, 'permission denied%');
select test.expect('anon request update', $q$update public.data_rights_requests set status = 'resolved'$q$, '42501', 'anon');
select test.assert('shopper sees no requests', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000004','select count(*) from public.data_rights_requests') = '0'$q$);
select test.expect('shopper update changes nothing', $q$update public.data_rights_requests set status = 'resolved'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.assert('still open', $q$select status = 'open' from public.data_rights_requests$q$);
select test.expect('admin triages', $q$update public.data_rights_requests set status = 'in_progress'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('triage applied', $q$select status = 'in_progress' from public.data_rights_requests$q$);
select test.expect('invalid request type', $q$insert into public.data_rights_requests(full_name, phone, request_type) values ('T','9','steal')$q$, '23514', 'anon');
select test.expect('oversized details', $q$insert into public.data_rights_requests(full_name, phone, request_type, details) values ('T','9','access',repeat('x',4001))$q$, '23514', 'anon');
