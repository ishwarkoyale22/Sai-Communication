-- Additive-only migration for two admin features from the software audit:
--   1. Customer birthday reminders — needs a way to know whether *this
--      year's* birthday for a customer has already been followed up on.
--   2. Gift Hamper -> Offer linkage — a hamper can have one offer attached
--      (e.g. "10% off this hamper"), shown on the admin Gift Hampers page.
-- Both are nullable additions to existing tables: no rename, no drop, no
-- change to any existing row's data, no new table.

alter table public.customers
  add column if not exists last_birthday_greeted_at timestamptz;
comment on column public.customers.last_birthday_greeted_at is
  'Set when staff marks this customer''s current-year birthday as followed up on, via the admin Birthday Reminders page. Compared by year against now() to decide if this year''s birthday still needs a follow-up.';

alter table public.hamper_items
  add column if not exists offer_id uuid references public.offers(id) on delete set null;
comment on column public.hamper_items.offer_id is
  'Optional offer attached to this gift hamper (e.g. a % or Rupee discount), set from the admin Gift Hampers page. Nullable — most hampers have no offer attached.';
