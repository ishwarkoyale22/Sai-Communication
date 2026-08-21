-- =============================================================
-- Sai Communication — Full Platform Schema Migration
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ADMIN_SESSIONS
CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours')
);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_sessions TO service_role;

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  address text,
  city text,
  pin_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
CREATE POLICY "Customers can self-register" ON public.customers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
CREATE POLICY "Brands publicly viewable" ON public.brands
  FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.brands (name, display_order) VALUES
  ('Samsung', 1), ('Apple', 2), ('Vivo', 3),
  ('Oppo', 4), ('Realme', 5), ('OnePlus', 6),
  ('Xiaomi', 7), ('Nokia', 8);

-- BRANCHES (INTERNAL)
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  contact_person text,
  phone text,
  opening_hours text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.branches TO service_role;

-- SUPPLIERS (INTERNAL)
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.suppliers TO service_role;

-- THIRD_PARTY_SOURCES (INTERNAL)
CREATE TABLE public.third_party_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text,
  contact_person text,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.third_party_sources ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.third_party_sources TO service_role;

-- FINANCE_PARTNERS
CREATE TABLE public.finance_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  min_amount numeric,
  max_amount numeric,
  available_tenures jsonb NOT NULL DEFAULT '[6,12,18,24]',
  processing_fee_pct numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_partners ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.finance_partners TO anon, authenticated;
GRANT ALL ON public.finance_partners TO service_role;
CREATE POLICY "Active finance partners viewable" ON public.finance_partners
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- DIRECT_PARTNERS (INTERNAL)
CREATE TABLE public.direct_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_partners ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.direct_partners TO service_role;

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  banner_image_url text,
  discount_text text,
  badge_text text,
  cta_label text DEFAULT 'Shop Now',
  cta_link text DEFAULT '/products',
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT ALL ON public.offers TO service_role;
CREATE POLICY "Active offers viewable" ON public.offers
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- PROMOTIONAL_POPUPS
CREATE TABLE public.promotional_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  image_url text,
  discount_text text,
  cta_label text DEFAULT 'View Offer',
  cta_link text DEFAULT '/offers',
  is_enabled boolean NOT NULL DEFAULT false,
  show_after_seconds int NOT NULL DEFAULT 3,
  session_frequency_hours int NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotional_popups ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.promotional_popups TO anon, authenticated;
GRANT ALL ON public.promotional_popups TO service_role;
CREATE POLICY "Enabled popup viewable" ON public.promotional_popups
  FOR SELECT TO anon, authenticated USING (is_enabled = true);

-- GALLERY_ITEMS
CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'photo',
  category text DEFAULT 'general',
  title text,
  url text NOT NULL,
  thumbnail_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT ALL ON public.gallery_items TO service_role;
CREATE POLICY "Active gallery items viewable" ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- REFURBISHED_PRODUCTS
CREATE TABLE public.refurbished_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  storage text,
  ram text,
  condition text NOT NULL DEFAULT 'good',
  condition_grade text,
  battery_health int,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  warranty text,
  description text,
  images jsonb NOT NULL DEFAULT '[]',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refurbished_products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.refurbished_products TO anon, authenticated;
GRANT ALL ON public.refurbished_products TO service_role;
CREATE POLICY "Available refurbished products viewable" ON public.refurbished_products
  FOR SELECT TO anon, authenticated USING (is_available = true);

-- GIFT_HAMPER_PRODUCTS
CREATE TABLE public.gift_hamper_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_hamper_products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.gift_hamper_products TO anon, authenticated;
GRANT ALL ON public.gift_hamper_products TO service_role;
CREATE POLICY "Available hamper products viewable" ON public.gift_hamper_products
  FOR SELECT TO anon, authenticated USING (is_available = true);

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_address text,
  order_type text NOT NULL DEFAULT 'direct',
  third_party_source_id uuid REFERENCES public.third_party_sources(id) ON DELETE SET NULL,
  third_party_reference text,
  payment_type text NOT NULL DEFAULT 'full',
  finance_partner_id uuid REFERENCES public.finance_partners(id) ON DELETE SET NULL,
  finance_tenure int,
  finance_down_payment numeric,
  finance_monthly_emi numeric,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  order_status text NOT NULL DEFAULT 'pending',
  delivery_type text NOT NULL DEFAULT 'collection',
  delivery_status text NOT NULL DEFAULT 'pending',
  source_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  destination_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
CREATE POLICY "Anyone can place order" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX idx_orders_type ON public.orders(order_type);
CREATE INDEX idx_orders_status ON public.orders(order_status);

-- ORDER_ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'product',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  refurbished_product_id uuid REFERENCES public.refurbished_products(id) ON DELETE SET NULL,
  gift_hamper_product_id uuid REFERENCES public.gift_hamper_products(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  variant_info jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.order_items TO service_role;

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'pending',
  payment_gateway text NOT NULL DEFAULT 'offline',
  transaction_id text,
  gateway_order_id text,
  gateway_payment_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'pending',
  gateway_response jsonb NOT NULL DEFAULT '{}',
  verified boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payments TO service_role;
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(payment_status);

-- BRANCH_INVENTORY (INTERNAL)
CREATE TABLE public.branch_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 0,
  reserved_quantity int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id, product_id),
  CONSTRAINT qty_non_negative CHECK (quantity >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_quantity >= 0),
  CONSTRAINT reserved_lte_qty CHECK (reserved_quantity <= quantity)
);
CREATE TRIGGER branch_inventory_updated_at BEFORE UPDATE ON public.branch_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.branch_inventory TO service_role;

-- PRODUCT_TRANSFERS (INTERNAL)
CREATE TABLE public.product_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  from_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  to_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  requested_by text,
  transfer_status text NOT NULL DEFAULT 'requested',
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transfer_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER product_transfers_updated_at BEFORE UPDATE ON public.product_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.product_transfers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.product_transfers TO service_role;

-- PRODUCT_SOURCES (INTERNAL)
CREATE TABLE public.product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  source_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  destination_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  purchase_date date,
  quantity int NOT NULL DEFAULT 1,
  purchase_cost numeric,
  invoice_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.product_sources TO service_role;

-- REPAIR_ENQUIRIES
CREATE TABLE public.repair_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  phone_brand text NOT NULL,
  phone_model text NOT NULL,
  problem_type text NOT NULL,
  description text,
  image_urls jsonb NOT NULL DEFAULT '[]',
  video_urls jsonb NOT NULL DEFAULT '[]',
  preferred_contact text NOT NULL DEFAULT 'phone',
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER repair_enquiries_updated_at BEFORE UPDATE ON public.repair_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.repair_enquiries ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.repair_enquiries TO anon, authenticated;
GRANT ALL ON public.repair_enquiries TO service_role;
CREATE POLICY "Anyone can submit repair enquiry" ON public.repair_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX idx_repair_status ON public.repair_enquiries(status);

-- Extend settings with new keys
INSERT INTO public.settings (key, value) VALUES
  ('logo_url', ''),
  ('hero_photo_url', ''),
  ('owner_name', 'Vijay Sir'),
  ('owner_intro', ''),
  ('owner_history', ''),
  ('owner_video_url', ''),
  ('owner_timeline', '[]'),
  ('youtube', ''),
  ('twitter', ''),
  ('repair_whatsapp_message', 'Hello, I would like to enquire about a mobile repair.'),
  ('product_whatsapp_message', 'Hello, I am interested in'),
  ('delivery_policy', ''),
  ('return_policy', ''),
  ('warranty_policy', '')
ON CONFLICT (key) DO NOTHING;

-- Additive columns on products (backward-compatible)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS finance_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
