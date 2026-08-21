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
    <article className="card-surface hover-glow group flex flex-col overflow-hidden rounded-[20px] p-2">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-4/3 w-full overflow-hidden rounded-[14px] border border-[#1e1e1e] bg-background"
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
            "absolute left-3 top-3 rounded-full border px-3 py-[3px] text-[9px] font-medium uppercase tracking-[0.5px]",
            inStock
              ? "border-[#33330a] bg-[#1a1a0a] text-[#a89060]"
              : "border-[#3a2a22] bg-[#1a1210] text-[#a87a60]",
          )}
        >
          {inStock ? "In Stock" : "Out of Stock"}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[2.5px] text-[#666660]">
            {product.brand}
          </p>
          <h3 className="mt-1 line-clamp-1 font-serif text-[17px] font-semibold text-card-foreground">
            {product.name}
          </h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-primary">{formatINR(product.price)}</span>
          {product.original_price != null && product.original_price > product.price && (
            <span className="text-xs font-light text-[#444440] line-through">
              {formatINR(product.original_price)}
            </span>
          )}
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full border-[#2a2a22] bg-transparent text-xs font-medium tracking-[0.3px] text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
            onClick={() => onOpen(product)}
          >
            Details
          </Button>
          {product.stock_status === "in_stock" ? (
            <Button
              size="sm"
              className="flex-1 rounded-full text-xs font-semibold tracking-[0.3px]"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="size-3.5 mr-1" /> Add to Cart
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 rounded-full text-xs font-semibold tracking-[0.3px]"
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
