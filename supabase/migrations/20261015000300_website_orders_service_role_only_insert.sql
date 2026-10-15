-- FINAL lock-down of order writes: ONLY the server (service_role, via web_place_order) may create
-- orders and items. HOLD: do NOT apply until every deployed storefront build places orders through
-- the server function with a REAL service-role key. An older build that still inserts with the
-- public key would stop being able to take orders the moment this runs.
--   Before applying, confirm (not possible from this repo alone):
--     1. the production deployment runs the build that uses web_place_order, and
--     2. its SUPABASE_SERVICE_ROLE_KEY is a real key (checkout works on that deployment).
--
-- What it does
--   * drops the public INSERT policies on website_orders and website_order_items;
--   * anon loses ALL privileges on both tables (every read goes through SECURITY DEFINER RPCs such
--     as web_track_orders, or authenticated + RLS);
--   * authenticated keeps what the admin portal and customer account pages use
--     (website_orders: SELECT/UPDATE/DELETE under the existing is_admin()/owner policies;
--      website_order_items: SELECT) and loses INSERT, TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
--     (and UPDATE/DELETE on items, which no policy permits anyway);
--   * service_role is unchanged (SELECT, INSERT).
--
-- PRE-FLIGHT GATE (do not weaken): aborts unless the ACLs equal the baseline READ FROM LIVE on
-- 2026-10-15, so the rollback below is exact:
--   website_orders / website_order_items relacl =
--     {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=ar/postgres}
-- and there are no column-level ACLs. It runs as ONE transaction.
--
-- ROLLBACK (exact; returns to the state after 20261015000200_website_orders_pending_only_insert.sql):
--   grant select, insert, update, delete, truncate, references, trigger, maintain on public.website_orders to anon;
--   grant select, insert, update, delete, truncate, references, trigger, maintain on public.website_order_items to anon;
--   grant insert, truncate, references, trigger, maintain on public.website_orders to authenticated;
--   grant insert, update, delete, truncate, references, trigger, maintain on public.website_order_items to authenticated;
--   create policy "Anyone can place a pending website order" on public.website_orders for insert
--     to anon, authenticated with check (<same expression as in 20261015000200>);
--   create policy "Anyone can add items to their website order" on public.website_order_items
--     for insert to anon, authenticated with check (true);

do $gate$
declare
  r record;
  v_got text;
  v_odd int;
  v_col int;
  c_all constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
begin
  for r in
    select * from (values
      ('public.website_orders'::regclass, 'anon', c_all),
      ('public.website_orders'::regclass, 'authenticated', c_all),
      ('public.website_orders'::regclass, 'service_role', 'INSERT,SELECT'),
      ('public.website_order_items'::regclass, 'anon', c_all),
      ('public.website_order_items'::regclass, 'authenticated', c_all),
      ('public.website_order_items'::regclass, 'service_role', 'INSERT,SELECT')
    ) t(rel, grantee, expected)
  loop
    select coalesce(string_agg(a.privilege_type, ',' order by a.privilege_type), 'none') into v_got
    from pg_catalog.pg_class c
    cross join lateral pg_catalog.aclexplode(c.relacl) a
    join pg_catalog.pg_roles ro on ro.oid = a.grantee
    where c.oid = r.rel and ro.rolname = r.grantee;

    select count(*) into v_odd
    from pg_catalog.pg_class c
    cross join lateral pg_catalog.aclexplode(c.relacl) a
    join pg_catalog.pg_roles ro on ro.oid = a.grantee
    where c.oid = r.rel and ro.rolname = r.grantee and (a.is_grantable or a.grantor <> c.relowner);

    select count(*) into v_col
    from pg_catalog.pg_attribute att
    where att.attrelid = r.rel and att.attnum > 0 and not att.attisdropped and att.attacl is not null;

    if v_got is distinct from r.expected or v_odd <> 0 or v_col <> 0 then
      raise exception using errcode = '55000', message = format(
        '%s ACL for %s differs from the reviewed baseline (got %s, expected %s; grant-option/foreign-grantor entries=%s; column ACL entries=%s). '
        'The rollback would not restore it exactly - review before applying.',
        r.rel::text, r.grantee, v_got, r.expected, v_odd, v_col);
    end if;
  end loop;
end
$gate$;

drop policy if exists "Anyone can place a website order" on public.website_orders;
drop policy if exists "Anyone can place a pending website order" on public.website_orders;
drop policy if exists "Anyone can add items to their website order" on public.website_order_items;

revoke all on public.website_orders from anon;
revoke all on public.website_order_items from anon;
revoke insert, truncate, references, trigger, maintain on public.website_orders from authenticated;
revoke insert, update, delete, truncate, references, trigger, maintain on public.website_order_items from authenticated;

do $check$
begin
  if exists (select 1 from pg_catalog.pg_policies
              where schemaname = 'public' and tablename in ('website_orders', 'website_order_items')
                and cmd = 'INSERT') then
    raise exception 'an INSERT policy is still present on the order tables';
  end if;
  if pg_catalog.has_table_privilege('anon', 'public.website_orders', 'INSERT')
     or pg_catalog.has_table_privilege('anon', 'public.website_order_items', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.website_orders', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.website_order_items', 'INSERT') then
    raise exception 'a client role can still INSERT into the order tables';
  end if;
  if not pg_catalog.has_table_privilege('service_role', 'public.website_orders', 'INSERT')
     or not pg_catalog.has_table_privilege('service_role', 'public.website_order_items', 'INSERT') then
    raise exception 'service_role lost INSERT on the order tables';
  end if;
end
$check$;
