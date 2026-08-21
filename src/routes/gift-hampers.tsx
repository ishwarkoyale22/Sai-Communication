import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Minus, Gift, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hamperProductsQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { Reveal } from "@/components/Reveal";
import { useCart } from "@/context/CartContext";
import type { GiftHamperProduct } from "@/lib/types";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/gift-hampers")({
  head: () => ({
    meta: [
      { title: "Gift Hamper Builder | Sai Communication" },
      { name: "description", content: "Build a custom mobile accessories gift hamper at Sai Communication. Choose phone covers, earphones, chargers, cables and more." },
      { property: "og:title", content: "Gift Hamper Builder | Sai Communication" },
    ],
  }),
  component: GiftHampersPage,
});

function GiftHampersPage() {
  const { data: products = [], isLoading } = useQuery(hamperProductsQuery);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const { addHamperProduct } = useCart();

  const selectedItems = useMemo(() =>
    products.filter((p) => (selections[p.id] ?? 0) > 0).map((p) => ({ ...p, qty: selections[p.id]! })),
    [products, selections]
  );

  const total = useMemo(() =>
    selectedItems.reduce((sum, p) => sum + p.price * p.qty, 0),
    [selectedItems]
  );

  function setQty(id: string, qty: number) {
    setSelections((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  function handleAddToCart() {
    if (selectedItems.length === 0) { toast.error("Select at least one item."); return; }
    selectedItems.forEach((item) => addHamperProduct(item as GiftHamperProduct, item.qty));
    toast.success("Gift hamper added to cart!");
  }

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <span className="eyebrow">Custom Gift Hampers</span>
        <h1 className="mt-6 font-serif text-3xl font-bold sm:text-4xl">
          Build Your <em>Gift Hamper</em>
        </h1>
        <p className="mt-4 text-muted-foreground">
          Select mobile accessories, choose quantities, see the total instantly. Perfect for gifting.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-16">Loading items...</p>
          ) : products.length === 0 ? (
            <div className="card-surface rounded-2xl p-12 text-center">
              <Gift className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Gift hamper items coming soon.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((cat) => {
                const catProducts = products.filter((p) => p.category === cat);
                return (
                  <div key={cat}>
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{cat}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {catProducts.map((product, i) => (
                        <Reveal key={product.id} delay={i * 50}>
                          <HamperItem product={product} qty={selections[product.id] ?? 0} onQtyChange={(q) => setQty(product.id, q)} />
                        </Reveal>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Panel */}
        <div>
          <div className="card-surface sticky top-20 rounded-2xl p-6">
            <h2 className="flex items-center gap-2 font-bold">
              <Gift className="size-5 text-primary" /> Your Hamper
            </h2>
            {selectedItems.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No items selected yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.qty} × {formatINR(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-semibold whitespace-nowrap">{formatINR(item.price * item.qty)}</span>
                      <button onClick={() => setQty(item.id, 0)} className="text-muted-foreground hover:text-destructive-foreground">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">{formatINR(total)}</span>
              </div>
            </div>
            <Button className="mt-4 w-full" size="lg" onClick={handleAddToCart} disabled={selectedItems.length === 0}>
              <ShoppingCart className="size-4 mr-2" /> Add to Cart
            </Button>
            {selectedItems.length > 0 && (
              <Button asChild variant="secondary" className="mt-2 w-full">
                <Link to="/cart">Go to Cart</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HamperItem({ product, qty, onQtyChange }: {
  product: GiftHamperProduct;
  qty: number;
  onQtyChange: (q: number) => void;
}) {
  return (
    <div className={`card-surface rounded-xl p-4 transition-colors ${qty > 0 ? "border-primary/40" : ""}`}>
      <div className="flex gap-3">
        <div className="size-14 shrink-0 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="size-full object-cover" loading="lazy" />
          ) : (
            <Gift className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{product.name}</p>
          <p className="text-xs text-muted-foreground">{formatINR(product.price)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onQtyChange(qty - 1)} className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary hover:border-primary/40 transition-colors">
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
          <button onClick={() => onQtyChange(qty + 1)} className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary hover:border-primary/40 transition-colors">
            <Plus className="size-3.5" />
          </button>
        </div>
        {qty > 0 && (
          <span className="text-primary text-sm font-semibold">{formatINR(product.price * qty)}</span>
        )}
      </div>
    </div>
  );
}
