import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, User, Truck, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import { financePartnersQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CheckoutFormData, Offer } from "@/lib/types";
import { Tag, X as XIcon } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Sai Communication" },
      { name: "robots", content: "noindex" },
    ],
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

function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CheckoutFormData>(() =>
    profile ? { ...EMPTY_FORM, customer_name: profile.full_name, customer_phone: profile.phone, customer_email: profile.email ?? "" } : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const { data: financePartners = [] } = useQuery(financePartnersQuery);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Offer | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

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
  const monthlyEMI = selectedPartner && form.finance_tenure > 0 && loanAmount > 0
    ? Math.ceil(loanAmount / form.finance_tenure)
    : 0;

  async function handlePlaceOrder() {
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Customer name and phone are required.");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    setLoading(true);
    try {
      const order_id = crypto.randomUUID();
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000);
      const order_number = `SC-${d}-${rand}`;

      // website_orders has no columns for delivery address / finance detail —
      // fold that context into `notes` so it isn't silently dropped.
      const noteParts: string[] = [];
      if (form.customer_address) noteParts.push(`Address: ${form.customer_address}`);
      noteParts.push(`Delivery: ${form.delivery_type}`);
      if (form.payment_type === "emi") {
        const partnerName = selectedPartner?.name ?? "TBD";
        noteParts.push(`EMI via ${partnerName}: ${form.finance_tenure} months, down payment ${formatINR(form.finance_down_payment)}, est. EMI ${formatINR(monthlyEMI)}/mo`);
      }

      // order_type is constrained to 'product' | 'hamper' | 'mixed'
      const hasProduct = items.some((i) => i.item_type !== "hamper_product");
      const hasHamper = items.some((i) => i.item_type === "hamper_product");
      const order_type = hasProduct && hasHamper ? "mixed" : hasHamper ? "hamper" : "product";

      const { error: orderError } = await supabase.from("website_orders").insert({
        id: order_id,
        order_number,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        order_type,
        total_amount: payableTotal,
        payment_method: form.payment_method || null,
        payment_status: "pending",
        order_status: "pending",
        notes: noteParts.join(" | "),
        coupon_code: appliedCoupon?.coupon_code ?? null,
        discount_amount: discountAmount || null,
        customer_id: user?.id ?? null,
      });
      if (orderError) throw new Error(orderError.message);

      // Upsert the customer's birthday, keyed by phone number — update the
      // existing record if one matches, otherwise create it. Optional field,
      // so a blank value is simply skipped rather than clearing anything.
      // Best-effort: the order is already placed, so a failure here must
      // not block checkout completion.
      if (form.customer_birthday) {
        try {
          // The customers table is no longer open to the public; this function
          // creates the customer when new and only FILLS a missing birthday for an
          // existing one (it never overwrites another person's record).
          const { error: bdayError } = await supabase.rpc("web_save_customer_birthday", {
            p_name: form.customer_name,
            p_phone: form.customer_phone,
            p_email: form.customer_email || null,
            p_address: form.customer_address || null,
            p_birthday: form.customer_birthday,
          });
          if (bdayError) throw bdayError;
        } catch (err) {
          console.error("Failed to save customer birthday:", err);
        }
      }

      const { error: itemsError } = await supabase.from("website_order_items").insert(
        items.map((item) => ({
          order_id,
          // item_type is constrained to 'product' | 'hamper_item'
          item_type: item.item_type === "hamper_product" ? "hamper_item" : "product",
          inventory_id: item.product?.id ?? item.refurbished?.id ?? null,
          hamper_item_id: item.hamperProduct?.id ?? null,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }))
      );
      if (itemsError) throw new Error(itemsError.message);

      clearCart();
      const phone = form.customer_phone;
      // Reset the form (payment method back to Cash) so a fresh checkout —
      // should the router ever keep this component mounted — never starts
      // from the previous customer's details or payment method.
      setForm(EMPTY_FORM);
      setStep(1);
      setAppliedCoupon(null);
      setCouponInput("");
      navigate({ to: "/order-success", search: { order_number, phone } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-2xl font-bold">Your cart is empty.</p>
        <Button asChild className="mt-6"><Link to="/products">Browse Products</Link></Button>
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
            <button onClick={() => { if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4); }}
              className={cn("flex flex-col items-center gap-1", s.num < step ? "cursor-pointer" : "cursor-default")}>
              <div className={cn("flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                step === s.num ? "border-primary bg-primary text-primary-foreground" :
                  s.num < step ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground")}>
                {s.num < step ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </div>
              <span className={cn("hidden sm:block text-xs", step === s.num ? "text-primary font-medium" : "text-muted-foreground")}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 w-12 sm:w-20 mx-2 transition-colors", s.num < step ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step 1: Customer Details */}
          {step === 1 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><User className="size-5 text-primary" /> Your Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="co-name">Full Name *</Label>
                  <Input id="co-name" value={form.customer_name} onChange={(e) => setF("customer_name", e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-phone">Mobile Number *</Label>
                  <Input id="co-phone" type="tel" value={form.customer_phone} onChange={(e) => setF("customer_phone", e.target.value)} placeholder="10-digit number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-email">Email (optional)</Label>
                  <Input id="co-email" type="email" value={form.customer_email} onChange={(e) => setF("customer_email", e.target.value)} placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-dob">Date of Birth (optional)</Label>
                  <Input id="co-dob" type="date" value={form.customer_birthday} onChange={(e) => setF("customer_birthday", e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="co-addr">Delivery Address (optional)</Label>
                  <Input id="co-addr" value={form.customer_address} onChange={(e) => setF("customer_address", e.target.value)} placeholder="Your address (if delivery required)" />
                </div>
              </div>
              <Button className="w-full" onClick={() => { if (!form.customer_name || !form.customer_phone) { toast.error("Name and phone required."); return; } setStep(2); }}>
                Continue <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="size-5 text-primary" /> Delivery Method</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["collection", "🏪", "Collect from Store", "Pick up at our Talegaon Dabhade shop."], ["delivery", "🚚", "Home Delivery", "Delivery available in select areas."]] as const).map(([val, icon, title, desc]) => (
                  <button key={val} onClick={() => setF("delivery_type", val)}
                    className={cn("rounded-xl border-2 p-4 text-left transition-colors", form.delivery_type === val ? "border-primary bg-accent" : "border-border hover:border-border/80")}>
                    <span className="text-2xl">{icon}</span>
                    <p className="mt-2 font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft className="size-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Continue <ChevronRight className="size-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 3: Finance */}
          {step === 3 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Payment Type</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["full", "💰", "Pay Full Amount", "One-time payment. No EMI."], ["emi", "📆", "Finance / EMI", "Split into monthly instalments."]] as const).map(([val, icon, title, desc]) => (
                  <button key={val} onClick={() => {
                    // Keep payment_method in sync with the type so Step 4 never
                    // shows "Place Order" enabled against a method that isn't
                    // one of the currently visible options.
                    setForm((f) => ({ ...f, payment_type: val, payment_method: val === "emi" ? "emi" : "cash" }));
                  }}
                    className={cn("rounded-xl border-2 p-4 text-left transition-colors", form.payment_type === val ? "border-primary bg-accent" : "border-border hover:border-border/80")}>
                    <span className="text-2xl">{icon}</span>
                    <p className="mt-2 font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>

              {form.payment_type === "emi" && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {financePartners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No finance partners configured. Please contact us at the store for EMI options.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Finance Partner</Label>
                        <Select value={form.finance_partner_id} onValueChange={(v) => setF("finance_partner_id", v)}>
                          <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                          <SelectContent>
                            {financePartners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedPartner && (
                        <>
                          <div className="space-y-2">
                            <Label>Tenure (months)</Label>
                            <div className="flex flex-wrap gap-2">
                              {(selectedPartner.available_tenures as number[]).map((t) => (
                                <button key={t} onClick={() => setF("finance_tenure", t)}
                                  className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                                    form.finance_tenure === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                                  {t} months
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="down-payment">Down Payment (₹)</Label>
                            <Input id="down-payment" type="number" min={0} max={payableTotal} value={form.finance_down_payment} onChange={(e) => setF("finance_down_payment", Number(e.target.value))} />
                          </div>
                          {monthlyEMI > 0 && (
                            <div className="rounded-xl bg-accent border border-primary/20 p-4 text-center">
                              <p className="text-xs text-muted-foreground">Estimated Monthly EMI</p>
                              <p className="text-2xl font-bold text-primary">{formatINR(monthlyEMI)} / month</p>
                              <p className="text-xs text-muted-foreground">for {form.finance_tenure} months after {formatINR(form.finance_down_payment)} down payment</p>
                              <p className="mt-1 text-xs text-muted-foreground">Final EMI amount subject to finance partner approval.</p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}><ArrowLeft className="size-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={() => setStep(4)}>Continue <ChevronRight className="size-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="card-surface rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard className="size-5 text-primary" /> Payment Method</h2>
              <p className="text-sm text-muted-foreground">Select how you would like to pay. Payment will be completed at the store or via our representative.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(form.payment_type === "full" ?
                  [["cash", "💵 Cash"], ["upi", "📱 UPI / GPay / PhonePe"], ["credit_card", "💳 Credit Card"], ["debit_card", "🏧 Debit Card"], ["net_banking", "🏦 Net Banking"]] :
                  [["emi", "📆 EMI via Finance Partner"]]
                ).map(([val, label]) => (
                  <button key={val} onClick={() => setF("payment_method", val)}
                    className={cn("rounded-xl border-2 p-3 text-left text-sm font-medium transition-colors",
                      form.payment_method === val ? "border-primary bg-accent" : "border-border hover:border-border/80")}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">ℹ️ Payment Information</p>
                Payment is collected by our store representative upon order fulfillment. An online payment gateway will be integrated soon. Your order is secured by your unique order number.
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(3)}><ArrowLeft className="size-4 mr-1" /> Back</Button>
                <Button className="flex-1" size="lg" onClick={handlePlaceOrder} disabled={loading || !form.payment_method}>
                  {loading ? "Placing Order..." : "Place Order"}
                </Button>
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
                  <span className="text-muted-foreground truncate">{item.name} ×{item.quantity}</span>
                  <span className="whitespace-nowrap">{formatINR(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3 space-y-2">
              <Label htmlFor="coupon-code" className="text-xs text-muted-foreground">Have a coupon code?</Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-gold bg-gold/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-gold">
                    <Tag className="size-3.5" /> {appliedCoupon.coupon_code}
                  </span>
                  <button type="button" onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
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
                  <Button type="button" variant="secondary" size="sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}>
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
