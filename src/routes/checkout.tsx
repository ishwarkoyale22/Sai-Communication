import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, User, Truck, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { financePartnersQuery } from "@/lib/queries";
import { publicCreateOrder } from "@/lib/admin.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CheckoutFormData } from "@/lib/types";

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
  delivery_type: "collection",
  payment_type: "full",
  finance_partner_id: "",
  finance_tenure: 12,
  finance_down_payment: 0,
  payment_method: "",
};

function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CheckoutFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const { data: financePartners = [] } = useQuery(financePartnersQuery);

  function setF<K extends keyof CheckoutFormData>(k: K, v: CheckoutFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const selectedPartner = financePartners.find((p) => p.id === form.finance_partner_id);

  const loanAmount = total - (form.finance_down_payment ?? 0);
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
      const result = await publicCreateOrder({
        data: {
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || null,
          customer_address: form.customer_address || null,
          order_type: "direct",
          payment_type: form.payment_type,
          finance_partner_id: form.payment_type === "emi" ? form.finance_partner_id || null : null,
          finance_tenure: form.payment_type === "emi" ? form.finance_tenure : null,
          finance_down_payment: form.payment_type === "emi" ? form.finance_down_payment : null,
          finance_monthly_emi: form.payment_type === "emi" ? monthlyEMI : null,
          subtotal: total,
          discount_amount: 0,
          total_amount: total,
          delivery_type: form.delivery_type,
          items: items.map((item) => ({
            item_type: item.item_type,
            product_id: item.product?.id ?? null,
            refurbished_product_id: item.refurbished?.id ?? null,
            gift_hamper_product_id: item.hamperProduct?.id ?? null,
            name: item.name,
            brand: item.brand || null,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            variant_info: item.variant_info,
          })),
        },
      }) as { order_id: string; order_number: string };
      clearCart();
      navigate({ to: "/order-success", search: { order_number: result.order_number, phone: form.customer_phone } });
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
                  <button key={val} onClick={() => setF("payment_type", val)}
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
                            <Input id="down-payment" type="number" min={0} max={total} value={form.finance_down_payment} onChange={(e) => setF("finance_down_payment", Number(e.target.value))} />
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
            <div className="mt-4 border-t border-border pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatINR(total)}</span>
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
