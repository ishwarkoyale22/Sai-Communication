import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EnquiryDialog } from "@/components/EnquiryDialog";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productsQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { CATEGORIES, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Smartphones, Tablets & Accessories | Sai Communication" },
      {
        name: "description",
        content:
          "Browse smartphones, feature phones, tablets and accessories with live in-store stock and prices in ₹. Filter by brand, category and budget.",
      },
      { property: "og:title", content: "Product Catalogue | Sai Communication" },
      {
        property: "og:description",
        content: "Live stock and prices for every phone available at our store.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const [category, setCategory] = useState<string>("All");
  const [brand, setBrand] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [enquiry, setEnquiry] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );
  const priceCeiling = useMemo(
    () => Math.max(10000, ...products.map((p) => Math.ceil(p.price / 1000) * 1000)),
    [products],
  );
  const currentMax = maxPrice ?? priceCeiling;

  const filtered = products.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (brand !== "all" && p.brand !== brand) return false;
    if (p.price > currentMax) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${p.brand} ${p.name} ${p.category}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Our Products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live stock straight from our store counter. Enquire and we'll hold it for you.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              category === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card-surface mt-5 grid gap-5 rounded-2xl p-5 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search phones..."
            value={search}
            maxLength={60}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger aria-label="Filter by brand">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Max budget: <span className="font-semibold text-foreground">{formatINR(currentMax)}</span>
          </p>
          <Slider
            value={[currentMax]}
            min={1000}
            max={priceCeiling}
            step={1000}
            onValueChange={(v) => setMaxPrice(v[0] ?? priceCeiling)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Loading products...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          No products match your filters.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEnquire={setEnquiry}
              onOpen={setDetail}
            />
          ))}
        </div>
      )}

      <EnquiryDialog
        product={enquiry}
        open={enquiry !== null}
        onOpenChange={(v) => !v && setEnquiry(null)}
      />
      <ProductDetailDialog
        product={detail}
        open={detail !== null}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </div>
  );
}
