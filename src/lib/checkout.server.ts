import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CheckoutItemInput = {
  item_type: "product" | "hamper_item";
  inventory_id?: string | null;
  hamper_item_id?: string | null;
  quantity: number;
};

export type PlaceOrderInput = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_id?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  coupon_code?: string | null;
  items: CheckoutItemInput[];
};

// Recomputes every line and the order total from the live catalog
// (inventory/hamper_items) and re-validates any coupon against `offers`
// here — never trusts a client-supplied unit_price/total_amount/discount.
export async function placeWebsiteOrder(input: PlaceOrderInput) {
  if (!input.customer_name?.trim() || !input.customer_phone?.trim()) {
    throw new Error("Customer name and phone are required.");
  }
  if (!input.items.length) throw new Error("Your cart is empty.");

  let total = 0;
  const resolved: {
    item_type: string;
    inventory_id: string | null;
    hamper_item_id: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[] = [];
  let hasProduct = false;
  let hasHamper = false;

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid quantity.");
    }

    if (item.item_type === "hamper_item") {
      if (!item.hamper_item_id) throw new Error("Missing hamper item.");
      const { data, error } = await supabaseAdmin
        .from("hamper_items")
        .select("name, price, is_active")
        .eq("id", item.hamper_item_id)
        .single();
      if (error || !data || data.is_active === false) {
        throw new Error(
          data?.name
            ? `"${data.name}" is no longer available — please remove it from your cart.`
            : "A selected hamper is no longer available — please remove it from your cart.",
        );
      }
      const unitPrice = Number(data.price);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;
      hasHamper = true;
      resolved.push({
        item_type: "hamper_item",
        inventory_id: null,
        hamper_item_id: item.hamper_item_id,
        item_name: data.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
      });
    } else {
      if (!item.inventory_id) throw new Error("Missing product.");
      const { data, error } = await supabaseAdmin
        .from("inventory")
        .select("name, price, is_active")
        .eq("id", item.inventory_id)
        .single();
      if (error || !data || data.is_active === false) {
        throw new Error(
          data?.name
            ? `"${data.name}" is no longer available — please remove it from your cart.`
            : "A selected product is no longer available — please remove it from your cart.",
        );
      }
      const unitPrice = Number(data.price);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;
      hasProduct = true;
      resolved.push({
        item_type: "product",
        inventory_id: item.inventory_id,
        hamper_item_id: null,
        item_name: data.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
      });
    }
  }

  // Coupon: re-validated here exactly like the checkout UI's own check —
  // never trust a client-supplied discount_amount. An unknown/expired code
  // is silently ignored (0 discount), matching today's UX rather than
  // failing the whole order.
  let discountAmount = 0;
  let couponCode: string | null = null;
  if (input.coupon_code?.trim()) {
    const now = new Date().toISOString();
    const { data } = await supabaseAdmin
      .from("offers")
      .select("coupon_code, discount_value")
      .eq("is_active", true)
      .eq("offer_type", "coupon")
      .ilike("coupon_code", input.coupon_code.trim())
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .maybeSingle();
    if (data) {
      discountAmount = Math.min(Number(data.discount_value ?? 0), total);
      couponCode = data.coupon_code;
    }
  }

  const payableTotal = Math.max(0, total - discountAmount);
  const order_type = hasProduct && hasHamper ? "mixed" : hasHamper ? "hamper" : "product";
  const order_id = crypto.randomUUID();
  const order_number = `SC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { error: orderError } = await supabaseAdmin
    .from("website_orders")
    .insert({
      id: order_id,
      order_number,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone.replace(/[\s-]/g, ""),
      customer_email: input.customer_email || null,
      order_type,
      total_amount: payableTotal,
      payment_method: input.payment_method || null,
      payment_status: "pending",
      order_status: "pending",
      notes: input.notes ?? null,
      coupon_code: couponCode,
      discount_amount: discountAmount || null,
      customer_id: input.customer_id ?? null,
    });
  if (orderError) throw new Error(orderError.message);

  const { error: itemsError } = await supabaseAdmin
    .from("website_order_items")
    .insert(resolved.map((r) => ({ order_id, ...r })));
  if (itemsError) throw new Error(itemsError.message);

  return { order_id, order_number };
}
