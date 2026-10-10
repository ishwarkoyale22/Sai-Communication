-- website_order_items had no constraint on quantity/unit_price, same gap
-- sales_items had before. Checked first: 0 of 0 existing rows violate
-- either rule, so both are added as fully VALID. Does not touch pricing,
-- offers, coupons, hampers, or ₹0 items — any non-negative price and
-- positive quantity still works.
alter table public.website_order_items
  add constraint website_order_items_quantity_positive check (quantity > 0),
  add constraint website_order_items_unit_price_nonneg check (unit_price >= 0);
