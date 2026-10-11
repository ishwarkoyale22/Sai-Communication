import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  User,
  Truck,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import { financePartnersQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/checkout.functions";
import {
  createRazorpayOrder,
  getPaymentConfig,
  verifyRazorpayPayment,
} from "@/lib/payment.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CheckoutFormData, Offer } from "@/lib/types";
import { Tag, X as XIcon } from "lucide-react";
import { ConsentCheckbox, PrivacyPolicyLink } from "@/components/privacy/ConsentCheckbox";
import { recordConsent } from "@/lib/consent";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout | Sai Communication" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

const STEPS = [
  { num: 1, label: "Your Details", icon: User },
  { num: 2, label: "Delivery", icon: Truck },
  { num: 3, label: "Finance", icon: ShieldCheck },
  { num: 4, label: "Payment", icon: CreditCard },
];

const EMPTY_FORM: CheckoutFormData = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
  customer_birthday: "",
  delivery_type: "collection",
  payment_type: "full",
  finance_partner_id: "",
  finance_tenure: 12,
  finance_down_payment: 0,
  // Every new sale starts on Cash — the most common in-store payment method.
  payment_method: "cash",
};

// Minimal typing for the parts of Razorpay's Checkout.js we use.
type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (resp: { error?: { description?: string } }) => void) => void;
};
type RazorpayCtor = new (opts: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (resp: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
}) => RazorpayInstance;

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<RazorpayCtor | null> {
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      resolve((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay ?? null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

// idle → creating (order + gateway session) → awaiting (popup open) → verifying (server check)
// → success navigates away; failed/cancelled leave the placed order intact so the shopper can retry.
type PayState = "idle" | "creating" | "awaiting" | "verifying" | "failed" | "cancelled";

function CheckoutPage() {
  const { items, total, clearCart, removeItem } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CheckoutFormData>(() =>
    profile
      ? {
          ...EMPTY_FORM,
          customer_name: profile.full_name,
          customer_phone: profile.phone,
          customer_email: profile.email ?? "",
        }
      : EMPTY_FORM,
  );
  const [loading, setLoading] = useState(false);
  const { data: financePartners = [] } = useQuery(financePartnersQuery);

  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => getPaymentConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const onlineEnabled = paymentConfig?.onlineEnabled === true;
  const [payState, setPayState] = useState<PayState>("idle");
  const [payError, setPayError] = useState("");
  // Set once the website order exists; a retry reuses it instead of placing a duplicate order.
  const [pendingOrder, setPendingOrder] = useState<{ id: string; order_number: string } | null>(
    null,
  );

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [dataConsent, setDataConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  function setF<K extends keyof CheckoutFormData>(k: K, v: CheckoutFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // The profile loads asynchronously after the auth session resolves, so
  // it's usually not there yet on first render — fill in name/phone/email
  // once it arrives, but only into fields the shopper hasn't already typed
  // into (so this never clobbers manual edits, e.g. a different delivery
  // contact than the account holder).
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || profile.full_name,
      customer_phone: f.customer_phone || profile.phone,
      customer_email: f.customer_email || (profile.email ?? ""),
    }));
  }, [profile]);

  // A cart is a product snapshot saved to localStorage, so it can quietly go stale: the item
  // was removed/delisted, or (in dev) the catalog got reseeded with new ids since it was added.
  // Without this, the shopper only discovers that at the very last step (handlePlaceOrder, after
  // filling in the whole form) with no indication of which item is the problem. Runs once, the
  // first time the cart has items — not keyed to every `items` change, so removing a stale item
  // below doesn't retrigger it.
  const cartValidatedRef = useRef(false);
  useEffect(() => {
    if (cartValidatedRef.current || items.length === 0) return;
    cartValidatedRef.current = true;

    const snapshot = items;
    const inventoryIds = [
      ...new Set(
        snapshot
          .filter((i) => i.item_type !== "hamper_product")
          .map((i) => i.product?.id ?? i.refurbished?.id)
          .filter((v): v is string => !!v),
      ),
    ];
    const hamperIds = [
      ...new Set(
        snapshot
          .filter((i) => i.item_type === "hamper_product")
          .map((i) => i.hamperProduct?.id)
          .filter((v): v is string => !!v),
      ),
    ];
    if (inventoryIds.length === 0 && hamperIds.length === 0) return;

    (async () => {
      const [invRes, hamperRes] = await Promise.all([
        inventoryIds.length
          ? supabase.from("inventory").select("id, is_active").in("id", inventoryIds)
          : Promise.resolve({ data: [] as { id: string; is_active: boolean | null }[] }),
        hamperIds.length
          ? supabase.from("hamper_items").select("id, is_active").in("id", hamperIds)
          : Promise.resolve({ data: [] as { id: string; is_active: boolean | null }[] }),
      ]);
      const validInventory = new Set(
        (invRes.data ?? []).filter((r) => r.is_active !== false).map((r) => r.id),
      );
      const validHamper = new Set(
        (hamperRes.data ?? []).filter((r) => r.is_active !== false).map((r) => r.id),
      );

      const stale = snapshot.filter((item) => {
        const refId =
          item.item_type === "hamper_product"
            ? item.hamperProduct?.id
            : (item.product?.id ?? item.refurbished?.id);
        if (!refId) return true; // malformed cart entry — can't be ordered either way
        return item.item_type === "hamper_product"
          ? !validHamper.has(refId)
          : !validInventory.has(refId);
      });
      if (stale.length === 0) return;

      stale.forEach((item) => removeItem(item.id));
      const [firstStale] = stale;
      toast.error(
        stale.length === 1 && firstStale
          ? `"${firstStale.name}" is no longer available and was removed from your cart.`
          : `${stale.length} items are no longer available and were removed from your cart: ${stale.map((i) => i.name).join(", ")}.`,
      );
    })();
  }, [items, removeItem]);

  const selectedPartner = financePartners.find((p) => p.id === form.finance_partner_id);

  const discountAmount = appliedCoupon?.discount_value
    ? Math.min(Number(appliedCoupon.discount_value), total)
    : 0;
  const payableTotal = total - discountAmount;

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .eq("offer_type", "coupon")
        .ilike("coupon_code", code)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        setCouponError("Invalid or expired coupon code.");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon(data as Offer);
      toast.success(`Coupon "${code.toUpperCase()}" applied!`);
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  const loanAmount = payableTotal - (form.finance_down_payment ?? 0);
  const monthlyEMI =
    selectedPartner && form.finance_tenure > 0 && loanAmount > 0
      ? Math.ceil(loanAmount / form.finance_tenure)
      : 0;

  const cleanPhone = form.customer_phone.replace(/[\s-]/g, "");

  function validateBeforeOrder(): boolean {
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Customer name and phone are required.");
      return false;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return false;
    }
    return true;
  }

  // Creates the website order (status pending) via the server function.
  async function createWebsiteOrder() {
    // website_orders has no columns for delivery address / finance detail —
    // fold that context into `notes` so it isn't silently dropped.
    const noteParts: string[] = [];
    if (form.customer_address) noteParts.push(`Address: ${form.customer_address}`);
    noteParts.push(`Delivery: ${form.delivery_type}`);
    if (form.payment_type === "emi") {
      const partnerName = selectedPartner?.name ?? "TBD";
      noteParts.push(
        `EMI via ${partnerName}: ${form.finance_tenure} months, down payment ${formatINR(form.finance_down_payment)}, est. EMI ${formatINR(monthlyEMI)}/mo`,
      );
    }

    // Pricing/totals are recomputed server-side from the live catalog and
    // coupon table — the client only tells the server which items/
    // quantities were selected, never what they cost.
    return placeOrder({
      data: {
        customer_name: form.customer_name,
        customer_phone: cleanPhone,
        customer_email: form.customer_email || null,
        customer_id: user?.id ?? null,
        payment_method: form.payment_method || null,
        notes: noteParts.join(" | "),
        coupon_code: appliedCoupon?.coupon_code ?? null,
        items: items.map((item) => ({
          // item_type is constrained to 'product' | 'hamper_item'
          item_type: item.item_type === "hamper_product" ? "hamper_item" : "product",
          inventory_id: item.product?.id ?? item.refurbished?.id ?? null,
          hamper_item_id: item.hamperProduct?.id ?? null,
          quantity: item.quantity,
        })),
      },
    });
  }

  // Best-effort bookkeeping once the order row exists: birthday upsert + consent trail.
  // The order is already placed, so a failure here must not block checkout completion.
  async function recordOrderSideEffects() {
    // Upsert the customer's birthday, keyed by phone number — update the
    // existing record if one matches, otherwise create it. Optional field,
    // so a blank value is simply skipped rather than clearing anything.
    if (form.customer_birthday) {
      try {
        // The customers table is no longer open to the public; this function
        // creates the customer when new and only FILLS a missing birthday for an
        // existing one (it never overwrites another person's record).
        const { error: bdayError } = await supabase.rpc("web_save_customer_birthday", {
          p_name: form.customer_name,
          p_phone: cleanPhone,
          p_email: form.customer_email || null,
          p_address: form.customer_address || null,
          p_birthday: form.customer_birthday,
        });
        if (bdayError) throw bdayError;
      } catch (err) {
        console.error("Failed to save customer birthday:", err);
      }
    }

    const consentBase = {
      fullName: form.customer_name,
      phone: cleanPhone,
      email: form.customer_email || undefined,
      sourcePage: "checkout",
    } as const;
    recordConsent({ ...consentBase, purpose: "order_processing", granted: dataConsent });
    if (marketingConsent) {
      recordConsent({ ...consentBase, purpose: "marketing_communications", granted: true });
    }
  }

  function finishCheckout(order_number: string) {
    const phone = cleanPhone;
    clearCart();
    // Reset the form (payment method back to Cash) so a fresh checkout —
    // should the router ever keep this component mounted — never starts
    // from the previous customer's details or payment method.
    setForm(EMPTY_FORM);
    setStep(1);
    setAppliedCoupon(null);
    setCouponInput("");
    setPendingOrder(null);
    setPayState("idle");
    setPayError("");
    navigate({ to: "/order-success", search: { order_number, phone } });
  }

  // In-store / cash / EMI path — unchanged behaviour: place the order and finish.
  async function handlePlaceOrder() {
    if (!validateBeforeOrder()) return;
    setLoading(true);
    try {
      const { order_number } = await createWebsiteOrder();
      await recordOrderSideEffects();
      finishCheckout(order_number);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Online path (Razorpay). The cart is only cleared after the server has verified the payment
  // signature; any earlier exit leaves the pending order and cart intact so the shopper can retry.
  async function handleOnlinePayment() {
    if (!validateBeforeOrder()) return;
    setPayError("");
    setPayState("creating");
    try {
      let order = pendingOrder;
      if (!order) {
        const placed = await createWebsiteOrder();
        order = { id: placed.order_id, order_number: placed.order_number };
        setPendingOrder(order);
        await recordOrderSideEffects();
      }

      const gateway = await createRazorpayOrder({
        data: { orderId: order.id, customerPhone: cleanPhone },
      });
      const Razorpay = await loadRazorpayScript();
      if (!Razorpay)
        throw new Error("Could not load the payment window. Check your connection and retry.");

      const orderRef = order;
      const rzp = new Razorpay({
        key: gateway.keyId,
        amount: gateway.amount,
        currency: gateway.currency,
        order_id: gateway.gatewayOrderId,
        name: "Sai Communication",
        description: `Order ${orderRef.order_number}`,
        prefill: { name: form.customer_name, email: form.customer_email, contact: cleanPhone },
        theme: { color: "#F5A623" },
        handler: async (resp) => {
          setPayState("verifying");
          try {
            const result = await verifyRazorpayPayment({
              data: {
                orderId: orderRef.id,
                gatewayOrderId: resp.razorpay_order_id,
                gatewayPaymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              },
            });
            if (!result.verified) {
              setPayState("failed");
              setPayError(
                "We could not verify your payment. If money was deducted, it will be refunded or confirmed shortly — contact the store with your order number.",
              );
              return;
            }
            finishCheckout(result.orderNumber);
          } catch (err) {
            setPayState("failed");
            setPayError(
              err instanceof Error
                ? err.message
                : "Payment verification failed. If money was deducted, contact the store with your order number.",
            );
          }
        },
        modal: {
          ondismiss: () => {
            setPayState((s) => (s === "awaiting" ? "cancelled" : s));
          },
        },
      });
      rzp.on("payment.failed", (resp) => {
        setPayState("failed");
        setPayError(resp.error?.description || "The payment failed. You can try again.");
      });
      setPayState("awaiting");
      rzp.open();
    } catch (err) {
      setPayState("failed");
      setPayError(
        err instanceof Error ? err.message : "Could not start the payment. Please try again.",
      );
    }
  }

  const payBusy = payState === "creating" || payState === "awaiting" || payState === "verifying";

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-2xl font-bold">Your cart is empty.</p>
        <Button asChild className="mt-6">
          <Link to="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>

      {/* Step Indicator */}
      <div className="mt-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => {
                if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4);
              }}
              className={cn(
                "flex flex-col items-center gap-1",
                s.num < step ? "cursor-pointer" : "cursor-default",
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  step === s.num
                    ? "border-primary bg-primary text-primary-foreground"
                    : s.num < step
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {s.num < step ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              <span
                className={cn(
                  "hidden sm:block text-xs",
                  step === s.num ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 sm:w-20 mx-2 transition-colors",
                  s.num < step ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step 1: Customer Details */}
          {step === 1 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="size-5 text-primary" /> Your Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="co-name">Full Name *</Label>
                  <Input
                    id="co-name"
                    value={form.customer_name}
                    onChange={(e) => setF("customer_name", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-phone">Mobile Number *</Label>
                  <Input
                    id="co-phone"
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => setF("customer_phone", e.target.value)}
                    placeholder="10-digit number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-email">Email (optional)</Label>
                  <Input
                    id="co-email"
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => setF("customer_email", e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-dob">Date of Birth (optional)</Label>
                  <Input
                    id="co-dob"
                    type="date"
                    value={form.customer_birthday}
                    onChange={(e) => setF("customer_birthday", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="co-addr">Delivery Address (optional)</Label>
                  <Input
                    id="co-addr"
                    value={form.customer_address}
                    onChange={(e) => setF("customer_address", e.target.value)}
                    placeholder="Your address (if delivery required)"
                  />
                </div>
              </div>
              <div className="space-y-2.5 border-t border-border pt-3">
                <ConsentCheckbox
                  id="co-consent-data"
                  checked={dataConsent}
                  onCheckedChange={setDataConsent}
                >
                  I agree that Sai Communication may use these details to process my order and
                  delivery, as described in the <PrivacyPolicyLink />. *
                </ConsentCheckbox>
                <ConsentCheckbox
                  id="co-consent-marketing"
                  checked={marketingConsent}
                  onCheckedChange={setMarketingConsent}
                >
                  I'd also like to receive order and offer updates by phone/WhatsApp/email
                  (optional).
                </ConsentCheckbox>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!form.customer_name || !form.customer_phone) {
                    toast.error("Name and phone required.");
                    return;
                  }
                  if (!/^\d{10}$/.test(form.customer_phone.replace(/[\s-]/g, ""))) {
                    toast.error("Please enter a valid 10-digit mobile number.");
                    return;
                  }
                  if (!dataConsent) {
                    toast.error("Please agree to let us use your details to process this order.");
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Truck className="size-5 text-primary" /> Delivery Method
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    [
                      "collection",
                      "🏪",
                      "Collect from Store",
                      "Pick up at our Talegaon Dabhade shop.",
                    ],
                    ["delivery", "🚚", "Home Delivery", "Delivery available in select areas."],
                  ] as const
                ).map(([val, icon, title, desc]) => (
                  <button
                    key={val}
                    onClick={() => setF("delivery_type", val)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors",
                      form.delivery_type === val
                        ? "border-primary bg-accent"
                        : "border-border hover:border-border/80",
                    )}
                  >
                    <span className="text-2xl">{icon}</span>
                    <p className="mt-2 font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Finance */}
          {step === 3 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Payment Type
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["full", "💰", "Pay Full Amount", "One-time payment. No EMI."],
                    ["emi", "📆", "Finance / EMI", "Split into monthly instalments."],
                  ] as const
                ).map(([val, icon, title, desc]) => (
                  <button
                    key={val}
                    onClick={() => {
                      // Keep payment_method in sync with the type so Step 4 never
                      // shows "Place Order" enabled against a method that isn't
                      // one of the currently visible options.
                      setForm((f) => ({
                        ...f,
                        payment_type: val,
                        payment_method: val === "emi" ? "emi" : "cash",
                      }));
                    }}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors",
                      form.payment_type === val
                        ? "border-primary bg-accent"
                        : "border-border hover:border-border/80",
                    )}
                  >
                    <span className="text-2xl">{icon}</span>
                    <p className="mt-2 font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>

              {form.payment_type === "emi" && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {financePartners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No finance partners configured. Please contact us at the store for EMI
                      options.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Finance Partner</Label>
                        <Select
                          value={form.finance_partner_id}
                          onValueChange={(v) => setF("finance_partner_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner" />
                          </SelectTrigger>
                          <SelectContent>
                            {financePartners.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedPartner && (
                        <>
                          <div className="space-y-2">
                            <Label>Tenure (months)</Label>
                            <div className="flex flex-wrap gap-2">
                              {(selectedPartner.available_tenures as number[]).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setF("finance_tenure", t)}
                                  className={cn(
                                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                                    form.finance_tenure === t
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {t} months
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="down-payment">Down Payment (₹)</Label>
                            <Input
                              id="down-payment"
                              type="number"
                              min={0}
                              max={payableTotal}
                              value={form.finance_down_payment}
                              onChange={(e) => setF("finance_down_payment", Number(e.target.value))}
                            />
                          </div>
                          {monthlyEMI > 0 && (
                            <div className="rounded-xl bg-accent border border-primary/20 p-4 text-center">
                              <p className="text-xs text-muted-foreground">Estimated Monthly EMI</p>
                              <p className="text-2xl font-bold text-primary">
                                {formatINR(monthlyEMI)} / month
                              </p>
                              <p className="text-xs text-muted-foreground">
                                for {form.finance_tenure} months after{" "}
                                {formatINR(form.finance_down_payment)} down payment
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Final EMI amount subject to finance partner approval.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (
                      form.payment_type === "emi" &&
                      financePartners.length > 0 &&
                      !form.finance_partner_id
                    ) {
                      toast.error("Please choose a finance partner for EMI.");
                      return;
                    }
                    setStep(4);
                  }}
                >
                  Continue <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" /> Payment Method
              </h2>
              <p className="text-sm text-muted-foreground">
                {onlineEnabled
                  ? "Pay securely online now, or choose an in-store option and pay when you collect your order."
                  : "Select how you would like to pay. Payment will be completed at the store or via our representative."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(form.payment_type === "full"
                  ? [
                      ...(onlineEnabled
                        ? [["razorpay", "🔒 Pay Online Now (UPI / Cards / Net Banking)"]]
                        : []),
                      ["cash", "💵 Cash (pay in store)"],
                      ["upi", "📱 UPI / GPay / PhonePe (in store)"],
                      ["credit_card", "💳 Credit Card (in store)"],
                      ["debit_card", "🏧 Debit Card (in store)"],
                      ["net_banking", "🏦 Net Banking (in store)"],
                    ]
                  : [["emi", "📆 EMI via Finance Partner"]]
                ).map((item) => {
                  const val = item[0]!;
                  const label = item[1]!;
                  return (
                    <button
                      key={val}
                      disabled={payBusy}
                      onClick={() => setF("payment_method", val)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left text-sm font-medium transition-colors disabled:opacity-60",
                        form.payment_method === val
                          ? "border-primary bg-accent"
                          : "border-border hover:border-border/80",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.payment_method === "razorpay" && form.payment_type === "full" ? (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">🔒 Secure online payment</p>
                  You will pay {formatINR(payableTotal)} through Razorpay. Your order is confirmed
                  only after the payment is verified by our server — closing the payment window just
                  leaves your order unpaid and you can retry.
                </div>
              ) : (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">ℹ️ Payment Information</p>
                  Payment is collected by our store representative upon order fulfillment. Your
                  order is secured by your unique order number.
                </div>
              )}
              {payState === "verifying" && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-sm"
                >
                  <Loader2 className="size-4 animate-spin text-primary" /> Verifying your payment —
                  please don't close this page…
                </div>
              )}
              {payState === "awaiting" && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-sm"
                >
                  <Loader2 className="size-4 animate-spin text-primary" /> Complete the payment in
                  the Razorpay window.
                </div>
              )}
              {(payState === "failed" || payState === "cancelled") && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium">
                      {payState === "cancelled" ? "Payment cancelled" : "Payment unsuccessful"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payState === "cancelled"
                        ? "You closed the payment window. Your order is saved but unpaid — try again below."
                        : payError || "The payment could not be completed. You can try again."}
                      {pendingOrder ? ` Order number: ${pendingOrder.order_number}.` : ""}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep(3)}
                  disabled={payBusy || !!pendingOrder}
                >
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Button>
                {form.payment_method === "razorpay" && form.payment_type === "full" ? (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handleOnlinePayment}
                    disabled={payBusy}
                  >
                    {payState === "creating" ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Preparing payment…
                      </>
                    ) : payState === "verifying" ? (
                      "Verifying payment…"
                    ) : payState === "failed" || payState === "cancelled" ? (
                      `Retry payment · ${formatINR(payableTotal)}`
                    ) : (
                      `Pay ${formatINR(payableTotal)} securely`
                    )}
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={loading || !form.payment_method || !!pendingOrder}
                  >
                    {loading ? "Placing Order..." : "Place Order"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="card-surface sticky top-20 rounded-2xl p-5">
            <h2 className="font-bold">Order Summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {item.name} ×{item.quantity}
                  </span>
                  <span className="whitespace-nowrap">{formatINR(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3 space-y-2">
              <Label htmlFor="coupon-code" className="text-xs text-muted-foreground">
                Have a coupon code?
              </Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-gold bg-gold/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-gold">
                    <Tag className="size-3.5" /> {appliedCoupon.coupon_code}
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter coupon code"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    {couponLoading ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive-foreground">{couponError}</p>}
            </div>
            <div className="mt-3 border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatINR(total)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-gold font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1">
                <span>Total</span>
                <span className="text-primary">{formatINR(payableTotal)}</span>
              </div>
            </div>
            {form.payment_type === "emi" && monthlyEMI > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                EMI: ~{formatINR(monthlyEMI)}/month × {form.finance_tenure} months
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
