import { useState } from "react";
import { ShoppingCart, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EnquiryForm } from "@/components/EnquiryDialog";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

// Spec keys that represent selectable variants (RAM, storage, color, etc.)
// rather than plain display specs. Their values are stored as comma-separated
// strings, e.g. specs.ram === "8GB,16GB,32GB".
const VARIANT_SPEC_KEYS: { key: string; label: string }[] = [
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Storage" },
  { key: "color", label: "Color" },
];

const COMBO_SEPARATOR = "|||";

// Combo pricing: specs.variant_prices maps a "|||"-joined combination of
// option values (in VARIANT_SPEC_KEYS order, e.g. "16GB|||256") to an
// absolute price for that exact combo, e.g.
//   { "8GB|||128": 20000, "16GB|||256": 50000, "32GB|||512": 90000 }
// The number of segments in the stored keys tells us which leading
// dimensions (in VARIANT_SPEC_KEYS order) participate in the combo — e.g.
// 2 segments means RAM+Storage price together and Color is priced separately
// (or not at all).
function parseComboPrices(specs: Record<string, unknown>): { dimCount: number; map: Record<string, number> } | null {
  const raw = specs["variant_prices"];
  if (!raw || typeof raw !== "object") return null;
  const map: Record<string, number> = {};
  let dimCount = 0;
  for (const [comboKey, val] of Object.entries(raw as Record<string, unknown>)) {
    const num = Number(val);
    if (Number.isNaN(num)) continue;
    map[comboKey.trim()] = num;
    dimCount = Math.max(dimCount, comboKey.split(COMBO_SEPARATOR).length);
  }
  return Object.keys(map).length > 0 ? { dimCount, map } : null;
}

// Simple per-option price map fallback, e.g.
// specs.ram_prices = { "8GB": 50000, "12GB": 55000, "16GB": 60000 } (any of
// "<key>_price(s)", "<KEY>_price(s)", "<Label> Price(s)" is accepted).
function findPriceMap(specs: Record<string, unknown>, key: string, label: string): Record<string, number> | null {
  const candidates = [
    `${key}_prices`, `${key}_price`,
    `${key.toUpperCase()}_prices`, `${key.toUpperCase()}_price`,
    `${label} Prices`, `${label} Price`,
  ];
  const mapKey = candidates.find((k) => specs[k] != null && typeof specs[k] === "object");
  if (!mapKey) return null;
  const raw = specs[mapKey] as Record<string, unknown>;
  const map: Record<string, number> = {};
  for (const [opt, val] of Object.entries(raw)) {
    const num = Number(val);
    if (!Number.isNaN(num)) map[opt.trim()] = num;
  }
  return Object.keys(map).length > 0 ? map : null;
}

function parseVariantOptions(specs: Record<string, unknown>) {
  return VARIANT_SPEC_KEYS.map(({ key, label }) => {
    const specKey = [key, key.toUpperCase(), label].find((k) => specs[k] != null);
    const raw = specKey ? specs[specKey] : undefined;
    let options: string[] = [];
    if (Array.isArray(raw)) {
      options = raw.map((v) => String(v).trim()).filter(Boolean);
    } else if (typeof raw === "string") {
      options = raw.split(",").map((v) => v.trim()).filter(Boolean);
    }
    const priceMap = findPriceMap(specs, key, label);
    return { key, label, specKey, options, priceMap };
  }).filter((v) => v.options.length > 1);
}

type VariantOption = ReturnType<typeof parseVariantOptions>[number];

// Displayed price, preferring exact combo pricing (specs.variant_prices) once
// every priced dimension is selected; falls back to per-option price maps
// (base price with the cheapest option swapped for the selected one), then to
// the plain base price.
function computeDisplayPrice(
  basePrice: number,
  variants: VariantOption[],
  selected: Record<string, string>,
  combo: { dimCount: number; map: Record<string, number> } | null,
) {
  if (combo) {
    const dims = variants.slice(0, combo.dimCount);
    if (dims.length === combo.dimCount && dims.every((d) => selected[d.key])) {
      const comboKey = dims.map((d) => selected[d.key]).join(COMBO_SEPARATOR);
      if (combo.map[comboKey] != null) return combo.map[comboKey];
    }
  }

  let price = basePrice;
  for (const v of variants) {
    if (!v.priceMap) continue;
    const chosen = selected[v.key];
    const values = Object.values(v.priceMap);
    const cheapest = Math.min(...values);
    const chosenPrice = chosen != null ? v.priceMap[chosen] : undefined;
    if (chosenPrice != null) {
      price += chosenPrice - cheapest;
    }
  }
  return price;
}

// Whether the currently selected combination is actually sellable. Only
// meaningful once specs.variant_prices exists — a combo whose priced
// dimensions are all selected but has no entry in that map (e.g. RAM 8GB +
// Storage 256 was never stocked/priced) is not available, even though the
// product overall is in stock.
function getComboAvailability(
  variants: VariantOption[],
  selected: Record<string, string>,
  combo: { dimCount: number; map: Record<string, number> } | null,
): "unselected" | "unavailable" | "available" {
  if (!combo) return "available";
  const dims = variants.slice(0, combo.dimCount);
  if (!dims.every((d) => selected[d.key])) return "unselected";
  const comboKey = dims.map((d) => selected[d.key]).join(COMBO_SEPARATOR);
  return combo.map[comboKey] != null ? "available" : "unavailable";
}

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
  const [selected, setSelected] = useState<Record<string, string>>({});
  const { addProduct } = useCart();
  if (!product) return null;
  const inStock = product.stock_status !== "out_of_stock"; // low_stock (1-4 left) is still buyable
  const images = product.images.length ? product.images : [""];
  const current = images[Math.min(active, images.length - 1)];
  const variants = parseVariantOptions(product.specs);
  const missingVariant = variants.find((v) => !selected[v.key]);
  const comboPrices = parseComboPrices(product.specs);
  const displayPrice = computeDisplayPrice(product.price, variants, selected, comboPrices);
  const availability = getComboAvailability(variants, selected, comboPrices);
  const comboUnavailable = availability === "unavailable";

  function handleAddToCart() {
    if (!product) return;
    if (missingVariant) {
      toast.error(`Please select ${missingVariant.label}`);
      return;
    }
    if (comboUnavailable) {
      toast.error("This combination is not available");
      return;
    }
    addProduct({ ...product, price: displayPrice }, 1, selected);
    toast.success(`${product.name} added to cart!`);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setActive(0);
          setSelected({});
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <div className="overflow-y-auto scrollbar-hide p-6" data-lenis-prevent>
        <DialogHeader>
          <DialogTitle>
            {product.brand} {product.name}
          </DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-[20px] bg-background border border-border">
              {current ? (
                <img
                  src={current}
                  alt={`${product.brand} ${product.name}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-[#F5A623]/15 text-[#F5A623]">
                    <Smartphone className="size-7" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    In-Store Stock
                  </span>
                </div>
              )}
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
              {comboUnavailable ? (
                <span className="text-lg font-semibold text-destructive">Not Available</span>
              ) : (
                <>
                  <span className="text-2xl font-bold">{formatINR(displayPrice)}</span>
                  {product.original_price != null && product.original_price > displayPrice && (
                    <span className="text-muted-foreground line-through">
                      {formatINR(product.original_price)}
                    </span>
                  )}
                </>
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

            {inStock && variants.length > 0 && (
              <div className="mt-4 space-y-3">
                {variants.map(({ key, label, options, priceMap }) => (
                  <div key={key}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                      {selected[key] ? `: ${selected[key]}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [key]: opt }))}
                          className={cn(
                            "flex flex-col items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            selected[key] === opt
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          <span>{opt}</span>
                          {priceMap?.[opt] != null && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatINR(priceMap[opt])}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!inStock && (
              <p className="mt-4 text-sm text-destructive">
                This item is currently out of stock and on order. Send an enquiry below to check availability.
              </p>
            )}

            {inStock && comboUnavailable && comboPrices && (
              <p className="mt-4 text-sm text-destructive">
                {variants
                  .slice(0, comboPrices.dimCount)
                  .map((v) => `${v.label}: ${selected[v.key]}`)
                  .join(", ")}{" "}
                is not available. Try a different combination or send an enquiry below.
              </p>
            )}

            <dl className="mt-5 space-y-2 text-sm">
              {Object.entries(product.specs)
                .filter(([key]) => !variants.some((v) => v.specKey === key) && key !== "variant_prices" && !/_prices?$/i.test(key) && !/ prices?$/i.test(key))
                .map(([key, value]) => (
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
        </div>

        {inStock && (
          <div className="flex items-center gap-4 border-t border-border bg-background p-4">
            <span className="text-lg font-bold whitespace-nowrap">
              {comboUnavailable ? "—" : formatINR(displayPrice)}
            </span>
            <Button
              className="w-full"
              size="lg"
              onClick={handleAddToCart}
              disabled={!!missingVariant || comboUnavailable}
            >
              <ShoppingCart className="size-4" />
              {missingVariant
                ? `Select ${missingVariant.label}`
                : comboUnavailable
                  ? "Not Available"
                  : "Add to Cart"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
