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

// ─── Inventory (new + refurbished products) ────────────────────

export type ProductInput = {
  id?: string | undefined;
  name: string;
  brand_id: string | null;
  model?: string | null;
  category: string;
  price: number;
  original_price?: number | null | undefined;
  stock: number;
  images: string[];
  specs: Record<string, string>;
  is_featured: boolean;
  is_active?: boolean;
  condition?: string | null;
  grade?: string | null;
  battery_health?: number | null;
  warranty_months?: number | null;
};

export async function saveProduct(input: ProductInput) {
  const { id, ...rest } = input;
  const payload = { ...rest, product_type: "new", original_price: rest.original_price ?? null, is_active: rest.is_active ?? true };
  if (id) {
    const { error } = await supabaseAdmin.from("inventory").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("inventory").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeProduct(id: string) {
  const { error } = await supabaseAdmin.from("inventory").delete().eq("id", id);
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

export async function saveBrand(input: { id?: string; name: string; logo_url?: string | null; is_active?: boolean }) {
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
  const { data, error } = await supabaseAdmin.from("brands").select("*").order("name");
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
  images?: string[];
  preferred_contact?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("repair_enquiries")
    .insert({ ...input, images: input.images ?? [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
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

export async function updateRepairStatus(id: string, status: string) {
  const { error } = await supabaseAdmin
    .from("repair_enquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Refurbished Products (inventory, product_type='refurbished') ──

export async function saveRefurbished(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  const payload = { ...rest, product_type: "refurbished" };
  if (id) {
    const { error } = await supabaseAdmin.from("inventory").update(payload).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("inventory").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeRefurbished(id: string) {
  const { error } = await supabaseAdmin.from("inventory").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listRefurbishedAdmin() {
  const { data, error } = await supabaseAdmin.from("inventory").select("*").eq("product_type", "refurbished").order("created_at", { ascending: false });
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
  const { data, error } = await supabaseAdmin.from("offers").select("*").order("created_at", { ascending: false });
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
    const { error } = await supabaseAdmin.from("gallery").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("gallery").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeGalleryItem(id: string) {
  const { error } = await supabaseAdmin.from("gallery").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listGalleryAdmin() {
  const { data, error } = await supabaseAdmin.from("gallery").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Hamper Items ───────────────────────────────────────────────

export async function saveHamperProduct(input: Record<string, unknown> & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    const { error } = await supabaseAdmin.from("hamper_items").update(rest).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabaseAdmin.from("hamper_items").insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function removeHamperProduct(id: string) {
  const { error } = await supabaseAdmin.from("hamper_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listHamperProductsAdmin() {
  const { data, error } = await supabaseAdmin.from("hamper_items").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Orders ───────────────────────────────────────────────────

export async function createOrder(input: {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  order_type?: string;
  total_amount: number;
  payment_method?: string | null;
  notes?: string | null;
  items: Array<{
    item_type: string;
    inventory_id?: string | null;
    hamper_item_id?: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}) {
  const order_number = generateEnquiryNumber("SC");

  const { data: order, error: orderError } = await supabaseAdmin
    .from("website_orders")
    .insert({
      order_number,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email ?? null,
      order_type: input.order_type ?? "product",
      total_amount: input.total_amount,
      payment_method: input.payment_method ?? null,
      payment_status: "pending",
      order_status: "pending",
      notes: input.notes ?? null,
    })
    .select("id, order_number")
    .single();
  if (orderError) throw new Error(orderError.message);

  const orderItems = input.items.map((item) => ({ order_id: order.id, ...item }));
  const { error: itemsError } = await supabaseAdmin.from("website_order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  return { order_id: order.id, order_number: order.order_number };
}

export async function getOrderStatus(phone: string) {
  // Returns all orders for a phone number (order tracking is phone-based).
  const { data, error } = await supabaseAdmin
    .from("website_orders")
    .select("order_number, customer_name, order_status, payment_status, total_amount, created_at")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOrdersAdmin(filters?: { order_type?: string; order_status?: string }) {
  // Returns full order data INCLUDING internal fields — admin only
  let q = supabaseAdmin
    .from("website_orders")
    .select("*, website_order_items(*)")
    .order("created_at", { ascending: false });
  if (filters?.order_type && filters.order_type !== "all") q = q.eq("order_type", filters.order_type);
  if (filters?.order_status && filters.order_status !== "all") q = q.eq("order_status", filters.order_status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateOrderStatus(id: string, order_status: string) {
  const { error } = await supabaseAdmin.from("website_orders").update({ order_status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ─── Payments (website_orders.payment_status/payment_method directly) ──

export async function verifyAndMarkPaid(order_id: string, payment_method: string) {
  const { error } = await supabaseAdmin
    .from("website_orders")
    .update({ payment_status: "paid", payment_method, order_status: "confirmed" })
    .eq("id", order_id);
  if (error) throw new Error(error.message);
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

// ─── Dashboard Stats (new schema: inventory / website_orders / repair_enquiries) ──

export async function getDashboardStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayOrders, pendingOrders, pendingRepairs, lowStock, recentOrders] = await Promise.all([
    supabaseAdmin
      .from("website_orders")
      .select("total_amount")
      .gte("created_at", todayStart.toISOString()),
    supabaseAdmin
      .from("website_orders")
      .select("id", { count: "exact", head: true })
      .eq("order_status", "pending"),
    supabaseAdmin
      .from("repair_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("inventory")
      .select("id, name, stock, is_active")
      .lt("stock", 5)
      .eq("is_active", true)
      .order("stock", { ascending: true }),
    supabaseAdmin
      .from("website_orders")
      .select("id, order_number, customer_name, total_amount, order_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (todayOrders.error) throw new Error(todayOrders.error.message);
  if (pendingOrders.error) throw new Error(pendingOrders.error.message);
  if (pendingRepairs.error) throw new Error(pendingRepairs.error.message);
  if (lowStock.error) throw new Error(lowStock.error.message);
  if (recentOrders.error) throw new Error(recentOrders.error.message);

  const todaysSales = (todayOrders.data ?? []).reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  return {
    todays_sales: todaysSales,
    pending_orders_count: pendingOrders.count ?? 0,
    pending_repairs_count: pendingRepairs.count ?? 0,
    low_stock_items: lowStock.data ?? [],
    recent_orders: recentOrders.data ?? [],
  };
}

// ─── Generic Admin CRUD (minimal, table-name-driven) ────────────────────
// Used for the "new UI" tables that have no bespoke admin screen yet
// (staff, sales, sales_items, services, wholesaler_invoices,
// third_party_purchases, emi_finance, repairs) and can also serve tables
// that do have bespoke screens where a plain list/save/delete is enough.
// The Supabase JS client's generated Database type only lists tables known
// at generation time; `as any` here is intentional — the table name is
// restricted to this fixed allowlist, so this is not open to arbitrary
// table access despite the loosened typing.
const GENERIC_CRUD_TABLES = [
  "staff", "sales", "sales_items", "services", "wholesaler_invoices",
  "third_party_purchases", "emi_finance", "repairs", "customers",
  "inventory", "brands", "hamper_items", "offers", "gallery",
] as const;
export type GenericCrudTable = typeof GENERIC_CRUD_TABLES[number];

function assertGenericTable(table: string): asserts table is GenericCrudTable {
  if (!GENERIC_CRUD_TABLES.includes(table as GenericCrudTable)) {
    throw new Error(`Table "${table}" is not allowed for generic admin CRUD.`);
  }
}

export async function genericList(
  table: string,
  orderBy = "created_at",
  ascending = false,
  filter?: { column: string; value: string }
) {
  assertGenericTable(table);
  let q = (supabaseAdmin.from(table as never) as any).select("*").order(orderBy, { ascending });
  if (filter) q = q.eq(filter.column, filter.value);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function genericSave(table: string, input: Record<string, unknown> & { id?: string }) {
  assertGenericTable(table);
  const { id, ...rest } = input;
  if (id) {
    const { error } = await (supabaseAdmin.from(table as never) as any).update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await (supabaseAdmin.from(table as never) as any).insert(rest).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function genericDelete(table: string, id: string) {
  assertGenericTable(table);
  const { error } = await (supabaseAdmin.from(table as never) as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
