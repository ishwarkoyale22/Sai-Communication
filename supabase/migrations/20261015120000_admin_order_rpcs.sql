-- Least-privilege admin order actions.
--
-- service_role only has SELECT, INSERT on public.website_orders (ACL "ar"), so the admin code that
-- ran `.update()` through the service client (updateOrderStatus / verifyAndMarkPaid in
-- src/lib/admin.server.ts) fails with "permission denied". Rather than granting UPDATE on the whole
-- table (which would also be a way to edit totals, customer_id, gateway ids and refund fields),
-- these two SECURITY DEFINER functions change ONLY the columns an admin action needs, after
-- validating the input. Callers are authorised in the application (assertAdminSession) before they
-- reach these; the functions themselves are executable by service_role only.
--
-- Rollback:
--   drop function public.web_admin_set_order_status(uuid, text);
--   drop function public.web_admin_mark_order_paid(uuid, text);

create or replace function public.web_admin_set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pending','confirmed','processing','ready','delivered','cancelled') then
    raise exception 'Invalid order status' using errcode = '22023';
  end if;
  update public.website_orders set order_status = p_status where id = p_order_id;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Manual (in-store) payment only. Online orders carry a gateway order id and are settled solely by
-- Razorpay (signature/webhook with the amount checked), never by hand; already-paid and refunded
-- orders are left alone.
create or replace function public.web_admin_mark_order_paid(p_order_id uuid, p_payment_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.website_orders;
begin
  if p_payment_method not in ('cash','upi','card','emi','credit') then
    raise exception 'Invalid payment method' using errcode = '22023';
  end if;
  select * into v_row from public.website_orders where id = p_order_id for update;
  if v_row.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_row.gateway_order_id is not null then
    raise exception 'Online orders are settled by the payment gateway' using errcode = '42501';
  end if;
  if v_row.payment_status = 'paid' then
    return;
  end if;
  if v_row.payment_status not in ('pending', 'processing') or v_row.refund_status <> 'none' then
    raise exception 'Order cannot be marked paid' using errcode = '22023';
  end if;
  update public.website_orders
  set payment_status = 'paid',
      payment_method = p_payment_method,
      order_status = case when order_status = 'pending' then 'confirmed' else order_status end
  where id = p_order_id;
end;
$$;

revoke all on function public.web_admin_set_order_status(uuid, text) from public, anon, authenticated;
revoke all on function public.web_admin_mark_order_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.web_admin_set_order_status(uuid, text) to service_role;
grant execute on function public.web_admin_mark_order_paid(uuid, text) to service_role;
