import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnquiryForm } from "@/components/EnquiryDialog";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [active, setActive] = useState(0);
  if (!product) return null;
  const inStock = product.stock_status === "in_stock";
  const images = product.images.length ? product.images : [""];
  const current = images[Math.min(active, images.length - 1)];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setActive(0);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {product.brand} {product.name}
          </DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-[20px] bg-background border border-border">
              {current ? (
                <img
                  src={current}
                  alt={`${product.brand} ${product.name}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setActive(i)}
                    className={cn(
                      "size-16 overflow-hidden rounded-[14px] border",
                      i === active ? "border-primary" : "border-border",
                    )}
                  >
                    <img src={img} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl font-bold">{formatINR(product.price)}</span>
              {product.original_price != null && product.original_price > product.price && (
                <span className="text-muted-foreground line-through">
                  {formatINR(product.original_price)}
                </span>
              )}
            </div>
            <span
              className={cn(
                "mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold",
                inStock
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground",
              )}
            >
              {inStock ? `In Stock ✓ (${product.stock_qty} available)` : "Out of Stock"}
            </span>

            <dl className="mt-5 space-y-2 text-sm">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[20px] border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Send Enquiry
            </h3>
            <EnquiryForm product={product} onDone={() => onOpenChange(false)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
