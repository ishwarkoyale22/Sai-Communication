-- Website "Share Your Experience" form: let visitors submit a review.
-- RLS already allows anon SELECT of featured reviews (see
-- 20260831000000_new_schema_public_access.sql) but there was no INSERT
-- policy, so customer-submitted reviews were rejected with
-- "new row violates row-level security policy for table reviews".
-- New submissions still land with is_featured = false by default, so an
-- admin has to feature them before they show up in the public carousel.
GRANT INSERT ON public.reviews TO anon, authenticated;
CREATE POLICY "Anyone can submit a review" ON public.reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);
