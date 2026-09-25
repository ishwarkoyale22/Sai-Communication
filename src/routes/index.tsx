import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Wrench,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Phone,
  MessageCircle,
  Clock,
  Award,
  Sparkles,
  Facebook,
  Instagram,
  ShoppingCart,
  Smartphone,
  Gift,
  BatteryMedium,
  Flame,
  CreditCard,
} from "lucide-react";
import vijaySirPhoto from "@/assets/vijay-sir.webp";
import heroPhonesImg from "@/assets/hero_phones_transparent.webp";
import { useSettings } from "@/hooks/useSettings";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { productsQuery, refurbishedQuery, heroBannerOfferQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { offerDiscountText, type Offer, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EnquiryDialog } from "@/components/EnquiryDialog";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sai Communication — Mobile Store, Phone Repair, Refurbished & EMI | Talegaon Pune" },
      {
        name: "description",
        content:
          "Sai Communication in Talegaon Dabhade, Pune: brand-new smartphones, same-day phone repair, certified refurbished phones and zero-down EMI.",
      },
      { property: "og:title", content: "Sai Communication — Mobile Store & Repair, Talegaon Dabhade" },
    ],
  }),
  component: HomePage,
});

const SERVICE_LINKS = [
  { label: "Certified Refurbished", to: "/refurbished" as const, badge: "Warranty" },
  { label: "Repair & Service", to: "/repair" as const, badge: "Same-day" },
  { label: "Custom Gift Hampers", to: "/gift-hampers" as const, badge: "New" },
];

// No dedicated "gift"/"festive" flag exists on the offers table, so we
// detect a festival or gift-themed campaign from its title/description —
// matches the site's own naming for seasonal pushes (Diwali, Christmas,
// Holi, gift hampers, etc.) and gives it a distinct, celebratory look in
// the hero strip instead of blending in with every other offer.
const FESTIVE_KEYWORDS = ["diwali", "christmas", "holi", "festival", "festive", "gift", "hamper", "new year", "eid", "rakhi"];

function isFestiveOffer(offer: Offer): boolean {
  const text = `${offer.title} ${offer.description ?? ""}`.toLowerCase();
  return FESTIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function HeroBannerOfferStrip({ offer }: { offer: Offer }) {
  const festive = isFestiveOffer(offer);
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 backdrop-blur-md border",
        festive ? "festive-strip border-gold/40" : "bg-white/15 border-white/20"
      )}
    >
      {festive && <Gift className="festive-strip-icon size-3.5 text-gold" />}
      <span className="badge-primary text-[10px]">{offerDiscountText(offer)}</span>
      <span className={cn("text-xs font-semibold tracking-tight", festive ? "text-white" : "text-white/90")}>
        {offer.title || "Limited Time Offer"}
      </span>
    </div>
  );
}

function ProductThumbnail({ src, alt }: { src?: string; alt: string }) {
  if (!src)
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Smartphone className="size-10 text-muted-foreground/30" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
          In-Store Stock
        </span>
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-contain" />;
}

function HomePage() {
  const settings = useSettings();
  const { addProduct } = useCart();

  const [selectedBrand, setSelectedBrand] = useState("All");
  const [enquiryProduct, setEnquiryProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const { data: products = [] } = useQuery(productsQuery);
  const { data: refurbs = [] } = useQuery(refurbishedQuery);
  const { data: heroBanner } = useQuery(heroBannerOfferQuery);

  const phone = settings["phone"] || "09845458942";
  const whatsapp = settings["whatsapp"] || phone.replace(/\D/g, "");
  const rating = settings["rating"] || "4.8";
  const totalRatings = settings["total_ratings"] || "500";
  const ownerName = settings["owner_name"] || "Vijay Sir";
  const ownerPhoto = settings["owner_photo"] || vijaySirPhoto;

  const brands = useMemo(() => {
    const b = new Set(products.map((p) => p.brand));
    return Array.from(b).sort();
  }, [products]);

  const brandCounts = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => m.set(p.brand, (m.get(p.brand) ?? 0) + 1));
    return m;
  }, [products]);

  const cheapestPrice = useMemo(() => {
    // Ignore ₹0 / unset prices so "Starting from" never advertises a broken price.
    const priced = products.map((p) => p.price).filter((price) => price > 0);
    return priced.length ? Math.min(...priced) : null;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedBrand === "All") return products.slice(0, 9);
    const matches = products.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    return matches.length > 0 ? matches : products.slice(0, 6);
  }, [products, selectedBrand]);

  const refurbShowcase = useMemo(() => refurbs.slice(0, 3), [refurbs]);

  function handleAddToCart(p: Product) {
    addProduct(p, 1);
    toast.success(`${p.name} added to cart!`, {
      description: "Item saved. Proceed to checkout anytime.",
    });
  }

  return (
    <div style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-[480px] rounded-full bg-white/8 blur-[80px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 size-80 rounded-full bg-primary/20 blur-[60px]" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">

            {/* ── Left copy ── */}
            <div className="lg:col-span-7 space-y-7 text-left">
              {/* Eyebrow */}
              {heroBanner ? (
                <HeroBannerOfferStrip offer={heroBanner} />
              ) : (
                <div className="inline-flex items-center gap-2.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md border border-white/20">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Talegaon Dabhade's Store Since 2005
                </div>
              )}

              {/* Display heading */}
              <h1 className="font-serif font-black leading-[1.0] tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(2.4rem, 5vw + 1rem, 4.8rem)" }}>
                Honest Advice.{" "}
                <span
                  className="text-gradient-brand"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 60%, var(--primary-glow) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Genuine Devices.
                </span>
              </h1>

              {/* Subline */}
              <p className="max-w-lg text-[15px] leading-[1.75] text-white/80 font-medium">
                Brand-new sealed handsets, same-day repairs, and tested refurbished phones —
                all from the same counter{" "}
                <strong className="text-white font-bold">{ownerName}</strong> has run
                in Talegaon Dabhade since 2005.
              </p>

              {/* Price badge */}
              {cheapestPrice != null && (
                <div className="card-glass inline-flex items-baseline gap-2.5 px-5 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                    Starting from
                  </span>
                  <span className="price-tag text-2xl sm:text-3xl text-primary">
                    {formatINR(cheapestPrice)}
                  </span>
                  <span className="text-[11px] text-white/60">· In-store today</span>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/products"
                  search={{ q: "", category: "All" }}
                  className="btn-primary-pulse"
                >
                  <ShoppingCart className="size-4" />
                  Explore New Phones
                </Link>
                <Link to="/repair" className="btn-outline">
                  <Wrench className="size-4 text-primary" />
                  Book a Repair
                </Link>
              </div>

              {/* Trust micro-badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-xl">
                {[
                  { icon: Clock, label: "Same-day Repairs", sub: "Screen & battery" },
                  { icon: ShieldCheck, label: "Zero-Down EMI", sub: "In-store approval" },
                  { icon: CheckCircle, label: "Genuine Devices", sub: "Official warranty" },
                  { icon: Award, label: `${settings["years_in_business"] || "21+"} Yrs`, sub: "Community trust" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="card-glass flex items-center gap-2.5 p-2.5">
                    <Icon className="size-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold leading-tight text-white">{label}</p>
                      <p className="text-[10px] text-white/65 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right phone image ── */}
            <div className="relative lg:col-span-5 flex justify-center items-center mt-12 lg:mt-0">
              <div className="relative w-full max-w-lg">
                <img
                  src={heroPhonesImg}
                  alt="Smartphones available at Sai Communication, Talegaon Dabhade"
                  width={1024}
                  height={790}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-auto object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.4)] hover:scale-[1.03] transition-transform duration-700"
                />

                {/* Floating card — bottom left */}
                <div className="absolute -bottom-5 left-2 sm:left-4 card-glass px-4 py-3 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <CheckCircle className="size-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold leading-tight text-white">100% Genuine Devices</p>
                    <p className="text-[10px] text-white/65 mt-0.5">Official brand warranty</p>
                  </div>
                </div>

                {/* Floating card — top right */}
                <div className="absolute -top-4 right-2 sm:right-4 card-glass flex items-center gap-2 px-3.5 py-2.5">
                  <Award className="size-4 text-primary" />
                  <span className="text-[12px] font-bold text-white">
                    {settings["years_in_business"] || "21+"} Years Trust
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 1. LIVE STORE TICKER STRIP ──────────────────────── */}
      <div
        className="relative overflow-hidden border-y py-2.5 text-xs font-bold shadow-xs"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        <div className="ticker-track flex items-center gap-8 whitespace-nowrap">
          {/* Duplicated for seamless loop */}
          {[1, 2].map((loop) => (
            <div key={loop} className="flex items-center gap-8">
              <span className="flex items-center gap-2 text-primary">
                <Flame className="size-4 animate-bounce" />
                <span className="font-extrabold uppercase tracking-wider">FESTIVAL EXCHANGE BONANZA:</span>
                <span style={{ color: "var(--foreground)" }}>Get Extra ₹3,500 Bonus on Old Handsets</span>
              </span>
              <span className="text-muted-foreground/40">✦</span>
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-500" />
                <span className="font-bold">ZERO-DOWN EMI:</span>
                <span style={{ color: "var(--muted-foreground)" }}>Bajaj Finserv &amp; TVS Credit — Approval in 10 Mins</span>
              </span>
              <span className="text-muted-foreground/40">✦</span>
              <span className="flex items-center gap-2 text-amber-500">
                <Wrench className="size-4" />
                <span className="font-bold">CHIP-LEVEL LAB:</span>
                <span style={{ color: "var(--foreground)" }}>30-Minute Screen &amp; Battery Replacement in Talegaon</span>
              </span>
              <span className="text-muted-foreground/40">✦</span>
              <span className="flex items-center gap-2 text-purple-500">
                <Gift className="size-4" />
                <span className="font-bold">COMPLIMENTARY HAMPER:</span>
                <span style={{ color: "var(--muted-foreground)" }}>Free 20W Charger + 9D Tempered Glass with Every New Phone</span>
              </span>
              <span className="text-muted-foreground/40">✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── BRAND FILTER STRIP ──────────────────────────────── */}
      {brands.length > 0 && (
        <section
          // top-0, not a hardcoded header-height offset — SiteHeader hides
          // itself on scroll-down (see SiteHeader.tsx), so by the time this
          // bar reaches the top of the viewport the header is out of the
          // way. A fixed offset here would fight that and overlap it.
          className="sticky top-0 z-30 border-y shadow-xs"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 py-3 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold uppercase tracking-widest pr-3"
                   style={{ color: "var(--foreground)" }}>
                <span className="material-symbols-outlined text-[15px] text-primary">tune</span>
                Filter:
              </div>
              <div className="flex items-center gap-2">
                {["All", ...brands].map((brand) => {
                  const isActive = selectedBrand === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedBrand(brand)}
                      className={isActive ? "tab-chip tab-chip-active" : "tab-chip"}
                    >
                      {brand === "All" ? "All Handsets" : brand}
                    </button>
                  );
                })}
              </div>
              <Link
                to="/products"
                search={{ q: "", category: "All" }}
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
              >
                Full List ({products.length}) →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── TWO-COLUMN: SIDEBAR + PRODUCTS ─────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12">

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 space-y-5">

            {/* Catalog nav */}
            <Reveal className="card-premium p-5">
              <div className="flex items-center justify-between border-b pb-3 mb-1"
                   style={{ borderColor: "var(--border)" }}>
                <span className="eyebrow-label">Store Catalog</span>
                <span className="badge-primary text-[9px] py-0.5 px-2">Talegaon Stock</span>
              </div>
              <ul className="mt-2 divide-y text-xs" style={{ borderColor: "var(--border)" }}>
                {brands.map((brand) => {
                  const isSelected = selectedBrand === brand;
                  return (
                    <li key={brand}>
                      <button
                        type="button"
                        onClick={() => setSelectedBrand(brand)}
                        className={`flex w-full items-center justify-between py-2.5 transition-colors cursor-pointer rounded-md px-1 ${
                          isSelected ? "font-bold text-primary" : "text-foreground/80 hover:text-foreground font-semibold"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Smartphone className="size-3.5 opacity-60 text-primary" />
                          {brand}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                          {brandCounts.get(brand)}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {SERVICE_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="flex items-center justify-between py-2.5 text-foreground/80 hover:text-foreground font-semibold transition-colors px-1 rounded-md">
                      <span className="flex items-center gap-2">
                        {item.to === "/repair" && <Wrench className="size-3.5 text-primary" />}
                        {item.to === "/refurbished" && <RefreshCw className="size-3.5 text-primary" />}
                        {item.to === "/gift-hampers" && <Gift className="size-3.5 text-primary" />}
                        {item.label}
                      </span>
                      <span className="badge-primary text-[9px] py-0.5">{item.badge}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Promo card */}
            <Reveal
              delay={80}
              className="relative overflow-hidden rounded-2xl p-6 shadow-md"
              style={{ background: "linear-gradient(135deg, #F5A623 0%, #FFB540 100%)", color: "#1B2430" }}
            >
              <div className="pointer-events-none absolute -right-8 -bottom-8 size-36 rounded-full bg-white/20 blur-2xl" />
              <div className="pointer-events-none absolute -top-6 -left-6 size-24 rounded-full bg-white/15 blur-xl" />
              <div className="badge-dark mb-3 text-[10px]">Current Offers</div>
              <h3 className="font-serif text-2xl font-black leading-tight text-[#1B2430]">
                This Week's Deals
              </h3>
              <p className="mt-2 text-sm font-semibold text-[#1B2430]/90 leading-relaxed">
                Exchange bonuses on your old smartphone &amp; zero-down EMI with instant in-store approval.
              </p>
              <Link
                to="/offers"
                className="btn-dark mt-5 text-white"
                style={{ color: "white", background: "#1B2430" }}
              >
                View All Offers <ArrowRight className="size-3.5" />
              </Link>
            </Reveal>

            {/* Founder trust card */}
            <Reveal delay={160} className="card-premium p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="size-14 overflow-hidden rounded-full border-2 border-primary p-0.5 shadow shrink-0">
                  <img
                    src={ownerPhoto}
                    alt={ownerName}
                    loading="lazy"
                    decoding="async"
                    className="size-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-serif text-base font-extrabold leading-tight"
                      style={{ color: "var(--foreground)" }}>{ownerName}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Founder &amp; Owner</p>
                  <span className="badge-primary mt-1 text-[9px] py-0.5">
                    Since {settings["established"] || "2005"} · {settings["years_in_business"] || "21+"} Yrs
                  </span>
                </div>
              </div>

              <blockquote className="border-l-2 border-primary pl-3 text-xs leading-relaxed italic"
                          style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}>
                {settings["owner_intro"] ||
                  "\"Our commitment is simple: We will never sell you a phone or repair you do not need.\""}
              </blockquote>

              <div className="flex items-center justify-between pt-1 text-xs border-t"
                   style={{ borderColor: "var(--border)" }}>
                <Link to="/about" className="font-bold text-foreground hover:text-primary transition-colors">
                  Founder Story →
                </Link>
                <a href={`tel:${phone}`} className="font-bold text-primary hover:underline flex items-center gap-1">
                  <Phone className="size-3" /> Call Shop
                </a>
              </div>
            </Reveal>
          </aside>

          {/* ── Featured Products ── */}
          <main className="lg:col-span-8 space-y-10">
            <Reveal
              className="flex flex-wrap items-end justify-between gap-3 border-b pb-5"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <span className="eyebrow-label mb-2 block">New Arrivals</span>
                <h2 className="section-title text-2xl sm:text-3xl" style={{ color: "var(--foreground)" }}>
                  Featured Smartphones
                </h2>
                <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                  Showing <strong style={{ color: "var(--foreground)" }}>{selectedBrand}</strong> devices · Official manufacturer warranty.
                </p>
              </div>
              <span className="badge-outline">{filteredProducts.length} items available</span>
            </Reveal>

            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Smartphone className="size-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No products in stock right now — check back soon.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product, index) => {
                  const image = product.images[0];
                  const inStock = product.stock_status === "in_stock";
                  const hasDiscount = product.original_price != null && product.original_price > product.price;
                  const discountPct = hasDiscount
                    ? Math.round((1 - product.price / (product.original_price as number)) * 100)
                    : 0;

                  return (
                    <Reveal
                      key={product.id}
                      delay={(index % 3) * 90}
                      className="card-premium p-4 flex flex-col justify-between group"
                    >
                      {/* Image */}
                      <button
                        type="button"
                        onClick={() => setDetailProduct(product)}
                        className="relative img-cover-frame product-spin-frame h-44 w-full mb-4 cursor-pointer"
                      >
                        {hasDiscount && (
                          <span className="absolute left-2.5 top-2.5 z-10 badge-primary text-[9px] py-0.5 px-2">
                            -{discountPct}%
                          </span>
                        )}
                        <span className="absolute right-2.5 top-2.5 z-10 badge-outline text-[9px] py-0.5">
                          {product.brand}
                        </span>
                        <ProductThumbnail src={image} alt={product.name} />
                      </button>

                      {/* Text */}
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: "var(--muted-foreground)" }}>
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
                          onClick={() => setDetailProduct(product)}
                          className="text-left font-serif text-sm font-bold leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-2"
                          style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}
                        >
                          {product.name}
                        </button>
                      </div>

                      {/* Price + Actions */}
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-baseline gap-2 mb-3.5">
                          <span className="price-tag text-xl">{formatINR(product.price)}</span>
                          {hasDiscount && (
                            <span className="text-xs line-through" style={{ color: "var(--muted-foreground)" }}>
                              {formatINR(product.original_price as number)}
                            </span>
                          )}
                        </div>
                        {inStock ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="btn-primary text-xs px-0 py-2.5 rounded-xl"
                              style={{ padding: "10px 0", borderRadius: "10px", fontSize: "12px" }}
                            >
                              <ShoppingCart className="size-3.5" />
                              Add to Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => setEnquiryProduct(product)}
                              className="btn-ghost text-xs"
                              style={{ padding: "10px 0", borderRadius: "10px", fontSize: "12px" }}
                            >
                              Enquire
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-destructive text-center">
                              Currently out of stock — on order
                            </p>
                            <button
                              type="button"
                              onClick={() => setEnquiryProduct(product)}
                              className="btn-ghost text-xs w-full"
                              style={{ padding: "10px 0", borderRadius: "10px", fontSize: "12px" }}
                            >
                              Enquire About This Item
                            </button>
                          </div>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}

            {/* ── Refurbished Showcase ── */}
            {refurbShowcase.length > 0 && (
              <Reveal className="card-inset p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="eyebrow-label mb-1.5 block">Pre-Owned</span>
                    <h3 className="font-serif text-lg font-black" style={{ color: "var(--foreground)" }}>
                      Certified Refurbished
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      Inspected, graded & warrantied in-store.
                    </p>
                  </div>
                  <Link to="/refurbished" className="text-xs font-bold text-primary hover:underline">
                    View All ({refurbs.length}) →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {refurbShowcase.map((item) => (
                    <div key={item.id} className="card-premium p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: "var(--muted-foreground)" }}>{item.brand}</span>
                          <h4 className="font-bold text-xs leading-tight line-clamp-1 mt-0.5"
                              style={{ color: "var(--foreground)" }}>{item.model}</h4>
                        </div>
                        <span className="badge-primary text-[9px] py-0.5">
                          Grade {item.condition_grade ?? item.condition}
                        </span>
                      </div>

                      <div className="text-[10px] space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {item.storage && <p>Storage: {item.storage}</p>}
                        {item.battery_health && (
                          <p className="flex items-center gap-1">
                            <BatteryMedium className="size-3" /> Battery: {item.battery_health}%
                          </p>
                        )}
                        {item.warranty && (
                          <p className="flex items-center gap-1">
                            <CheckCircle className="size-3" /> {item.warranty}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t"
                           style={{ borderColor: "var(--border)" }}>
                        <span className="price-tag text-sm">{formatINR(item.price)}</span>
                        <Link to="/refurbished" className="btn-dark text-[10px]"
                              style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "10px" }}>
                          Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </main>
        </div>
      </section>

      {/* ─── TRUST ROW ────────────────────────────────────────── */}
      <section className="border-y" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal className="text-center mb-10">
            <span className="eyebrow-label justify-center">Why Choose Us</span>
            <h2 className="font-serif text-2xl font-black mt-3" style={{ color: "var(--foreground)" }}>
              The Sai Communication Promise
            </h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "100% Genuine Devices",
                desc: "Original sealed packaging, official brand warranty & GST tax invoice on every purchase.",
              },
              {
                icon: Wrench,
                title: "Same-Day Repairs",
                desc: "In-house chip-level lab with skilled technicians and genuine spare parts.",
              },
              {
                icon: Sparkles,
                title: "Zero-Down EMI Plans",
                desc: "In-store finance approval — no separate bank branch visit required.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 100} className="card-premium p-6 flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl text-primary"
                     style={{ background: "var(--accent)" }}>
                  <Icon className="size-6" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-black" style={{ color: "var(--foreground)" }}>{title}</h4>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CUSTOMER REVIEWS & TESTIMONIALS ──────────────────── */}
      <ReviewsSection />

      {/* ─── SOCIAL / CONTACT CTA ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Reveal
          className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow">
              <Facebook className="size-7" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-black" style={{ color: "var(--foreground)" }}>
                Stay in the Loop
              </h3>
              <p className="mt-0.5 text-xs max-w-xl" style={{ color: "var(--muted-foreground)" }}>
                Price drops, festival codes and repair updates — straight from {ownerName} and the team.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {settings["facebook"] && (
              <a
                href={settings["facebook"]}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-dark text-xs"
                style={{ background: "#1877F2", color: "white", padding: "11px 20px", borderRadius: "10px" }}
              >
                <Facebook className="size-4" />
                Follow on Facebook
              </a>
            )}
            <a
              href={"https://www.instagram.com/saicommunication_2266/"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-dark text-xs"
              style={{ background: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)", color: "white", padding: "11px 20px", borderRadius: "10px" }}
            >
              <Instagram className="size-4" />
              Follow on Instagram
            </a>
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                "Hello Sai Communication, I would like to enquire about your latest phone deals",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-dark text-xs"
              style={{ background: "#25D366", color: "white", padding: "11px 20px", borderRadius: "10px" }}
            >
              <MessageCircle className="size-4" />
              Chat on WhatsApp
            </a>
          </div>
        </Reveal>
        <p className="mt-4 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          Rated {rating} / 5 from {totalRatings}+ customers on Justdial.
        </p>
      </section>

      <EnquiryDialog product={enquiryProduct} open={enquiryProduct !== null} onOpenChange={(v) => !v && setEnquiryProduct(null)} />
      <ProductDetailDialog product={detailProduct} open={detailProduct !== null} onOpenChange={(v) => !v && setDetailProduct(null)} />
    </div>
  );
}
