import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, CreditCard, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import type { AccountOrder, AccountOrderItem } from "@/lib/types";

export const Route = createFileRoute("/account/orders/$orderId")({
  head: () => ({
    meta: [{ title: "Order Details | Sai Communication" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async (): Promise<AccountOrder | null> => {
      const { data, error } = await supabase.from("website_orders").select("*").eq("id", orderId).maybeSingle();
      if (error) throw new Error(error.message);
      return data as AccountOrder | null;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["order-detail-items", orderId],
    queryFn: async (): Promise<AccountOrderItem[]> => {
      const { data, error } = await supabase.from("website_order_items").select("*").eq("order_id", orderId);
      if (error) throw new Error(error.message);
      return (data ?? []) as AccountOrderItem[];
    },
  });

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">Loading order...</div>;
  }

  if (!order || (order.customer_id && order.customer_id !== user?.id)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Package className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't find this order, or it doesn't belong to your account.</p>
        <Link to="/account" className="mt-6 inline-block font-semibold text-primary hover:underline">← Back to My Orders</Link>
      </div>
    );
  }

  const addressNote = order.notes?.match(/Address:\s*([^|]+)/)?.[1]?.trim();
  const deliveryNote = order.notes?.match(/Delivery:\s*([^|]+)/)?.[1]?.trim();
  const emiNote = order.notes?.match(/EMI[^|]*/)?.[0]?.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Back to My Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="card-surface mt-6 rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Order Status</h2>
        <div className="mt-5">
          <OrderTimeline status={order.order_status} />
        </div>
      </div>

      <div className="card-surface mt-4 rounded-2xl p-6">
        <h2 className="font-bold">Items</h2>
        <div className="mt-4 space-y-3">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent text-2xl">
                {item.item_type === "hamper_item" ? "🎁" : "📱"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.item_name}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity} × {formatINR(item.unit_price)}</p>
              </div>
              <p className="font-semibold">{formatINR(item.total_price)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          {order.discount_amount ? (
            <div className="flex justify-between text-gold"><span>Coupon {order.coupon_code ? `(${order.coupon_code})` : ""}</span><span>-{formatINR(order.discount_amount)}</span></div>
          ) : null}
          <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatINR(order.total_amount)}</span></div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-bold"><MapPin className="size-4 text-primary" /> Delivery</h2>
          <p className="mt-2 text-sm text-muted-foreground capitalize">{deliveryNote || order.order_type || "—"}</p>
          {addressNote && <p className="mt-1 text-sm">{addressNote}</p>}
          <p className="mt-2 text-sm">{order.customer_name} · {order.customer_phone}</p>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-bold"><CreditCard className="size-4 text-primary" /> Payment</h2>
          <p className="mt-2 text-sm capitalize">{order.payment_method?.replace(/_/g, " ") || "—"}</p>
          <p className="text-sm text-muted-foreground capitalize">Status: {order.payment_status}</p>
          {(() => {
            // refund fields are added by the shop's refund tracking; older typings don't know them
            const o = order as unknown as { refund_status?: string; refund_amount?: number | null; refund_method?: string | null };
            if (o.refund_status === "refunded")
              return <p className="text-sm font-semibold text-emerald-600">Refunded: {formatINR(Number(o.refund_amount ?? 0))}{o.refund_method ? ` (${o.refund_method.replace("_", " ")})` : ""}</p>;
            if (o.refund_status === "pending")
              return <p className="text-sm font-semibold text-amber-600">Refund pending - the shop will process it.</p>;
            return null;
          })()}
          {emiNote && <p className="mt-1 text-xs text-muted-foreground">{emiNote}</p>}
        </div>
      </div>
    </div>
  );
}
