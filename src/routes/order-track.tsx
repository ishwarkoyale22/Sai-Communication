import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicGetOrderStatus } from "@/lib/admin.functions";
import type { PublicOrderStatus } from "@/lib/types";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/order-track")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_number: String(search["order_number"] ?? ""),
    phone: String(search["phone"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Track Order | Sai Communication" },
      { name: "description", content: "Track your order status at Sai Communication." },
    ],
  }),
  component: OrderTrackPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Received",
  confirmed: "Order Confirmed",
  preparing: "Preparing",
  ready: "Ready for Collection/Delivery",
  collected: "Collected",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const DELIVERY_LABELS: Record<string, string> = {
  pending: "Not Started",
  preparing: "Preparing",
  transfer_requested: "Transfer Requested",
  in_transit: "In Transit",
  ready: "Ready",
  delivered: "Delivered",
  collected: "Collected",
  cancelled: "Cancelled",
};

function OrderTrackPage() {
  const { order_number: initOrderNum, phone: initPhone } = Route.useSearch();
  const [orderNumber, setOrderNumber] = useState(initOrderNum);
  const [phone, setPhone] = useState(initPhone);
  const [result, setResult] = useState<PublicOrderStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber || !phone) { setError("Please enter order number and phone."); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await publicGetOrderStatus({ data: { order_number: orderNumber, phone } }) as PublicOrderStatus;
      setResult(data);
    } catch {
      setError("Order not found. Please check your order number and phone number.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <Package className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Track Your Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your order number and mobile number to check status.</p>
      </div>

      <form onSubmit={handleSearch} className="mt-8 card-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="track-order">Order Number</Label>
          <Input id="track-order" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="SC-20260821-1234" />
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

      {result && (
        <div className="mt-6 card-surface rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="font-bold text-primary">{result.order_number}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold border ${result.order_status === "delivered" || result.order_status === "collected" ? "border-green-400/40 text-green-400 bg-green-400/10" : result.order_status === "cancelled" ? "border-red-400/40 text-red-400 bg-red-400/10" : "border-primary/40 text-primary bg-primary/10"}`}>
              {STATUS_LABELS[result.order_status] ?? result.order_status}
            </span>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{result.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Order Total</span><span className="font-semibold">{formatINR(result.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{result.payment_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Status</span><span>{DELIVERY_LABELS[result.delivery_status] ?? result.delivery_status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Placed On</span><span>{new Date(result.created_at).toLocaleDateString("en-IN")}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
