import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export function ProductCard({
  product,
  onEnquire,
  onOpen,
}: {
  product: Product;
  onEnquire: (p: Product) => void;
  onOpen: (p: Product) => void;
}) {
  const { addProduct } = useCart();
  function handleAddToCart() {
    addProduct(product, 1);
    toast.success(`${product.name} added to cart!`);
  }
  const inStock = product.stock_status === "in_stock";
  const image = product.images[0];

  return (
    <article className="card-surface hover-glow group flex flex-col overflow-hidden p-2">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-4/3 w-full overflow-hidden border border-border bg-muted"
        aria-label={`View ${product.brand} ${product.name}`}
      >
        {image ? (
          <img
            src={image}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        <span
          className={cn(
            "absolute left-3 top-3 border px-3 py-[3px] text-[9px] font-medium uppercase tracking-[0.5px]",
            inStock
              ? "border-success/30 bg-success text-success-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="caption-mono">{product.brand}</p>
          <h3 className="mt-1 line-clamp-1 font-serif text-[17px] font-medium text-card-foreground">
            {product.name}
          </h3>
        </div>
        <hr className="border-border" />
        <div className="flex items-baseline gap-2">
          <span className="caption-mono text-[9px]">Price</span>
          <span className="text-lg font-medium text-primary">{formatINR(product.price)}</span>
          {product.original_price != null && product.original_price > product.price && (
            <span className="text-xs font-light text-muted-foreground/70 line-through">
              {formatINR(product.original_price)}
            </span>
          )}
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs font-medium tracking-[0.3px]"
            onClick={() => onOpen(product)}
          >
            Details
          </Button>
          {product.stock_status === "in_stock" ? (
            <Button
              size="sm"
              className="flex-1 text-xs font-semibold tracking-[0.3px]"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="size-3.5 mr-1" /> Add to Cart
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 text-xs font-semibold tracking-[0.3px]"
              onClick={() => onEnquire(product)}
            >
              Enquire
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
