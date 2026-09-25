import { createFileRoute, Link, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User as UserIcon,
  Package,
  MapPin,
  Heart,
  CreditCard,
  RotateCcw,
  Truck,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import type { AccountOrder, CustomerAddress, WishlistItem } from "@/lib/types";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account | Sai Communication" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountRoot,
});

// /account/orders/:id is a child route. Without an <Outlet/> here, "View Details" just re-showed the
// account page and the order details never appeared.
function AccountRoot() {
  const childMatches = useChildMatches();
  return childMatches.length > 0 ? <Outlet /> : <AccountPage />;
}

type Section = "profile" | "orders" | "addresses" | "wishlist" | "payments" | "returns";

const NAV: { key: Section; label: string; icon: typeof UserIcon; emoji: string }[] = [
  { key: "profile", label: "My Profile", icon: UserIcon, emoji: "👤" },
  { key: "orders", label: "My Orders", icon: Package, emoji: "📦" },
  { key: "addresses", label: "My Addresses", icon: MapPin, emoji: "📍" },
  { key: "wishlist", label: "Wishlist", icon: Heart, emoji: "❤️" },
  { key: "payments", label: "Payment Methods", icon: CreditCard, emoji: "💳" },
  { key: "returns", label: "Returns / Refunds", icon: RotateCcw, emoji: "🔄" },
];

function AccountPage() {
  const { user, profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("profile");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setAuthOpen(true);
  }, [isLoading, user]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">Loading your account...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <UserIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Sign in to view your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track orders, save addresses, and check out faster.</p>
        <Button className="mt-6" onClick={() => setAuthOpen(true)}>Login / Create Account</Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  async function handleLogout() {
    await signOut();
    toast.success("You've been logged out.");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Hello, {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, orders, addresses and more.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <nav className="card-surface h-fit overflow-hidden rounded-2xl p-2 lg:sticky lg:top-24">
          <div className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  section === item.key ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                <span>{item.emoji}</span>
                {item.label}
              </button>
            ))}
            <Link
              to="/order-track"
              search={{ phone: profile?.phone ?? "", order: "" }}
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <span>🚚</span> Track Order
            </Link>
            <button
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {section === "profile" && <ProfileSection />}
          {section === "orders" && <OrdersSection />}
          {section === "addresses" && <AddressesSection />}
          {section === "wishlist" && <WishlistSection />}
          {section === "payments" && <PaymentsSection />}
          {section === "returns" && <ReturnsSection />}
        </div>
      </div>
    </div>
  );
}

// ── Profile ──
function ProfileSection() {
  const { user, profile, refreshProfile, recoveryMode } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    if (!fullName.trim()) { toast.error("Full name is required."); return; }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) { toast.error("Enter a valid 10-digit mobile number."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("customer_profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim(), updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "This mobile number is already in use." : "Could not update profile.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated.");
  }

  return (
    <div className="space-y-6">
    {recoveryMode && (
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-semibold">
        You opened a password-reset link — please choose a new password below.
      </div>
    )}
    <div className="card-surface rounded-2xl p-6">
      <h2 className="text-lg font-bold">My Profile</h2>
      <div className="mt-5 grid gap-4 sm:max-w-md">
        <div className="space-y-2">
          <Label htmlFor="acct-name">Full Name</Label>
          <Input id="acct-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-phone">Mobile Number</Label>
          <Input id="acct-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input value={profile?.email ?? user?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">Email can't be changed here yet — contact us if you need it updated.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
    <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const { user, updatePassword, recoveryMode } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChange() {
    if (!user?.email) return;
    if (next.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (next !== confirm) { toast.error("New password and confirmation don't match."); return; }
    setSaving(true);
    // Outside a reset-link session, prove the current password first.
    if (!recoveryMode) {
      if (!current) { setSaving(false); toast.error("Enter your current password."); return; }
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (verifyError) { setSaving(false); toast.error("Current password is incorrect."); return; }
    }
    const { error } = await updatePassword(next);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success("Password updated.");
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <div className="card-surface rounded-2xl p-6">
      <h2 className="text-lg font-bold">Change Password</h2>
      <div className="mt-5 grid gap-4 sm:max-w-md">
        {!recoveryMode && (
          <div className="space-y-2">
            <Label htmlFor="acct-cur-pw">Current Password</Label>
            <Input id="acct-cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="acct-new-pw">New Password</Label>
          <Input id="acct-new-pw" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acct-confirm-pw">Confirm New Password</Label>
          <Input id="acct-confirm-pw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button onClick={handleChange} disabled={saving} className="w-fit">
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </div>
  );
}

// ── Orders ──
const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed", confirmed: "Confirmed", preparing: "Packed",
  ready: "Out for Delivery", collected: "Collected", delivered: "Delivered", cancelled: "Cancelled",
};
function statusClasses(status: string) {
  if (status === "delivered" || status === "collected") return "border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10";
  if (status === "cancelled") return "border-destructive-foreground/40 text-destructive-foreground bg-destructive-foreground/10";
  return "border-primary/40 text-primary bg-primary/10";
}

function useMyOrders() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["my-orders", user?.id, profile?.phone],
    enabled: !!user,
    queryFn: async (): Promise<AccountOrder[]> => {
      // Only orders that belong to THIS account. Phone numbers aren't verified at signup, so matching
      // on customer_phone would let someone register with another person's number and read their orders.
      const q = supabase
        .from("website_orders")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as AccountOrder[];
    },
  });
}

function OrdersSection() {
  const { data: orders, isLoading } = useMyOrders();

  if (isLoading) return <div className="card-surface rounded-2xl p-10 text-center text-muted-foreground">Loading your orders...</div>;

  if (!orders || orders.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-10 text-center">
        <Package className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-3 font-bold">No orders yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your order history will show up here.</p>
        <Button asChild className="mt-5"><Link to="/products">Start Shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">My Orders</h2>
      {orders.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}

function OrderCard({ order }: { order: AccountOrder }) {
  const { data: items } = useQuery({
    queryKey: ["order-items", order.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("website_order_items").select("*").eq("order_id", order.id);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground">Order Number</p>
          <p className="font-bold text-primary">{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Placed on {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(order.order_status)}`}>
          {STATUS_LABELS[order.order_status] ?? order.order_status}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex items-center gap-3 text-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-lg">
              {item.item_type === "hamper_item" ? "🎁" : "📱"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.item_name}</p>
              <p className="text-xs text-muted-foreground">Qty {item.quantity} × {formatINR(item.unit_price)}</p>
            </div>
            <p className="font-semibold">{formatINR(item.total_price)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-bold text-primary">{formatINR(order.total_amount)}</span>
          <span className="ml-2 text-xs text-muted-foreground capitalize">Payment: {order.payment_status}</span>
          {(() => {
            const o = order as unknown as { refund_status?: string; refund_amount?: number | null };
            if (o.refund_status === "refunded") return <span className="ml-2 text-xs font-semibold text-emerald-600">Refunded {formatINR(Number(o.refund_amount ?? 0))}</span>;
            if (o.refund_status === "pending") return <span className="ml-2 text-xs font-semibold text-amber-600">Refund pending</span>;
            return null;
          })()}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/order-track" search={{ phone: order.customer_phone, order: order.order_number }}>
              <Truck className="size-3.5 mr-1.5" /> Track Order
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>View Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Addresses ──
function AddressesSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", address_line: "", city: "", state: "", pincode: "", is_default: false });
  const [saving, setSaving] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["my-addresses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CustomerAddress[]> => {
      const { data, error } = await supabase.from("customer_addresses").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerAddress[];
    },
  });

  async function handleAdd() {
    if (!user) return;
    if (!form.full_name.trim() || !form.phone.trim() || !form.address_line.trim()) {
      toast.error("Name, phone and address are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("customer_addresses").insert({ ...form, customer_id: user.id });
    setSaving(false);
    if (error) { toast.error("Could not save address."); return; }
    toast.success("Address added.");
    setForm({ label: "Home", full_name: "", phone: "", address_line: "", city: "", state: "", pincode: "", is_default: false });
    setShowForm(false);
    void qc.invalidateQueries({ queryKey: ["my-addresses", user.id] });
  }

  async function handleDelete(id: string) {
    if (!user) return;
    const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
    if (error) { toast.error("Could not remove address."); return; }
    void qc.invalidateQueries({ queryKey: ["my-addresses", user.id] });
  }

  return (
    <div className="card-surface rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My Addresses</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4 mr-1" /> Add Address
        </Button>
      </div>

      {showForm && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
          <Input placeholder="Label (Home / Work)" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input placeholder="Mobile number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
          <Input className="sm:col-span-2" placeholder="Address line" value={form.address_line} onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <Input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={form.is_default} onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v === true }))} />
            Set as default address
          </label>
          <Button className="sm:col-span-2 w-fit" onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Save Address"}</Button>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading addresses...</p>}
        {!isLoading && (addresses ?? []).length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
        )}
        {(addresses ?? []).map((addr) => (
          <div key={addr.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  {addr.label}
                  {addr.is_default && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEFAULT</span>}
                </p>
                <p className="mt-1 text-sm">{addr.full_name} · {addr.phone}</p>
                <p className="text-sm text-muted-foreground">{addr.address_line}{addr.city ? `, ${addr.city}` : ""}{addr.state ? `, ${addr.state}` : ""} {addr.pincode ?? ""}</p>
              </div>
              <button onClick={() => handleDelete(addr.id)} className="text-muted-foreground hover:text-destructive-foreground" aria-label="Delete address">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Wishlist ──
function WishlistSection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["my-wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, created_at, inventory:inventory_id(id, name, price, images, category)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as (WishlistItem & { inventory: { id: string; name: string; price: number; images: string[] | null; category: string | null } | null })[];
    },
  });

  async function handleRemove(id: string) {
    if (!user) return;
    await supabase.from("wishlist_items").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["my-wishlist", user.id] });
  }

  if (isLoading) return <div className="card-surface rounded-2xl p-10 text-center text-muted-foreground">Loading wishlist...</div>;

  if (!items || items.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-10 text-center">
        <Heart className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-3 font-bold">Your wishlist is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
        <Button asChild className="mt-5"><Link to="/products">Browse Products</Link></Button>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-2xl p-6">
      <h2 className="text-lg font-bold">Wishlist</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-accent">
              {item.inventory?.images?.[0]
                ? <img src={item.inventory.images[0]} alt={item.inventory.name} className="size-full object-cover" />
                : <span className="text-3xl">📱</span>}
            </div>
            <p className="mt-2 truncate text-sm font-semibold">{item.inventory?.name ?? "Product"}</p>
            <p className="text-sm text-primary font-bold">{item.inventory ? formatINR(item.inventory.price) : ""}</p>
            <div className="mt-2 flex gap-2">
              <Button asChild size="sm" className="flex-1"><Link to="/products">View</Link></Button>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(item.id)} aria-label="Remove from wishlist">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Methods ──
// There's no stored-card vault — Sai Communication takes payment in-store
// or via UPI/EMI at fulfilment, and building a fake "add card" form would
// mean either storing raw card numbers (never do this) or a non-functional
// mock. Instead this shows the payment methods actually used across past
// orders, which is the honest version of this section for a shop with no
// online payment gateway yet.
function PaymentsSection() {
  const { data: orders } = useMyOrders();
  const methods = Array.from(new Set((orders ?? []).map((o) => o.payment_method).filter(Boolean))) as string[];

  return (
    <div className="card-surface rounded-2xl p-6">
      <h2 className="text-lg font-bold">Payment Methods</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We don't store card details online — payment is collected in-store or via UPI/EMI at fulfilment.
      </p>
      {methods.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No payment methods on file yet — they'll appear here after your first order.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {methods.map((m) => (
            <span key={m} className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold capitalize">
              <CreditCard className="mr-1.5 inline size-3.5 text-primary" /> {m.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Returns / Refunds ──
function ReturnsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: orders } = useMyOrders();
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-returns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("return_requests").select("*, website_orders(order_number)").eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as (import("@/lib/types").ReturnRequest & { website_orders: { order_number: string } | null })[];
    },
  });

  // Updates from the shop about the customer's own return requests (approved / not approved).
  // Row-level security only ever returns this customer's rows.
  type ReturnUpdate = { id: string; type: string; title: string; body: string | null; is_read: boolean; created_at: string };
  const { data: updates } = useQuery({
    queryKey: ["my-return-updates", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("customer_notifications")
        .select("id, type, title, body, is_read, created_at")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []) as ReturnUpdate[];
    },
  });
  const unreadIds = (updates ?? []).filter((u) => !u.is_read).map((u) => u.id);
  useEffect(() => {
    if (unreadIds.length === 0 || !user) return;
    // Show a toast for each new update, then mark them read so they aren't announced again.
    (updates ?? []).filter((u) => !u.is_read).forEach((u) => (u.type === "return_approved" ? toast.success(u.title) : toast.message(u.title)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase as any).from("customer_notifications").update({ is_read: true }).in("id", unreadIds).then(() => {
      // Keep the "New" tags visible for this visit; they clear on the next load.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIds.join(",")]);

  // Orders that already have an open (requested / approved) return can't be filed again.
  const openReturnOrderIds = new Set((requests ?? []).filter((r) => r.status === "requested" || r.status === "approved").map((r) => r.order_id));
  const eligibleOrders = (orders ?? []).filter(
    (o) => (o.order_status === "delivered" || o.order_status === "collected") && !openReturnOrderIds.has(o.id)
  );

  async function handleSubmit() {
    if (!user) return;
    if (!orderId || !reason.trim()) { toast.error("Select an order and describe the reason."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("return_requests").insert({ customer_id: user.id, order_id: orderId, reason: reason.trim() });
    setSubmitting(false);
    if (error) { toast.error("Could not submit request. If you already have an open request for this order, please wait for the shop to respond."); return; }
    toast.success("Return request submitted.");
    setOrderId(""); setReason("");
    void qc.invalidateQueries({ queryKey: ["my-returns", user.id] });
  }

  return (
    <div className="space-y-4">
      <div className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-bold">Request a Return / Refund</h2>
        {eligibleOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Returns can be requested once an order is delivered or collected.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:max-w-md">
            <div className="space-y-2">
              <Label>Order</Label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">Select an order</option>
                {eligibleOrders.map((o) => <option key={o.id} value={o.id}>{o.order_number} — {formatINR(o.total_amount)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item defective / wrong item delivered" />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-fit">
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        )}
      </div>

      {(updates ?? []).length > 0 && (
        <div className="card-surface rounded-2xl p-6">
          <h2 className="text-lg font-bold">Updates from the shop</h2>
          <div className="mt-3 space-y-2">
            {(updates ?? []).map((u) => (
              <div key={u.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{u.title}</p>
                  {unreadIds.includes(u.id) && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">New</span>}
                </div>
                {u.body && <p className="mt-0.5 text-xs text-muted-foreground">{u.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-bold">Your Requests</h2>
        {isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && (requests ?? []).length === 0 && <p className="mt-2 text-sm text-muted-foreground">No return requests yet.</p>}
        <div className="mt-3 space-y-2">
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <div>
                <p className="font-semibold">{r.website_orders?.order_number ?? "Order"}</p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold capitalize text-primary">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
