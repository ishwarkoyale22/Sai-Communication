-- Sync verified business info from the live Justdial listing
-- (https://www.justdial.com/Pune/Sai-Communication-Near-Saraswat-Bank-Talegaon-Dabhade/...)
-- checked on 2026-08-26. Only updates values that were out of date; does not
-- touch anything else.
--
-- NOTE: this app's anon/publishable key cannot write to `settings` (RLS only
-- grants SELECT to anon/authenticated — INSERT/UPDATE is service_role only),
-- so this file could not be applied automatically. Run it against the
-- project's Supabase instance (e.g. `supabase db push`, or paste into the
-- SQL editor) to bring the live rating/review count in sync with Justdial.

INSERT INTO public.settings (key, value) VALUES
  ('rating', '4.8'),
  ('total_ratings', '234')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
