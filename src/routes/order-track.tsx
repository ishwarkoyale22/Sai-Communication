import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/order-track")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: String(search["phone"] ?? ""),
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
  const { phone: initPhone } = Route.useSearch();
  const [phone, setPhone] = useState(initPhone);
  const [results, setResults] = useState<WebsiteOrder[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) { setError("Please enter your mobile number."); return; }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data, error: qError } = await supabase
        .from("website_orders")
        .select("id, order_number, customer_name, total_amount, payment_status, order_status, created_at")
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false });
      if (qError) throw new Error(qError.message);
      if (!data || data.length === 0) {
        setError("No orders found for this mobile number.");
        setResults([]);
      } else {
        setResults(data as WebsiteOrder[]);
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
        <p className="mt-2 text-sm text-muted-foreground">Enter your mobile number to see all your orders.</p>
      </div>

      <form onSubmit={handleSearch} className="mt-8 card-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="track-phone">Mobile Number</Label>
          <Input id="track-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your 10-digit mobile number" />
        </div>
        {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          <Search className="size-4 mr-2" /> {loading ? "Searching..." : "Track Orders"}
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
