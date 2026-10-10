-- ============================================================================
-- Complete Demo Data Seed for Sai Communication Storefront
-- Covers: Refurbished Phones, Gift Hampers, Offers/Coupons,
-- Customer Reviews, Store Gallery, Finance Partners, and Repair Enquiries
-- ============================================================================

-- 1. Refurbished Smartphones in inventory
INSERT INTO public.inventory (
  name,
  brand_id,
  model,
  category,
  product_type,
  price,
  original_price,
  stock,
  condition,
  grade,
  battery_health,
  warranty_months,
  specs,
  images,
  is_featured,
  is_active
) VALUES
  (
    'Apple iPhone 13 128GB Midnight (Refurbished)',
    'e06a397f-fc9b-4067-9d33-682560a290bd',
    'iPhone 13',
    'Smartphones',
    'refurbished',
    34999,
    59900,
    3,
    'excellent',
    'A+',
    92,
    6,
    '{"Storage": "128GB", "RAM": "4GB", "Color": "Midnight", "Chipset": "A15 Bionic", "Display": "6.1 Super Retina XDR"}',
    ARRAY['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=700&auto=format&fit=crop&q=80'],
    true,
    true
  ),
  (
    'Apple iPhone 12 64GB Blue (Refurbished)',
    'e06a397f-fc9b-4067-9d33-682560a290bd',
    'iPhone 12',
    'Smartphones',
    'refurbished',
    24999,
    49900,
    2,
    'good',
    'A',
    88,
    6,
    '{"Storage": "64GB", "RAM": "4GB", "Color": "Blue", "Chipset": "A14 Bionic", "Display": "6.1 OLED"}',
    ARRAY['https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=700&auto=format&fit=crop&q=80'],
    true,
    true
  ),
  (
    'Samsung Galaxy S22 5G 128GB Phantom Black (Refurbished)',
    'ec860770-75ea-445c-987c-a83040be8261',
    'Galaxy S22 5G',
    'Smartphones',
    'refurbished',
    27999,
    52999,
    4,
    'excellent',
    'A+',
    94,
    6,
    '{"Storage": "128GB", "RAM": "8GB", "Color": "Phantom Black", "Camera": "50MP Triple", "Display": "120Hz Dynamic AMOLED"}',
    ARRAY['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&auto=format&fit=crop&q=80'],
    true,
    true
  ),
  (
    'Realme GT Neo 3 150W 256GB Nitro Blue (Refurbished)',
    'e6733ec7-ff33-4b52-a303-b227d0b9b435',
    'GT Neo 3',
    'Smartphones',
    'refurbished',
    17999,
    36999,
    2,
    'good',
    'A',
    90,
    6,
    '{"Storage": "256GB", "RAM": "12GB", "Charging": "150W UltraDart", "Chipset": "Dimensity 8100"}',
    ARRAY['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&auto=format&fit=crop&q=80'],
    false,
    true
  )
ON CONFLICT DO NOTHING;

-- 2. Gift Hampers in hamper_items
INSERT INTO public.hamper_items (
  name,
  category,
  price,
  stock,
  image,
  is_active
) VALUES
  (
    'Executive Smart Power Combo Hamper',
    'Accessories Combo',
    1499,
    20,
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=700&auto=format&fit=crop&q=80',
    true
  ),
  (
    'Pro Audio & TWS Earbuds Festive Gift Box',
    'Audio Kit',
    1999,
    15,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
    true
  ),
  (
    'Ultimate Smartphone Care & Protection Kit',
    'Care Hamper',
    899,
    25,
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=700&auto=format&fit=crop&q=80',
    true
  ),
  (
    'Grand Festival Tech Delight Hamper',
    'Luxury Combo',
    2499,
    10,
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=700&auto=format&fit=crop&q=80',
    true
  )
ON CONFLICT DO NOTHING;

-- 3. Offers & Coupons in offers
INSERT INTO public.offers (
  title,
  description,
  offer_type,
  discount_value,
  coupon_code,
  display_mode,
  is_active
) VALUES
  (
    'Festive Welcome Voucher',
    'Flat ₹200 off on your first order. Use code WELCOME200 at checkout.',
    'coupon',
    200,
    'WELCOME200',
    'banner',
    true
  ),
  (
    'Sai Communication Special Discount',
    'Instant ₹500 off on any smartphone or combo above ₹15,000.',
    'coupon',
    500,
    'SAI500',
    'banner',
    true
  ),
  (
    'Diwali Festival Mega Smartphone Sale',
    'Exclusive discounts, 0% EMI and free accessory combo with every new 5G phone!',
    'percentage',
    10,
    NULL,
    'hero_banner',
    true
  )
ON CONFLICT DO NOTHING;

-- 4. Featured Customer Reviews in reviews
INSERT INTO public.reviews (
  customer_name,
  rating,
  review_text,
  source,
  is_featured
) VALUES
  (
    'Rohan Patil',
    5,
    'Best mobile store in Talegaon! Got my new Samsung 5G phone at competitive online prices. Quick data transfer service and free tempered glass installation.',
    'google',
    true
  ),
  (
    'Sneha Kulkarni',
    5,
    'Gave my iPhone for screen and battery replacement. They repaired it within 2 hours with crystal clear display quality! Transparent pricing and genuine advice.',
    'google',
    true
  ),
  (
    'Amit Shinde',
    5,
    'Purchased a refurbished iPhone in mint condition with 6 months warranty. Works flawlessly and saved more than ₹20,000. Highly recommended!',
    'google',
    true
  ),
  (
    'Pooja Deshmukh',
    5,
    'Got Bajaj Finance 0% EMI within 10 minutes for Vivo phone. Very helpful and polite service by Vijay sir and staff.',
    'google',
    true
  ),
  (
    'Ganesh More',
    5,
    'Sai Communication is our family trusted mobile store for over 10 years. Genuine warranty, fast repair, and honest advice every single time.',
    'google',
    true
  )
ON CONFLICT DO NOTHING;

-- 5. Store Gallery in gallery
INSERT INTO public.gallery (
  image_url,
  caption,
  sort_order
) VALUES
  (
    'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
    'Sai Communication Storefront & Accessories Display',
    1
  ),
  (
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop&q=80',
    'Latest 5G Smartphones & Brand Showcase',
    2
  ),
  (
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    'Specialized Chip-Level Mobile Repair Desk',
    3
  ),
  (
    'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80',
    'Customer Experience & Device Consultation Area',
    4
  )
ON CONFLICT DO NOTHING;

-- 6. Finance Partners in finance_partners
INSERT INTO public.finance_partners (
  name,
  description,
  logo_url,
  min_amount,
  max_amount,
  available_tenures,
  processing_fee_pct,
  is_active
) VALUES
  (
    'Bajaj Finserv',
    '0% Interest Easy EMI on all smartphones with instant approval.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80',
    5000,
    150000,
    '[3,6,9,12,18,24]'::jsonb,
    0,
    true
  ),
  (
    'HDB Financial Services',
    'Fast paperless consumer loans with minimal documentation.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80',
    5000,
    100000,
    '[3,6,9,12,18]'::jsonb,
    0,
    true
  ),
  (
    'IDFC FIRST Bank',
    'Flexible tenure digital EMI loans with zero down-payment options.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80',
    8000,
    150000,
    '[6,12,18,24]'::jsonb,
    0,
    true
  ),
  (
    'TVS Credit',
    'Affordable smartphone financing designed for all customers.',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80',
    5000,
    80000,
    '[3,6,9,12]'::jsonb,
    0,
    true
  )
ON CONFLICT DO NOTHING;

-- 7. Demo Repair Enquiry in repair_enquiries
INSERT INTO public.repair_enquiries (
  customer_name,
  phone,
  email,
  phone_brand,
  phone_model,
  problem_type,
  description,
  preferred_contact
) VALUES
  (
    'Suresh Gaikwad',
    '9876543210',
    'suresh.gaikwad@example.com',
    'Samsung',
    'Galaxy M31',
    'screen',
    'Screen cracked after drop, touch working partially',
    'phone'
  )
ON CONFLICT DO NOTHING;
