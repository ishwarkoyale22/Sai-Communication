-- Customer accounts: profiles, addresses, wishlist, returns, and linking
-- website_orders to a logged-in customer via Supabase Auth (auth.users).
-- Guest checkout keeps working unchanged — customer_id is nullable and
-- existing anon INSERT/SELECT policies on website_orders already cover
-- both anon and authenticated roles, so no policy change needed there.

-- ── customer_profiles — one row per auth.users id ──
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.customer_profiles TO authenticated;
GRANT ALL ON public.customer_profiles TO service_role;

CREATE POLICY "Users can view own profile" ON public.customer_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can create own profile" ON public.customer_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.customer_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── customer_addresses ──
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line text NOT NULL,
  city text,
  state text,
  pincode text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;

CREATE POLICY "Users manage own addresses" ON public.customer_addresses
  FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- ── wishlist_items ──
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, inventory_id)
);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;

CREATE POLICY "Users manage own wishlist" ON public.wishlist_items
  FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- ── return_requests ──
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.website_orders(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;

CREATE POLICY "Users view own return requests" ON public.return_requests
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Users create own return requests" ON public.return_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

-- ── Link orders to a logged-in customer (nullable — guest checkout keeps
--    working; existing anon/authenticated policies already cover both) ──
ALTER TABLE public.website_orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id);

-- ── Login by mobile number: resolve phone -> email without exposing the
--    rest of customer_profiles publicly. SECURITY DEFINER, returns only
--    an email or null. ──
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email::text
  FROM public.customer_profiles cp
  JOIN auth.users au ON au.id = cp.id
  WHERE cp.phone = p_phone
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;
