import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart | Sai Communication" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <ShoppingCart className="mx-auto size-16 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add phones or accessories to get started.</p>
        <Button asChild className="mt-8"><Link to="/products">Browse Products</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Cart</h1>
        <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive-foreground">Clear all</button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <Reveal key={item.id}>
              <div className="card-surface rounded-2xl p-4">
                <div className="flex gap-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-secondary/50 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <ShoppingCart className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{item.brand}</p>
                    <p className="font-semibold leading-tight mt-0.5">{item.name}</p>
                    {Object.entries(item.variant_info).map(([k, v]) => (
                      <span key={k} className="text-xs text-muted-foreground">{k}: {v} </span>
                    ))}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="flex size-8 items-center justify-center rounded-full border border-border hover:border-primary/40">
                          <Minus className="size-3" />
                        </button>
                        <span className="w-5 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="flex size-8 items-center justify-center rounded-full border border-border hover:border-primary/40">
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive-foreground">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatINR(item.price * item.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{formatINR(item.price)} each</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div>
          <div className="card-surface sticky top-20 rounded-2xl p-6">
            <h2 className="font-bold text-lg">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span className="truncate mr-2">{item.name} ×{item.quantity}</span>
                  <span className="whitespace-nowrap">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary text-lg">{formatINR(total)}</span>
            </div>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/checkout">
                Proceed to Checkout <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="mt-2 w-full">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
