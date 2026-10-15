-- Tests for 20261015000050_profiles_drop_self_write_policies.sql (state: self-service policies gone).

-- @@ a signed-in user can no longer write their own profile row at all
select test.expect('staff self-update affects no row', $q$update public.profiles set created_at = now() where id = 'a0000000-0000-0000-0000-000000000003'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000003');
select test.expect('staff cannot self-promote (policy level)', $q$update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000003'$q$, '?', 'authenticated', 'a0000000-0000-0000-0000-000000000003');
select test.assert('still staff', $q$select role = 'staff' from public.profiles where id = 'a0000000-0000-0000-0000-000000000003'$q$);
select test.expect('shopper cannot create a profile', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','admin')$q$, '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004');

-- @@ reading your own profile (login) and admin management keep working
select test.assert('staff reads own row', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000003','select role from public.profiles') = 'staff'$q$);
select test.assert('admin reads all rows', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000001','select count(*) from public.profiles') = '3'$q$);
select test.expect('admin promotes staff', $q$update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000003'$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');