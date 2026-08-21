INSERT INTO public.settings (key, value) VALUES
  ('shop_name','Sai Communication'),
  ('tagline','Mobile Phone Dealer & Repair Service — Since 2005'),
  ('address','Shop No. 30, P.L. Khandge Plaza, Near Saraswat Bank, Chakan–Talegaon Road, Talegaon Dabhade, Pune, Maharashtra – 410507'),
  ('phone','09845458942'),
  ('phone_alt','7507575755'),
  ('whatsapp','917507575755'),
  ('email',''),
  ('hours','Open all days: 10:00 AM - 10:00 PM'),
  ('established','2005'),
  ('years_in_business','21'),
  ('rating','4.7'),
  ('total_ratings','119'),
  ('verification','Justdial Verified'),
  ('city','Pune'),
  ('state','Maharashtra'),
  ('pin_code','410507'),
  ('maps_embed','https://www.google.com/maps?q=P.L.%20Khandge%20Plaza%2C%20Chakan-Talegaon%20Road%2C%20Talegaon%20Dabhade%2C%20Pune%2C%20Maharashtra%20410507&output=embed')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;