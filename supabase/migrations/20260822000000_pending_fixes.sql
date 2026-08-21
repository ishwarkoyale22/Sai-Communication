-- =============================================================
-- Sai Communication - Pending Fixes Migration
-- Bucket creation & Settings Keys Expansion
-- =============================================================

-- 1. Storage bucket for repair media uploads (Images & Videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-media',
  'repair-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

-- 2. Storage bucket policies for repair-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access for repair-media'
  ) THEN
    CREATE POLICY "Public Access for repair-media"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'repair-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Upload for repair-media'
  ) THEN
    CREATE POLICY "Public Upload for repair-media"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'repair-media');
  END IF;
END $$;

-- 3. Upsert Settings table keys for Vijay Sir assets, store contacts, and URLs
INSERT INTO public.settings (key, value) VALUES
  ('vijay_sir_photo_url', ''),
  ('vijay_sir_video_url', ''),
  ('store_phone', '09845458942'),
  ('store_whatsapp', '917507575755'),
  ('store_email', 'contact@saicommunication.com'),
  ('store_address', 'Shop No. 30, P.L. Khandge Plaza, Near Saraswat Bank, Chakan-Talegaon Road, Talegaon Dabhade, Pune, Maharashtra - 410507'),
  ('store_hours', 'Open all days: 10:00 AM - 10:00 PM'),
  ('google_maps_embed_url', 'https://www.google.com/maps?q=P.L.%20Khandge%20Plaza%2C%20Chakan-Talegaon%20Road%2C%20Talegaon%20Dabhade%2C%20Pune%2C%20Maharashtra%20410507&output=embed'),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('youtube_url', ''),
  ('twitter_url', '')
ON CONFLICT (key) DO NOTHING;
