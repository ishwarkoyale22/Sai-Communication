-- REPOSITORY RECORD of a migration that is ALREADY APPLIED to the live database.
--   live version : 20261014171542   live name : checkout_rpc_functions
-- Applied by hand on 2026-10-14 (not from the repo). The function bodies below were read back from
-- the live database (pg_get_functiondef) and reproduced verbatim, so this file matches live. The
-- version equals the live one on purpose; the statements are CREATE OR REPLACE + REVOKE/GRANT, so
-- running them again is harmless. Do NOT run `supabase db push`.
--
-- Differences from the originally proposed design (kept as they are live):
--   * no `currency` column: currency is fixed to INR inside web_apply_payment_result_v2;
--   * web_place_order relies on the table defaults for payment_status/order_status ('pending').
--
-- Both functions are SECURITY DEFINER and executable ONLY by service_role (the server).
-- Live ACL: {postgres=X/postgres,service_role=X/postgres}.

create or replace function public.web_place_order(p_order jsonb, p_items jsonb)
 returns table(id uuid, order_number text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid := (p_order->>'id')::uuid;
  v_total numeric := (p_order->>'total_amount')::numeric;
  v_discount numeric := coalesce((p_order->>'discount_amount')::numeric, 0);
  v_items_total numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  select coalesce(sum((i->>'total_price')::numeric), 0) into v_items_total
  from jsonb_array_elements(p_items) i;

  if abs(greatest(0, v_items_total - v_discount) - v_total) > 0.01 then
    raise exception 'Order items do not add up to the order total' using errcode = '23514';
  end if;

  insert into public.website_orders (
    id, order_number, customer_name, customer_phone, customer_email, order_type,
    total_amount, payment_method, notes, coupon_code, discount_amount, customer_id
  ) values (
    v_id,
    p_order->>'order_number',
    p_order->>'customer_name',
    p_order->>'customer_phone',
    nullif(p_order->>'customer_email', ''),
    coalesce(p_order->>'order_type', 'product'),
    v_total,
    p_order->>'payment_method',
    p_order->>'notes',
    p_order->>'coupon_code',
    v_discount,
    nullif(p_order->>'customer_id', '')::uuid
  );

  insert into public.website_order_items (
    order_id, item_type, inventory_id, hamper_item_id, item_name, quantity, unit_price, total_price
  )
  select v_id,
         i->>'item_type',
         nullif(i->>'inventory_id', '')::uuid,
         nullif(i->>'hamper_item_id', '')::uuid,
         i->>'item_name',
         (i->>'quantity')::int,
         (i->>'unit_price')::numeric,
         (i->>'total_price')::numeric
  from jsonb_array_elements(p_items) i;

  return query select v_id, p_order->>'order_number';
end;
$function$;

create or replace function public.web_apply_payment_result_v2(p_gateway_order_id text, p_gateway_payment_id text, p_status text, p_amount_paise bigint, p_currency text)
 returns table(id uuid, order_number text, payment_status text, result text, expected_amount_paise bigint, expected_currency text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_row public.website_orders;
  v_expected bigint;
begin
  if p_status not in ('paid', 'failed', 'cancelled') then
    raise exception 'Invalid payment status';
  end if;

  select * into v_row from public.website_orders
  where website_orders.gateway_order_id = p_gateway_order_id
  for update;

  if v_row.id is null then
    raise exception 'No order found for this gateway order id';
  end if;

  v_expected := round(v_row.total_amount * 100)::bigint;

  if v_row.payment_status = 'paid' then
    return query select v_row.id, v_row.order_number, v_row.payment_status, 'noop'::text, v_expected, 'INR'::text;
    return;
  end if;

  if p_status = 'paid' and (p_amount_paise is distinct from v_expected or upper(coalesce(p_currency, '')) <> 'INR') then
    return query select v_row.id, v_row.order_number, v_row.payment_status, 'mismatch'::text, v_expected, 'INR'::text;
    return;
  end if;

  update public.website_orders
  set payment_status = p_status,
      gateway_payment_id = coalesce(p_gateway_payment_id, website_orders.gateway_payment_id),
      order_status = case when p_status = 'paid' then 'confirmed' else website_orders.order_status end,
      payment_verified_at = case when p_status = 'paid' then now() else website_orders.payment_verified_at end
  where website_orders.id = v_row.id;

  return query
    select w.id, w.order_number, w.payment_status, 'applied'::text, v_expected, 'INR'::text
    from public.website_orders w where w.id = v_row.id;
end;
$function$;

revoke all on function public.web_place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.web_place_order(jsonb, jsonb) to service_role;
revoke all on function public.web_apply_payment_result_v2(text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.web_apply_payment_result_v2(text, text, text, bigint, text) to service_role;
