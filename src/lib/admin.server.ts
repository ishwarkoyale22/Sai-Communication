import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { randomUUID } from "crypto";

// ─── Admin Session Auth ────────────────────────────────────────

export async function createAdminSession(password: string, ip?: string): Promise<string> {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) throw new Error("Admin password is not configured on the server.");
  if (password !== expected) throw new Error("Incorrect password.");

  const token = randomUUID() + "-" + randomUUID();
  const { error } = await supabaseAdmin
    .from("admin_sessions")
    .insert({ session_token: token, ip_address: ip ?? null });
  if (error) throw new Error("Could not create session: " + error.message);
  return token;
}

export async function assertAdminSession(token: string): Promise<void> {
  if (!token) throw new Error("Unauthorized.");
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, expires_at")
    .eq("session_token", token)
    .single();
  if (error || !data) throw new Error("Unauthorized.");
  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin.from("admin_sessions").delete().eq("session_token", token);
    throw new Error("Session expired. Please log in again.");
  }
}

export async function deleteAdminSession(token: string): Promise<void> {
  await supabaseAdmin.from("admin_sessions").delete().eq("session_token", token);
}

// Keep legacy password check for backward compat (used as fallback during migration)
export function assertAdmin(password: string) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) throw new Error("Admin password is not configured on the server.");
  if (password !== expected) throw new Error("Incorrect password");
}

// ─── Product Types ─────────────────────────────────────────────

export type ProductInput = {
  id?: string | undefined;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price?: number | null | undefined;
  stock_status: string;
  stock_qty: number;
  description: string;
  specs: Record<string, string>;
  images: string[];
  is_featured: boolean;
  finance_available?: boolean;
  warranty?: string | null;
  colors?: string[];
};

export async function saveProduct(input: ProductInput) {
  const { id, ...rest } = input;
  const payload = {
    ...rest,
    original_price: rest.original_price ?? null,
    colors: rest.colors ?? [],
    finance_available: rest.finance_available ?? false,
    warranty: rest.warranty ?? null,
  };
  if (id) {
    const { error } = await supabaseAdmin.from("products").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("products").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeProduct(id: string) {
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Enquiries (existing) ──────────────────────────────────────

export async function listEnquiries() {
  const { data, error } = await supabaseAdmin
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setEnquiryStatus(id: string, status: string) {
  const { error } = await supabaseAdmin.from("enquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveSettings(entries: { key: string; value: string }[]) {
  for (const entry of entries) {
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

// ─── Brands ───────────────────────────────────────────────────

export async function saveBrand(input: { id?: string; name: string; logo_url?: string | null; display_order?: number; is_active?: boolean }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("brands").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("brands").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeBrand(id: string) {
  const { error } = await supabaseAdmin.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listBrandsAdmin() {
  const { data, error } = await supabaseAdmin.from("brands").select("*").order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Repair Enquiries ──────────────────────────────────────────

function generateEnquiryNumber(prefix: string): string {
  const date = new Date();
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${d}-${rand}`;
}

export async function submitRepairEnquiry(input: {
  customer_name: string;
  phone: string;
  email?: string | null;
  phone_brand: string;
  phone_model: string;
  problem_type: string;
  description?: string | null;
  image_urls?: string[];
  video_urls?: string[];
  preferred_contact?: string;
}) {
  const enquiry_number = generateEnquiryNumber("RE");
  const { data, error } = await supabaseAdmin
    .from("repair_enquiries")
    .insert({ ...input, enquiry_number, image_urls: input.image_urls ?? [], video_urls: input.video_urls ?? [] })
    .select("id, enquiry_number")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, enquiry_number: data.enquiry_number };
}

export async function listRepairEnquiries(filters?: { status?: string }) {
  let q = supabaseAdmin
    .from("repair_enquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateRepairStatus(id: string, status: string, admin_notes?: string | null) {
  const { error } = await supabaseAdmin
    .from("repair_enquiries")
    .update({ status, ...(admin_notes !== undefined ? { admin_notes } : {}) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Refurbished Products ──────────────────────────────────────

export async function saveRefurbished(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("refurbished_products").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("refurbished_products").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeRefurbished(id: string) {
  const { error } = await supabaseAdmin.from("refurbished_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listRefurbishedAdmin() {
  const { data, error } = await supabaseAdmin.from("refurbished_products").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Offers ───────────────────────────────────────────────────

export async function saveOffer(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("offers").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("offers").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeOffer(id: string) {
  const { error } = await supabaseAdmin.from("offers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleOffer(id: string, is_active: boolean) {
  const { error } = await supabaseAdmin.from("offers").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listOffersAdmin() {
  const { data, error } = await supabaseAdmin.from("offers").select("*").order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Popups ───────────────────────────────────────────────────

export async function savePopup(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("promotional_popups").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("promotional_popups").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function togglePopup(id: string, is_enabled: boolean) {
  // Disable all others first (only one active popup at a time)
  if (is_enabled) await supabaseAdmin.from("promotional_popups").update({ is_enabled: false }).neq("id", id);
  const { error } = await supabaseAdmin.from("promotional_popups").update({ is_enabled }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listPopupsAdmin() {
  const { data, error } = await supabaseAdmin.from("promotional_popups").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Gallery ──────────────────────────────────────────────────

export async function saveGalleryItem(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("gallery_items").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("gallery_items").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeGalleryItem(id: string) {
  const { error } = await supabaseAdmin.from("gallery_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listGalleryAdmin() {
  const { data, error } = await supabaseAdmin.from("gallery_items").select("*").order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Gift Hamper Products ──────────────────────────────────────

export async function saveHamperProduct(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("gift_hamper_products").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("gift_hamper_products").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeHamperProduct(id: string) {
  const { error } = await supabaseAdmin.from("gift_hamper_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listHamperProductsAdmin() {
  const { data, error } = await supabaseAdmin.from("gift_hamper_products").select("*").order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Orders ───────────────────────────────────────────────────

export async function createOrder(input: {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  order_type?: string;
  payment_type?: string;
  finance_partner_id?: string | null;
  finance_tenure?: number | null;
  finance_down_payment?: number | null;
  finance_monthly_emi?: number | null;
  subtotal: number;
  discount_amount?: number;
  total_amount: number;
  delivery_type?: string;
  items: Array<{
    item_type: string;
    product_id?: string | null;
    refurbished_product_id?: string | null;
    gift_hamper_product_id?: string | null;
    name: string;
    brand?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_info?: Record<string, string>;
  }>;
}) {
  const order_number = generateEnquiryNumber("SC");

  // Upsert customer
  let customer_id: string | null = null;
  if (input.customer_phone) {
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", input.customer_phone)
      .single();
    if (existingCustomer) {
      customer_id = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from("customers")
        .insert({ name: input.customer_name, phone: input.customer_phone, email: input.customer_email })
        .select("id")
        .single();
      customer_id = newCustomer?.id ?? null;
    }
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      order_number,
      customer_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email ?? null,
      customer_address: input.customer_address ?? null,
      order_type: input.order_type ?? "direct",
      payment_type: input.payment_type ?? "full",
      finance_partner_id: input.finance_partner_id ?? null,
      finance_tenure: input.finance_tenure ?? null,
      finance_down_payment: input.finance_down_payment ?? null,
      finance_monthly_emi: input.finance_monthly_emi ?? null,
      subtotal: input.subtotal,
      discount_amount: input.discount_amount ?? 0,
      total_amount: input.total_amount,
      delivery_type: input.delivery_type ?? "collection",
    })
    .select("id, order_number")
    .single();
  if (orderError) throw new Error(orderError.message);

  // Insert order items
  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    ...item,
    variant_info: item.variant_info ?? {},
  }));
  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  // Create initial payment record
  const { error: paymentError } = await supabaseAdmin.from("payments").insert({
    order_id: order.id,
    amount: input.total_amount,
    payment_status: "pending",
  });
  if (paymentError) throw new Error(paymentError.message);

  return { order_id: order.id, order_number: order.order_number };
}

export async function getOrderStatus(order_number: string, phone: string) {
  // SAFE public query — NEVER returns internal fields
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("order_number, customer_name, order_status, delivery_status, total_amount, payment_type, created_at")
    .eq("order_number", order_number)
    .eq("customer_phone", phone)
    .single();
  if (error || !data) throw new Error("Order not found.");
  return data;
}

export async function listOrdersAdmin(filters?: { order_type?: string; order_status?: string }) {
  // Returns full order data INCLUDING internal fields — admin only
  let q = supabaseAdmin
    .from("orders")
    .select("*, order_items(*), payments(payment_status, payment_method, amount)")
    .order("created_at", { ascending: false });
  if (filters?.order_type && filters.order_type !== "all") q = q.eq("order_type", filters.order_type);
  if (filters?.order_status && filters.order_status !== "all") q = q.eq("order_status", filters.order_status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateOrderStatus(id: string, order_status: string) {
  const { error } = await supabaseAdmin.from("orders").update({ order_status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateDeliveryStatus(id: string, delivery_status: string) {
  const { error } = await supabaseAdmin.from("orders").update({ delivery_status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function assignOrderBranches(id: string, source_branch_id: string | null, destination_branch_id: string | null) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ source_branch_id, destination_branch_id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Payments ──────────────────────────────────────────────────

export async function verifyAndMarkPaid(order_id: string, payment_data: {
  payment_method: string;
  payment_gateway: string;
  gateway_payment_id?: string;
  transaction_id?: string;
  gateway_response?: Record<string, unknown>;
}) {
  // Update payment record — only server can set verified=true
  const { error: payError } = await supabaseAdmin
    .from("payments")
    .update({
      payment_method: payment_data.payment_method,
      payment_gateway: payment_data.payment_gateway,
      gateway_payment_id: payment_data.gateway_payment_id ?? null,
      transaction_id: payment_data.transaction_id ?? null,
      gateway_response: payment_data.gateway_response ?? {},
      payment_status: "paid",
      verified: true,
      paid_at: new Date().toISOString(),
    })
    .eq("order_id", order_id);
  if (payError) throw new Error(payError.message);

  // Update order status
  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({ order_status: "confirmed" })
    .eq("id", order_id);
  if (orderError) throw new Error(orderError.message);

  return { ok: true };
}

// ─── Customers ────────────────────────────────────────────────

export async function listCustomersAdmin() {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Branches (INTERNAL) ─────────────────────────────────────

export async function saveBranch(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("branches").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("branches").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeBranch(id: string) {
  const { error } = await supabaseAdmin.from("branches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listBranchesAdmin() {
  const { data, error } = await supabaseAdmin.from("branches").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranchInventoryAdmin(branch_id: string) {
  const { data, error } = await supabaseAdmin
    .from("branch_inventory")
    .select("*, products(name, brand)")
    .eq("branch_id", branch_id);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertBranchInventory(branch_id: string, product_id: string, quantity: number, reserved_quantity: number) {
  const { error } = await supabaseAdmin
    .from("branch_inventory")
    .upsert({ branch_id, product_id, quantity, reserved_quantity }, { onConflict: "branch_id,product_id" });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Transfers (INTERNAL) ─────────────────────────────────────

export async function createTransfer(input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from("product_transfers").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function updateTransferStatus(id: string, transfer_status: string) {
  const { error } = await supabaseAdmin.from("product_transfers").update({ transfer_status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listTransfersAdmin() {
  const { data, error } = await supabaseAdmin
    .from("product_transfers")
    .select("*, products(name, brand), from_branch:from_branch_id(name), to_branch:to_branch_id(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Suppliers (INTERNAL) ─────────────────────────────────────

export async function saveSupplier(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("suppliers").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("suppliers").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeSupplier(id: string) {
  const { error } = await supabaseAdmin.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listSuppliersAdmin() {
  const { data, error } = await supabaseAdmin.from("suppliers").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Product Sources (INTERNAL) ───────────────────────────────

export async function saveProductSource(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("product_sources").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("product_sources").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function listProductSourcesAdmin() {
  const { data, error } = await supabaseAdmin
    .from("product_sources")
    .select("*, products(name, brand), suppliers(name), source_branch:source_branch_id(name), dest_branch:destination_branch_id(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Third-Party Sources (INTERNAL) ───────────────────────────

export async function saveThirdPartySource(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("third_party_sources").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("third_party_sources").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function listThirdPartySourcesAdmin() {
  const { data, error } = await supabaseAdmin.from("third_party_sources").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Finance Partners ─────────────────────────────────────────

export async function saveFinancePartner(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("finance_partners").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("finance_partners").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeFinancePartner(id: string) {
  const { error } = await supabaseAdmin.from("finance_partners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listFinancePartnersAdmin() {
  const { data, error } = await supabaseAdmin.from("finance_partners").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Direct Partners (INTERNAL) ───────────────────────────────

export async function saveDirectPartner(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("direct_partners").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("direct_partners").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function listDirectPartnersAdmin() {
  const { data, error } = await supabaseAdmin.from("direct_partners").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
