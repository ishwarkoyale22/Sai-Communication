import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { ShoppingCart, Smartphone } from "lucide-react";

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
  const hasDiscount =
    product.original_price != null && product.original_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / (product.original_price as number)) * 100)
    : 0;

  return (
    <article className="card-premium flex flex-col justify-between relative overflow-hidden p-4">
      {/* Discount badge */}
      {hasDiscount && (
        <span className="absolute left-3 top-3 z-10 badge-primary text-[9px] py-0.5">
          -{discountPct}%
        </span>
      )}

      {/* Image container */}
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="img-cover-frame product-spin-frame mb-3 h-36 w-full cursor-pointer"
        aria-label={`View ${product.brand} ${product.name}`}
      >
        {image ? (
          <img
            src={image}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#F5A623]/15 text-[#F5A623]">
              <Smartphone className="size-6" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300">
              In-Store Stock
            </span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#F5A623]">
            {product.brand}
          </span>
          <span
            className={
              inStock
                ? "badge-success"
                : "rounded-full bg-destructive px-2.5 py-0.5 text-[10px] font-semibold text-destructive-foreground"
            }
          >
            {inStock ? "● In Stock" : "Out of Stock"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(product)}
          className="text-left text-sm font-bold leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-2"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          {product.name}
        </button>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="price-tag text-lg">{formatINR(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs line-through text-slate-400 dark:text-slate-400 font-medium">
              {formatINR(product.original_price as number)}
            </span>
          )}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {inStock ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="btn-primary col-span-2"
            style={{ padding: "10px 0", borderRadius: "10px", fontSize: "12.5px", gap: "6px" }}
          >
            <ShoppingCart className="size-3.5" />
            Add to Cart
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEnquire(product)}
              className="btn-ghost col-span-2"
              style={{ padding: "10px 0", borderRadius: "10px", fontSize: "12.5px" }}
            >
              Enquire About This Phone
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onOpen(product)}
          className="btn-ghost col-span-2"
          style={{ padding: "9px 0", borderRadius: "10px", fontSize: "11.5px" }}
        >
          View Details →
        </button>
      </div>
    </article>
  );
}
