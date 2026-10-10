-- Security hardening pass. No existing feature, route, table, or business
-- rule is removed or changed in behavior except where noted (PIN storage
-- becomes hashed, and PIN login gets a lockout after repeated failures).

-- 1) Lock the search_path on every function so a malicious schema/object
--    named like a built-in can't be shadowed in (CVE-class "search_path
--    hijack" on SECURITY DEFINER functions). Pure hardening, no behavior
--    change for any of these.
alter function public.update_updated_at() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.is_staff() set search_path = public;
alter function public.current_staff_id() set search_path = public;
alter function public.enforce_hamper_product_limit() set search_path = public;
alter function public.create_service_feedback_on_completion() set search_path = public;
alter function public.sync_inventory_stock_from_units() set search_path = public;
alter function public.validate_imei_uniqueness() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.validate_finance_status_transition() set search_path = public;
alter function public.hamper_sales_block_update() set search_path = public;
alter function public.leave_requests_validate() set search_path = public;
alter function public.is_valid_imei(text) set search_path = public;

-- 2) Move the pg_net extension out of the public schema (it has no business
--    being exposed on the public search_path / API surface).
create schema if not exists extensions;
do $$
begin
  alter extension pg_net set schema extensions;
exception when others then
  -- Some managed Postgres builds pin pg_net's schema; skip rather than fail
  -- the whole migration if relocation isn't permitted here.
  raise notice 'Could not relocate pg_net: %', sqlerrm;
end $$;

-- 3) IDOR fix: "Customers read own order items" didn't actually check
--    ownership — EXISTS(select 1 from website_orders o where o.id = ...)
--    is true for every order, so any authenticated customer could read the
--    line items of every other customer's order. Mirror the ownership
--    check already used on website_orders_select.
drop policy if exists "Customers read own order items" on public.website_order_items;
create policy "Customers read own order items" on public.website_order_items
  for select to authenticated
  using (
    exists (
      select 1 from website_orders o
      where o.id = website_order_items.order_id
        and (
          o.customer_id = (select auth.uid())
          or o.customer_phone = (select cp.phone from customer_profiles cp where cp.id = (select auth.uid()))
          or is_admin()
        )
    )
  );

-- 4) push_subscriptions had "ALL/true/true" for every role, so any
--    anonymous caller could list, edit, or delete every staff member's
--    push subscription (endpoint + encryption keys = can be used to spam
--    push notifications to that device, or silently break their alerts).
--    Subscribing has to stay open to anon/authenticated (staff don't carry
--    a Supabase auth.uid() in this app's PIN-session model), but reading or
--    tampering with existing rows should not be. The server already reads
--    these with the service-role client to actually send pushes, which
--    bypasses RLS, so this doesn't affect that flow.
drop policy if exists "push_subscriptions_all" on public.push_subscriptions;
create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert to anon, authenticated with check (true);
create policy "push_subscriptions_admin_manage" on public.push_subscriptions
  for all to public using (is_admin()) with check (is_admin());

-- 5) Staff PINs were stored and compared in plaintext. Hash them with
--    pgcrypto (bcrypt) so a database leak doesn't hand out every staff
--    member's literal login PIN. Login/registration/change-PIN behavior
--    for the user is identical; only the stored representation changes.
--    Existing 4-digit plaintext PINs are hashed in place; anything already
--    hashed (longer than 4 chars) is left untouched so this is safe to rerun.
update public.staff
set pin = extensions.crypt(pin, extensions.gen_salt('bf'))
where pin ~ '^[0-9]{4}$';

alter table public.staff
  add column if not exists failed_pin_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;

create or replace function public.staff_pin_login(p_phone text, p_pin text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff staff%rowtype;
begin
  select * into v_staff from staff where phone = p_phone and is_active = true;

  if v_staff.id is null then
    return json_build_object('success', false, 'error', 'Invalid phone or PIN');
  end if;

  if v_staff.locked_until is not null and v_staff.locked_until > now() then
    return json_build_object('success', false, 'error', 'Too many failed attempts. Try again later.');
  end if;

  if v_staff.pin is null or extensions.crypt(p_pin, v_staff.pin) <> v_staff.pin then
    update staff
    set failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where id = v_staff.id;
    return json_build_object('success', false, 'error', 'Invalid phone or PIN');
  end if;

  update staff set failed_pin_attempts = 0, locked_until = null where id = v_staff.id;

  return json_build_object(
    'success', true,
    'staff', json_build_object(
      'id', v_staff.id,
      'name', v_staff.name,
      'role', v_staff.role,
      'phone', v_staff.phone
    )
  );
end;
$function$;

create or replace function public.issue_staff_session(p_phone text, p_pin text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff staff%rowtype;
  v_token uuid;
begin
  select * into v_staff from staff where phone = p_phone and is_active = true;

  if v_staff.id is null then
    return json_build_object('success', false, 'error', 'Invalid phone or PIN');
  end if;

  if v_staff.locked_until is not null and v_staff.locked_until > now() then
    return json_build_object('success', false, 'error', 'Too many failed attempts. Try again later.');
  end if;

  if v_staff.pin is null or extensions.crypt(p_pin, v_staff.pin) <> v_staff.pin then
    update staff
    set failed_pin_attempts = failed_pin_attempts + 1,
        locked_until = case when failed_pin_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where id = v_staff.id;
    return json_build_object('success', false, 'error', 'Invalid phone or PIN');
  end if;

  update staff set failed_pin_attempts = 0, locked_until = null where id = v_staff.id;

  insert into staff_sessions (staff_id) values (v_staff.id) returning token into v_token;

  insert into staff_activity_log (staff_id, action, details)
  values (v_staff.id, 'login', json_build_object('phone', p_phone));

  return json_build_object(
    'success', true,
    'token', v_token,
    'staff', json_build_object('id', v_staff.id, 'name', v_staff.name, 'role', v_staff.role, 'phone', v_staff.phone)
  );
end;
$function$;

create or replace function public.staff_register(p_name text, p_phone text, p_email text, p_pin text, p_date_of_birth date default null, p_role text default 'sales')
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'Full name is required.');
  end if;
  if p_phone is null or length(trim(p_phone)) < 10 then
    return json_build_object('success', false, 'error', 'A valid mobile number is required.');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return json_build_object('success', false, 'error', 'Password must be a 4-digit PIN, matching how you will log in.');
  end if;
  if p_role not in ('technician', 'sales', 'receptionist') then
    return json_build_object('success', false, 'error', 'Please select a valid role.');
  end if;
  if exists (select 1 from staff where phone = trim(p_phone)) then
    return json_build_object('success', false, 'error', 'An account with this mobile number already exists.');
  end if;

  insert into staff (name, phone, email, pin, date_of_birth, role, is_active)
  values (trim(p_name), trim(p_phone), nullif(trim(p_email), ''), extensions.crypt(p_pin, extensions.gen_salt('bf')), p_date_of_birth, p_role, false)
  returning id into v_id;

  return json_build_object('success', true, 'staff_id', v_id);
end;
$function$;

create or replace function public.staff_change_pin(p_token uuid, p_current_pin text, p_new_pin text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff_id uuid := resolve_staff_session(p_token);
  v_pin text;
begin
  if p_new_pin !~ '^[0-9]{4}$' then
    return json_build_object('success', false, 'error', 'PIN must be exactly 4 digits.');
  end if;

  select pin into v_pin from staff where id = v_staff_id;

  if v_pin is null or extensions.crypt(p_current_pin, v_pin) <> v_pin then
    return json_build_object('success', false, 'error', 'Current PIN is incorrect.');
  end if;

  update staff set pin = extensions.crypt(p_new_pin, extensions.gen_salt('bf')) where id = v_staff_id;

  insert into staff_activity_log (staff_id, action, details) values (v_staff_id, 'pin_changed', '{}');

  return json_build_object('success', true);
end;
$function$;
