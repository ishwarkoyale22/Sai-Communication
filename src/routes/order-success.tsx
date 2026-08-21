import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, MessageCircle, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/order-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_number: String(search["order_number"] ?? ""),
    phone: String(search["phone"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Order Placed | Sai Communication" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { order_number, phone } = Route.useSearch();
  const settings = useSettings();
  const whatsapp = (settings["whatsapp"] || "917507575755").replace(/\D/g, "");
  const waMsg = encodeURIComponent(`Hello, I have placed an order at Sai Communication. My order number is ${order_number}.`);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="flex justify-center">
        <div className="relative">
          <div className="size-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center animate-scale-in">
            <CheckCircle className="size-12 text-primary" />
          </div>
        </div>
      </div>
      <h1 className="mt-8 text-3xl font-bold">Order Placed!</h1>
      <p className="mt-3 text-muted-foreground">
        Thank you! Your order has been received. Our team will contact you to confirm.
      </p>
      <div className="mt-8 card-surface rounded-2xl p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Your Order Number</p>
        <p className="mt-2 font-serif text-2xl font-bold text-primary">{order_number}</p>
        <p className="mt-1 text-xs text-muted-foreground">Save this number to track your order status.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild size="lg" className="w-full">
          <a href={`https://wa.me/${whatsapp}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 mr-2" /> Confirm on WhatsApp
          </a>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link to="/order-track" search={{ order_number, phone }}>
            <Search className="size-4 mr-2" /> Track Order Status
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full border-border">
          <Link to="/products">Continue Shopping</Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Questions? Call us: <a href={`tel:${settings["phone"]}`} className="text-primary">{settings["phone"]}</a>
      </p>
    </div>
  );
}
