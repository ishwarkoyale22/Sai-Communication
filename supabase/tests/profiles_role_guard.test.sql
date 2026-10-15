-- Regression tests for Migration C (20261015000000_profiles_role_guard.sql).
-- Chunks are separated by "-- @@ name"; each runs after seed.sql inside BEGIN ... ROLLBACK.
-- Ids: a1/a2 admins, st staff, c1/c2 shoppers (see seed.sql).

-- @@ customer cannot insert an admin profile for themselves
select test.expect('customer insert admin', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','admin')$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004', '%Not allowed to create profiles%');

-- @@ customer cannot insert a default (staff) profile either
select test.expect('customer insert default role', $q$insert into public.profiles(id) values ('a0000000-0000-0000-0000-000000000004')$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004', '%Not allowed to create profiles%');

-- @@ customer cannot use upsert to escalate
select test.expect('customer upsert admin', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','admin') on conflict (id) do update set role = 'admin'$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000004');

-- @@ staff cannot promote themselves
select test.expect('staff update own role', $q$update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000003', '%Not allowed to change roles%');
select test.assert('staff still staff', $q$select role = 'staff' from public.profiles where id = 'a0000000-0000-0000-0000-000000000003'$q$);

-- @@ staff can still update harmless columns on their own row
select test.expect('staff update created_at', $q$update public.profiles set created_at = now() where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000003');

-- @@ staff cannot change the profile id (impersonate an admin row)
select test.expect('staff change id', $q$update public.profiles set id = 'a0000000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000003', '%Profile id cannot be changed%');

-- @@ staff cannot delete profiles (RLS hides every row from DELETE)
select test.expect('staff delete', $q$delete from public.profiles where id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001')$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000003');
select test.assert('both rows still exist', $q$select count(*) = 2 from public.profiles where id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001')$q$);

-- @@ admin may create and promote profiles
select test.expect('admin insert staff profile', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','staff')$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.expect('admin promote staff', $q$update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('promotion applied', $q$select role = 'admin' from public.profiles where id = 'a0000000-0000-0000-0000-000000000003'$q$);

-- @@ the last admin cannot demote themselves
delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000002';
select test.expect('sole admin demotes self', $q$update public.profiles set role = 'staff' where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  '23514', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%Cannot remove the last admin%');
select test.assert('still admin', $q$select role = 'admin' from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'$q$);

-- @@ with two admins, an admin may demote themselves
select test.expect('admin demotes self (2 admins)', $q$update public.profiles set role = 'staff' where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');

-- @@ the last admin row cannot be deleted by an admin
delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000002';
select test.expect('delete last admin', $q$delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  '23514', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%Cannot remove the last admin%');

-- @@ a non-last admin row can be deleted
select test.expect('delete a non-last admin', $q$delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'$q$,
  null, 'authenticated', 'a0000000-0000-0000-0000-000000000001');

-- @@ one statement cannot demote every admin (forward row order: RLS re-checks is_admin() per row)
select test.expect('bulk demote, forward order', $q$update public.profiles set role = 'staff' where role = 'admin'$q$,
  '?', 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('at least one admin remains (forward row order)', $q$select count(*) >= 1 from public.profiles where role = 'admin'$q$);

-- @@ one statement cannot demote every admin (rows visited in the opposite order: the guard itself must stop it)
delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000001';
insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000001', 'admin');
select test.expect('bulk demote, reverse order', $q$update public.profiles set role = 'staff' where role = 'admin'$q$,
  '23514', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%Cannot remove the last admin%');
select test.assert('both admins intact', $q$select count(*) = 2 from public.profiles where role = 'admin'$q$);

-- @@ one statement cannot delete every admin (forward row order)
select test.expect('bulk delete, forward order', $q$delete from public.profiles where role = 'admin'$q$,
  '?', 'authenticated', 'a0000000-0000-0000-0000-000000000001');
select test.assert('at least one admin remains (forward row order)', $q$select count(*) >= 1 from public.profiles where role = 'admin'$q$);

-- @@ one statement cannot delete every admin (reverse row order)
delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000001';
insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000001', 'admin');
select test.expect('bulk delete, reverse order', $q$delete from public.profiles where role = 'admin'$q$,
  '23514', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%Cannot remove the last admin%');
select test.assert('both admins intact', $q$select count(*) = 2 from public.profiles where role = 'admin'$q$);
-- @@ admin demotion is refused outside READ COMMITTED | isolation=repeatable read
select test.expect('repeatable read demotion', $q$update public.profiles set role = 'staff' where id = 'a0000000-0000-0000-0000-000000000002'$q$,
  '55000', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%READ COMMITTED%');

-- @@ authenticated cannot truncate (grant revoked)
select test.expect('truncate without grant', $q$truncate public.profiles$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000001', 'permission denied%');

-- @@ even with TRUNCATE re-granted, the trigger blocks it
grant truncate on public.profiles to authenticated;
select test.expect('truncate with grant', $q$truncate public.profiles$q$,
  '42501', 'authenticated', 'a0000000-0000-0000-0000-000000000001', '%Not allowed to truncate profiles%');

-- @@ anon cannot read profiles at all
select test.expect('anon select', $q$select * from public.profiles$q$, '42501', 'anon', null, 'permission denied%');

-- @@ service_role may only manage staff profiles (test-only grant: live service_role has none on profiles)
grant select, insert, update, delete, truncate on public.profiles to service_role;
select test.expect('service insert staff', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','staff')$q$, null, 'service_role');
select test.expect('service insert admin', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000005','admin')$q$,
  '42501', 'service_role', null, '%service_role may only create staff profiles%');
select test.expect('service promote staff', $q$update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  '42501', 'service_role', null, '%may not change profile ids or roles%');
select test.expect('service demote admin', $q$update public.profiles set role = 'staff' where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  '42501', 'service_role', null, '%may not change profile ids or roles%');
select test.expect('service change id', $q$update public.profiles set id = 'a0000000-0000-0000-0000-000000000005' where id = 'a0000000-0000-0000-0000-000000000003'$q$,
  '42501', 'service_role');
select test.expect('service update non-role column', $q$update public.profiles set created_at = now() where id = 'a0000000-0000-0000-0000-000000000003'$q$, null, 'service_role');
select test.expect('service delete staff', $q$delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000003'$q$, null, 'service_role');
select test.expect('service delete admin', $q$delete from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'$q$,
  '42501', 'service_role', null, '%service_role may only delete staff profiles%');
select test.expect('service truncate', $q$truncate public.profiles$q$, '42501', 'service_role', null, '%Not allowed to truncate profiles%');

-- @@ break-glass roles (postgres, supabase_admin) keep full control by design
insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000004','admin');
select test.assert('postgres can create an admin', $q$select count(*) = 3 from public.profiles where role = 'admin'$q$);
select test.expect('supabase_admin creates admin', $q$insert into public.profiles(id, role) values ('a0000000-0000-0000-0000-000000000005','admin')$q$, null, 'supabase_admin');
update public.profiles set role = 'staff' where id in ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004');
select test.assert('postgres can demote down to one admin', $q$select count(*) = 1 from public.profiles where role = 'admin'$q$);
truncate public.profiles;
select test.assert('postgres can truncate', $q$select count(*) = 0 from public.profiles$q$);

-- @@ a SECURITY DEFINER function owned by postgres bypasses the guard (documented limitation)
create function public.zz_definer_promote(p uuid) returns void language sql security definer as $$ update public.profiles set role = 'admin' where id = p $$;
grant execute on function public.zz_definer_promote(uuid) to authenticated;
select test.expect('definer function promotes', $q$select public.zz_definer_promote('a0000000-0000-0000-0000-000000000003')$q$, null, 'authenticated', 'a0000000-0000-0000-0000-000000000004');
select test.assert('promotion went through (why future definer functions must check is_admin())', $q$select role = 'admin' from public.profiles where id = 'a0000000-0000-0000-0000-000000000003'$q$);

-- @@ customers have no profiles row and see nothing; staff see only their own row
select test.assert('shopper sees no profiles', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000004','select count(*) from public.profiles') = '0'$q$);
select test.assert('staff sees only own row', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000003','select count(*) from public.profiles') = '1'$q$);
select test.assert('admin sees all rows', $q$select test.scalar_as('authenticated','a0000000-0000-0000-0000-000000000001','select count(*) from public.profiles') = '3'$q$);
