// ─── Core Domain Types ────────────────────────────────────────

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number | null;
  stock_status: string;
  stock_qty: number;
  description: string;
  specs: Record<string, string>;
  images: string[];
  is_featured: boolean;
  finance_available: boolean;
  warranty: string | null;
  colors: string[];
  created_at: string;
  updated_at: string;
};

export type Enquiry = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  product_id: string | null;
  product_name: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export type SettingsMap = Record<string, string>;

export type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type Offer = {
  id: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  discount_text: string | null;
  badge_text: string | null;
  cta_label: string;
  cta_link: string;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  display_order: number;
  created_at: string;
};

export type PromoPopup = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  discount_text: string | null;
  cta_label: string;
  cta_link: string;
  is_enabled: boolean;
  show_after_seconds: number;
  session_frequency_hours: number;
  created_at: string;
};

export type GalleryItem = {
  id: string;
  type: 'photo' | 'video' | 'reel';
  category: string;
  title: string | null;
  url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type RefurbishedProduct = {
  id: string;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  condition: 'excellent' | 'good' | 'fair';
  condition_grade: string | null;
  battery_health: number | null;
  price: number;
  original_price: number | null;
  warranty: string | null;
  description: string | null;
  images: string[];
  is_available: boolean;
  created_at: string;
};

export type GiftHamperProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
};

export type FinancePartner = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  min_amount: number | null;
  max_amount: number | null;
  available_tenures: number[];
  processing_fee_pct: number;
  is_active: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  pin_code: string | null;
  created_at: string;
};

export type OrderType = 'direct' | 'third_party' | 'whatsapp' | 'phone' | 'walk_in';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected' | 'delivered' | 'cancelled';
export type DeliveryStatus = 'pending' | 'preparing' | 'transfer_requested' | 'in_transit' | 'ready' | 'delivered' | 'collected' | 'cancelled';
export type PaymentType = 'full' | 'emi';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  order_type: OrderType;
  third_party_source_id: string | null;
  third_party_reference: string | null;
  payment_type: PaymentType;
  finance_partner_id: string | null;
  finance_tenure: number | null;
  finance_down_payment: number | null;
  finance_monthly_emi: number | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  order_status: OrderStatus;
  delivery_type: string;
  delivery_status: DeliveryStatus;
  created_at: string;
  updated_at: string;
};

export type PublicOrderStatus = {
  order_number: string;
  customer_name: string;
  order_status: OrderStatus;
  delivery_status: DeliveryStatus;
  total_amount: number;
  payment_type: PaymentType;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_type: 'product' | 'refurbished' | 'accessory' | 'hamper_product';
  product_id: string | null;
  refurbished_product_id: string | null;
  gift_hamper_product_id: string | null;
  name: string;
  brand: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info: Record<string, string>;
};

export type Payment = {
  id: string;
  order_id: string;
  payment_method: string;
  payment_gateway: string;
  transaction_id: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  amount: number;
  currency: string;
  payment_status: PaymentStatus;
  verified: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RepairStatus = 'new' | 'contacted' | 'device_received' | 'diagnosis' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
export type ProblemType = 'screen' | 'battery' | 'charging' | 'software' | 'camera' | 'speaker' | 'water' | 'other';

export type RepairEnquiry = {
  id: string;
  enquiry_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  phone_brand: string;
  phone_model: string;
  problem_type: ProblemType;
  description: string | null;
  image_urls: string[];
  video_urls: string[];
  preferred_contact: 'phone' | 'whatsapp' | 'email';
  status: RepairStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact_person: string | null;
  phone: string | null;
  opening_hours: string | null;
  is_active: boolean;
  created_at: string;
};

export type BranchInventory = {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductSource = {
  id: string;
  product_id: string | null;
  supplier_id: string | null;
  source_branch_id: string | null;
  destination_branch_id: string | null;
  purchase_date: string | null;
  quantity: number;
  purchase_cost: number | null;
  invoice_reference: string | null;
  notes: string | null;
  created_at: string;
};

export type ProductTransfer = {
  id: string;
  product_id: string | null;
  from_branch_id: string | null;
  to_branch_id: string | null;
  quantity: number;
  requested_by: string | null;
  transfer_status: 'requested' | 'approved' | 'in_transit' | 'received' | 'completed' | 'cancelled';
  related_order_id: string | null;
  transfer_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ThirdPartySource = {
  id: string;
  name: string;
  sector: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type DirectPartner = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type CartItemType = {
  id: string;
  product?: Product;
  refurbished?: RefurbishedProduct;
  hamperProduct?: GiftHamperProduct;
  item_type: 'product' | 'refurbished' | 'accessory' | 'hamper_product';
  name: string;
  brand: string;
  price: number;
  quantity: number;
  variant_info: Record<string, string>;
  image: string;
};

export type CheckoutFormData = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  delivery_type: 'collection' | 'delivery';
  payment_type: 'full' | 'emi';
  finance_partner_id: string;
  finance_tenure: number;
  finance_down_payment: number;
  payment_method: string;
};

export const CATEGORIES = [
  "All",
  "Smartphones",
  "Feature Phones",
  "Accessories",
  "Tablets",
] as const;

export type Category = typeof CATEGORIES[number];

export function normalizeProduct(row: Record<string, unknown>): Product {
  const specs = row["specs"];
  const images = row["images"];
  const colors = row["colors"];
  return {
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    brand: String(row["brand"] ?? ""),
    category: String(row["category"] ?? ""),
    price: Number(row["price"] ?? 0),
    original_price: row["original_price"] == null ? null : Number(row["original_price"]),
    stock_status: String(row["stock_status"] ?? "in_stock"),
    stock_qty: Number(row["stock_qty"] ?? 0),
    description: String(row["description"] ?? ""),
    specs: (specs && typeof specs === "object" ? specs : {}) as Record<string, string>,
    images: Array.isArray(images) ? (images as string[]) : [],
    is_featured: Boolean(row["is_featured"]),
    finance_available: Boolean(row["finance_available"]),
    warranty: row["warranty"] ? String(row["warranty"]) : null,
    colors: Array.isArray(colors) ? (colors as string[]) : [],
    created_at: String(row["created_at"] ?? ""),
    updated_at: String(row["updated_at"] ?? ""),
  };
}

export function normalizeRefurbished(row: Record<string, unknown>): RefurbishedProduct {
  const images = row["images"];
  return {
    id: String(row["id"]),
    brand: String(row["brand"] ?? ""),
    model: String(row["model"] ?? ""),
    storage: row["storage"] ? String(row["storage"]) : null,
    ram: row["ram"] ? String(row["ram"]) : null,
    condition: (row["condition"] as RefurbishedProduct["condition"]) ?? "good",
    condition_grade: row["condition_grade"] ? String(row["condition_grade"]) : null,
    battery_health: row["battery_health"] ? Number(row["battery_health"]) : null,
    price: Number(row["price"] ?? 0),
    original_price: row["original_price"] == null ? null : Number(row["original_price"]),
    warranty: row["warranty"] ? String(row["warranty"]) : null,
    description: row["description"] ? String(row["description"]) : null,
    images: Array.isArray(images) ? (images as string[]) : [],
    is_available: Boolean(row["is_available"]),
    created_at: String(row["created_at"] ?? ""),
  };
}
