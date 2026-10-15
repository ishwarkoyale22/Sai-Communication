-- Test fixture: a SCRATCH PostgreSQL 17 database that imitates the live Supabase project closely
-- enough to run the migrations and security tests. Never run this against a real project.
-- Everything below was read back from the live database on 2026-10-15 (columns, constraints,
-- policies, owner and ACLs), except where marked "simplified".

-- Roles (cluster-wide; created only if missing) ----------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator noinherit login; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then create role supabase_admin superuser login; end if;
end
$$;
grant anon, authenticated, service_role to authenticator;

-- auth schema (simplified) ------------------------------------------------------------------
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- public tables -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id),
  role text default 'staff' check (role = any (array['admin','staff'])),
  created_at timestamp without time zone default now()
);

create table public.customer_profiles (
  id uuid primary key references auth.users(id),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales (id uuid primary key default gen_random_uuid());   -- simplified

create table public.website_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  order_type text default 'product' check (order_type = any (array['product','gift','giveaway','hamper','mixed'])),
  total_amount numeric not null,
  payment_method text default 'cash',
  payment_status text default 'pending',
  order_status text default 'pending' check (order_status = any (array['pending','confirmed','processing','ready','delivered','cancelled'])),
  notes text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  coupon_code text,
  discount_amount numeric default 0,
  customer_id uuid references auth.users(id),
  sale_id uuid references public.sales(id) on delete set null,
  refund_status text not null default 'none' check (refund_status = any (array['none','pending','refunded'])),
  refund_amount numeric,
  refunded_at timestamptz,
  refund_method text,
  refund_reference text,
  refund_note text,
  gateway_name text,
  gateway_order_id text,
  gateway_payment_id text,
  payment_verified_at timestamptz
);
create unique index website_orders_gateway_order_id_key on public.website_orders (gateway_order_id) where gateway_order_id is not null;

create table public.website_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.website_orders(id) on delete cascade,
  item_type text check (item_type = any (array['product','hamper_item','refurbished','hamper_product'])),
  inventory_id uuid,
  hamper_item_id uuid,
  item_name text not null,
  quantity integer not null default 1 constraint website_order_items_quantity_positive check (quantity > 0),
  unit_price numeric not null constraint website_order_items_unit_price_nonneg check (unit_price >= 0),
  total_price numeric not null
);

-- helper functions exactly as live ----------------------------------------------------------
create function public.is_admin() returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  return exists (select 1 from profiles where id = auth.uid() and role = 'admin');
end;
$$;
create function public.is_staff() returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  return exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'));
end;
$$;
grant execute on function public.is_admin(), public.is_staff() to anon, authenticated, service_role;

-- RLS + policies exactly as live ------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "Users can create own profile" on public.profiles for insert to public with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to public using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can view own profile" on public.profiles for select to public using ((select auth.uid()) = id);
create policy profiles_admin_delete on public.profiles for delete to public using (is_admin());
create policy profiles_admin_insert on public.profiles for insert to public with check (is_admin());
create policy profiles_admin_update on public.profiles for update to public using (is_admin()) with check (is_admin());
create policy profiles_select on public.profiles for select to public using ((id = (select auth.uid())) or is_admin());

alter table public.customer_profiles enable row level security;

alter table public.website_orders enable row level security;
create policy "Anyone can place a website order" on public.website_orders for insert to anon, authenticated with check (true);
create policy website_orders_admin_delete on public.website_orders for delete to public using (is_admin());
create policy website_orders_admin_update on public.website_orders for update to public using (is_admin()) with check (is_admin());
create policy website_orders_select on public.website_orders for select to public using (
  (customer_id = (select auth.uid()))
  or (customer_phone = (select cp.phone from customer_profiles cp where cp.id = (select auth.uid())))
  or is_admin());

alter table public.website_order_items enable row level security;
create policy "Anyone can add items to their website order" on public.website_order_items for insert to anon, authenticated with check (true);
create policy "Customers read own order items" on public.website_order_items for select to authenticated using (
  exists (select 1 from website_orders o where o.id = website_order_items.order_id
          and ((o.customer_id = (select auth.uid()))
               or (o.customer_phone = (select cp.phone from customer_profiles cp where cp.id = (select auth.uid())))
               or is_admin())));

-- ACLs exactly as live (relacl) -------------------------------------------------------------
--   profiles            {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm}
--   website_orders      {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=ar}
--   website_order_items {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=ar}
-- (`grant all` on PostgreSQL 17 = the 8 privileges arwdDxtm, including MAINTAIN.)
revoke all on public.profiles, public.website_orders, public.website_order_items, public.customer_profiles, public.sales from public;
grant all on public.profiles to anon, authenticated;
grant all on public.website_orders to anon, authenticated;
grant all on public.website_order_items to anon, authenticated;
grant select, insert on public.website_orders to service_role;
grant select, insert on public.website_order_items to service_role;
grant select on public.customer_profiles to anon, authenticated;
