
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'Smartphones',
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  stock_status text NOT NULL DEFAULT 'in_stock',
  stock_qty integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly viewable" ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.enquiries TO anon, authenticated;
GRANT ALL ON public.enquiries TO service_role;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an enquiry" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are publicly viewable" ON public.settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.settings (key, value) VALUES
  ('shop_name','PhoneZone'),
  ('tagline','Your Trusted Mobile Store'),
  ('address','Shop No. 1, Main Road, Pune, Maharashtra 411001'),
  ('phone','+91 99999 99999'),
  ('whatsapp','919999999999'),
  ('email','hello@phonezone.in'),
  ('maps_embed','https://www.google.com/maps?q=Pune,Maharashtra&output=embed'),
  ('hours','Mon-Sat: 10:00 AM - 8:00 PM | Sun: 11:00 AM - 6:00 PM'),
  ('facebook','https://facebook.com'),
  ('instagram','https://instagram.com'),
  ('years_in_business','12'),
  ('happy_customers','25000');

INSERT INTO public.products (name, brand, category, price, original_price, stock_status, stock_qty, description, specs, images, is_featured) VALUES
('Galaxy S24 Ultra','Samsung','Smartphones',129999,134999,'in_stock',6,'Flagship Galaxy with titanium frame, S Pen and 200MP camera.','{"RAM":"12 GB","Storage":"256 GB","Camera":"200MP + 12MP + 10MP","Battery":"5000 mAh","Display":"6.8\" QHD+ AMOLED","Colors":"Titanium Black, Titanium Grey"}','["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80"]',true),
('iPhone 15 Pro','Apple','Smartphones',134900,139900,'in_stock',4,'A17 Pro chip, titanium design and pro camera system.','{"RAM":"8 GB","Storage":"256 GB","Camera":"48MP + 12MP + 12MP","Battery":"3274 mAh","Display":"6.1\" Super Retina XDR","Colors":"Natural, Blue, Black"}','["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80"]',true),
('iPhone 13','Apple','Smartphones',52999,59900,'in_stock',9,'Still a superb everyday iPhone with A15 Bionic.','{"RAM":"4 GB","Storage":"128 GB","Camera":"12MP + 12MP","Battery":"3240 mAh","Display":"6.1\" Super Retina XDR","Colors":"Midnight, Starlight, Blue"}','["https://images.unsplash.com/photo-1632661674596-618e45e68cf6?w=800&q=80"]',false),
('Galaxy A55 5G','Samsung','Smartphones',39999,42999,'in_stock',12,'Premium mid-range 5G with Super AMOLED display.','{"RAM":"8 GB","Storage":"128 GB","Camera":"50MP + 12MP + 5MP","Battery":"5000 mAh","Display":"6.6\" Super AMOLED 120Hz","Colors":"Navy, Lilac, Ice Blue"}','["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"]',true),
('Vivo V30 Pro','Vivo','Smartphones',41999,45999,'in_stock',7,'ZEISS portrait cameras and a slim curved design.','{"RAM":"8 GB","Storage":"256 GB","Camera":"50MP + 50MP + 50MP","Battery":"5000 mAh","Display":"6.78\" AMOLED","Colors":"Classic Black, Andaman Blue"}','["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80"]',false),
('Oppo Reno 11 5G','Oppo','Smartphones',29999,32999,'out_of_stock',0,'Portrait expert camera phone with fast charging.','{"RAM":"8 GB","Storage":"128 GB","Camera":"64MP + 32MP + 8MP","Battery":"5000 mAh","Display":"6.7\" AMOLED","Colors":"Wave Green, Rock Grey"}','["https://images.unsplash.com/photo-1567581935884-3349723552ca?w=800&q=80"]',false),
('Realme 12 Pro+','Realme','Smartphones',27999,29999,'in_stock',15,'Periscope telephoto camera at a value price.','{"RAM":"8 GB","Storage":"256 GB","Camera":"50MP + 64MP + 8MP","Battery":"5000 mAh","Display":"6.7\" Curved AMOLED","Colors":"Submarine Blue, Navigator Beige"}','["https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80"]',true),
('OnePlus 12R','OnePlus','Smartphones',39999,42999,'in_stock',5,'Snapdragon performance with 100W SUPERVOOC charging.','{"RAM":"8 GB","Storage":"128 GB","Camera":"50MP + 8MP + 2MP","Battery":"5500 mAh","Display":"6.78\" ProXDR 120Hz","Colors":"Cool Blue, Iron Gray"}','["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80"]',false),
('Redmi Note 13 Pro','Xiaomi','Smartphones',24999,26999,'in_stock',20,'200MP camera and a bright AMOLED display.','{"RAM":"8 GB","Storage":"128 GB","Camera":"200MP + 8MP + 2MP","Battery":"5100 mAh","Display":"6.67\" AMOLED 120Hz","Colors":"Midnight Black, Aurora Purple"}','["https://images.unsplash.com/photo-1533228100845-08145b01de14?w=800&q=80"]',false),
('Nokia 105 Classic','Nokia','Feature Phones',1499,1799,'in_stock',40,'Reliable keypad phone with long battery life.','{"RAM":"4 MB","Storage":"4 MB","Camera":"No","Battery":"1000 mAh","Display":"1.8\" QVGA","Colors":"Charcoal, Blue"}','["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"]',false),
('Galaxy Tab A9+','Samsung','Tablets',18999,20999,'in_stock',6,'Big-screen tablet for entertainment and study.','{"RAM":"8 GB","Storage":"128 GB","Camera":"8MP","Battery":"7040 mAh","Display":"11\" 90Hz LCD","Colors":"Graphite, Silver"}','["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80"]',false),
('Boat Airdopes 141','boAt','Accessories',1299,2990,'in_stock',35,'True wireless earbuds with 42H playback.','{"Type":"TWS Earbuds","Battery":"42 hours total","Bluetooth":"v5.1","Colors":"Black, White"}','["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80"]',false);
