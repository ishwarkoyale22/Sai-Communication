import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/order-track")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: String(search["phone"] ?? ""),
    order: String(search["order"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Track Order | Sai Communication" },
      { name: "description", content: "Track your orders at Sai Communication by mobile number." },
    ],
  }),
  component: OrderTrackPage,
});

type WebsiteOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Received",
  confirmed: "Order Confirmed",
  preparing: "Preparing",
  ready: "Ready for Collection/Delivery",
  collected: "Collected",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function statusClasses(status: string) {
  if (status === "delivered" || status === "collected") return "border-green-400/40 text-green-400 bg-green-400/10";
  if (status === "cancelled") return "border-red-400/40 text-red-400 bg-red-400/10";
  return "border-primary/40 text-primary bg-primary/10";
}

function OrderTrackPage() {
  const { phone: initPhone, order: initOrder } = Route.useSearch();
  const { user, isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState(initPhone);
  const [orderNumber, setOrderNumber] = useState(initOrder);
  const [results, setResults] = useState<WebsiteOrder[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Two ways in, like Amazon/Flipkart: signed-in customers see only their own orders (matched on their
  // account, never on a typed phone number); guests must give the order number AND the phone it was
  // placed with, so a phone number alone can't be used to browse someone else's orders.
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const num = orderNumber.trim().toUpperCase();
    if (!num || !phone.trim()) { setError("Enter both your order number and the mobile number used for the order."); return; }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data, error: qError } = await supabase.rpc("web_track_orders", { p_phone: phone.trim() });
      if (qError) throw new Error(qError.message);
      const match = ((data ?? []) as WebsiteOrder[]).filter((o) => o.order_number.toUpperCase() === num);
      if (match.length === 0) {
        setError("We couldn't find an order matching that order number and mobile number. Please check both and try again.");
        setResults([]);
      } else {
        setResults(match);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <Package className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Track Your Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your order number and the mobile number you ordered with.</p>
        {!authLoading && user && (
          <p className="mt-3 text-sm">
            Signed in? <Link to="/account" className="font-semibold text-primary underline">See all your orders in My Account</Link>
          </p>
        )}
      </div>

      <form onSubmit={handleSearch} className="mt-8 card-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="track-order">Order Number</Label>
          <Input id="track-order" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g. the number on your order confirmation" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="track-phone">Mobile Number</Label>
          <Input id="track-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your 10-digit mobile number" />
        </div>
        {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          <Search className="size-4 mr-2" /> {loading ? "Searching..." : "Track Order"}
        </Button>
      </form>

      {results && results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((order) => (
            <div key={order.id} className="card-surface rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-bold text-primary">{order.order_number}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold border ${statusClasses(order.order_status)}`}>
                  {STATUS_LABELS[order.order_status] ?? order.order_status}
                </span>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{order.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Order Total</span><span className="font-semibold">{formatINR(order.total_amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{order.payment_status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Placed On</span><span>{new Date(order.created_at).toLocaleDateString("en-IN")}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
