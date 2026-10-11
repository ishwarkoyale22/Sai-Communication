-- Razorpay online payments: gateway tracking columns + idempotent, RLS-safe
-- state transitions for website_orders.
--
-- Context: supabaseAdmin in this deployment is NOT a true service-role client
-- (see 20261013000000_restore_checkout_insert.sql) — it runs under the
-- publishable key and is therefore subject to RLS like any anon/authenticated
-- client. website_orders has no UPDATE policy for anon/authenticated at all,
-- so a plain `.update(...)` from a server function would silently violate RLS.
-- Instead of a broad UPDATE policy, payment state changes go through the SECURITY DEFINER
-- functions below, which accept only a gateway order id / payment id and a constrained
-- status value.
--
-- SECURITY: these functions are executable by service_role ONLY. They must never be granted
-- to anon/authenticated: the anon key is public, so anyone could otherwise call
-- web_apply_payment_result(<their gateway order id>, ..., 'paid') straight from the browser
-- and mark an unpaid order as paid. The application server must therefore run with a REAL
-- service-role key (SUPABASE_SERVICE_ROLE_KEY) — online payment stays disabled until it does.

alter table public.website_orders
  add column if not exists gateway_name text,
  add column if not exists gateway_order_id text,
  add column if not exists gateway_payment_id text,
  add column if not exists payment_verified_at timestamptz;

-- One gateway order id must map to exactly one website order.
create unique index if not exists website_orders_gateway_order_id_key
  on public.website_orders (gateway_order_id)
  where gateway_order_id is not null;

comment on column public.website_orders.gateway_name is 'Payment gateway used for online payment, e.g. razorpay. Null for cash/in-store/offline orders.';
comment on column public.website_orders.gateway_order_id is 'Gateway-side order id (e.g. Razorpay order_... ). Set once, before the customer is shown the payment popup.';
comment on column public.website_orders.gateway_payment_id is 'Gateway-side payment id once a payment attempt has been made against this order.';
comment on column public.website_orders.payment_verified_at is 'When payment_status last transitioned to paid via a verified signature (client callback or webhook).';

-- Idempotency ledger for webhook deliveries. A gateway may redeliver the same
-- event (network retry, at-least-once delivery) — this table makes re-
-- application a no-op instead of re-running side effects.
create table if not exists public.payment_webhook_events (
  event_key text primary key,
  gateway_name text not null,
  event_type text not null,
  order_id uuid references public.website_orders(id),
  payload jsonb,
  created_at timestamptz not null default now()
);

comment on table public.payment_webhook_events is 'Dedupe ledger for payment gateway webhook deliveries, keyed by "<event_type>:<gateway_payment_id>".';

alter table public.payment_webhook_events enable row level security;
-- No anon/authenticated policy at all: only the webhook's SECURITY DEFINER
-- path (below) and staff via the admin portal need to touch this table.

-- Reserve the Razorpay order id for a pending order (service_role only — see header). Scoped so it can only attach a gateway order id to an order that is still
-- pending and either has no gateway order id yet or already has this exact
-- one (safe to retry after a network hiccup — never silently swaps a
-- different gateway order onto an existing one).
create or replace function public.web_set_order_gateway(
  p_order_id uuid,
  p_gateway_name text,
  p_gateway_order_id text
)
returns table (id uuid, order_number text, total_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.website_orders;
begin
  select * into v_row from public.website_orders where website_orders.id = p_order_id;
  if v_row.id is null then
    raise exception 'Order not found';
  end if;
  if v_row.payment_status <> 'pending' then
    raise exception 'Order is not awaiting payment';
  end if;
  if v_row.gateway_order_id is not null and v_row.gateway_order_id <> p_gateway_order_id then
    raise exception 'Order already has a different gateway order attached';
  end if;

  update public.website_orders
  set gateway_name = p_gateway_name,
      gateway_order_id = p_gateway_order_id
  where website_orders.id = p_order_id;

  return query
    select website_orders.id, website_orders.order_number, website_orders.total_amount
    from public.website_orders
    where website_orders.id = p_order_id;
end;
$$;

revoke all on function public.web_set_order_gateway(uuid, text, text) from public;
revoke all on function public.web_set_order_gateway(uuid, text, text) from anon, authenticated;
grant execute on function public.web_set_order_gateway(uuid, text, text) to service_role;

-- Apply a verified payment result. Takes ONLY the gateway order id (never
-- our internal order id from the client) plus a constrained status, so a
-- caller can at most report "this gateway order is paid/failed/cancelled" —
-- never pick which internal order/column to mutate. Idempotent: re-applying
-- the same or an older status on an order that is already 'paid' is a no-op,
-- so duplicate webhook deliveries and a racing client-callback + webhook
-- both land safely.
create or replace function public.web_apply_payment_result(
  p_gateway_order_id text,
  p_gateway_payment_id text,
  p_status text
)
returns table (id uuid, order_number text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.website_orders;
begin
  if p_status not in ('paid', 'failed', 'cancelled') then
    raise exception 'Invalid payment status';
  end if;

  select * into v_row
  from public.website_orders
  where website_orders.gateway_order_id = p_gateway_order_id
  for update;

  if v_row.id is null then
    raise exception 'No order found for this gateway order id';
  end if;

  -- Already settled as paid — never move a paid order back to failed/cancelled
  -- because of an out-of-order or duplicate event.
  if v_row.payment_status = 'paid' then
    return query
      select website_orders.id, website_orders.order_number, website_orders.payment_status
      from public.website_orders
      where website_orders.id = v_row.id;
    return;
  end if;

  update public.website_orders
  set payment_status = p_status,
      gateway_payment_id = coalesce(p_gateway_payment_id, website_orders.gateway_payment_id),
      order_status = case when p_status = 'paid' then 'confirmed' else website_orders.order_status end,
      payment_verified_at = case when p_status = 'paid' then now() else website_orders.payment_verified_at end
  where website_orders.id = v_row.id;

  return query
    select website_orders.id, website_orders.order_number, website_orders.payment_status
    from public.website_orders
    where website_orders.id = v_row.id;
end;
$$;

revoke all on function public.web_apply_payment_result(text, text, text) from public;
revoke all on function public.web_apply_payment_result(text, text, text) from anon, authenticated;
grant execute on function public.web_apply_payment_result(text, text, text) to service_role;

-- Lets the payment server functions read back an order's stored gateway_order_id/total_amount
-- (service_role only: it returns customer_phone, so it must not be reachable with the public key).
create or replace function public.web_get_order_for_payment(p_order_id uuid)
returns table (id uuid, order_number text, total_amount numeric, payment_status text, gateway_order_id text, customer_phone text)
language sql
security definer
set search_path = public
stable
as $$
  select website_orders.id, website_orders.order_number, website_orders.total_amount,
         website_orders.payment_status, website_orders.gateway_order_id, website_orders.customer_phone
  from public.website_orders
  where website_orders.id = p_order_id;
$$;

revoke all on function public.web_get_order_for_payment(uuid) from public;
revoke all on function public.web_get_order_for_payment(uuid) from anon, authenticated;
grant execute on function public.web_get_order_for_payment(uuid) to service_role;
