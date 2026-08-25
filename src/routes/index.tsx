import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Award,
  BadgeCheck,
  Headphones,
  MapPin,
  ShieldCheck,
  Star,
  Clock,
  Wrench,
  Sparkles,
  Gift,
  RefreshCw,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import vijaySirPhoto from "@/assets/vijay-sir.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { EnquiryDialog } from "@/components/EnquiryDialog";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { useSettings } from "@/hooks/useSettings";
import { productsQuery, refurbishedQuery, offersQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sai Communication — Mobile Store, Phone Repair, Refurbished & EMI | Talegaon Pune" },
      {
        name: "description",
        content:
          "Sai Communication in Talegaon Dabhade Pune: Latest smartphones, same-day mobile repair, certified refurbished phones, custom gift hampers and easy EMI finance.",
      },
      { property: "og:title", content: "Sai Communication — Mobile Store & Repair Hub" },
    ],
  }),
  component: HomePage,
});

const PILLARS = [
  { icon: Wrench, title: "Phone Repair", desc: "45-min screen & battery fixes", to: "/repair" },
  { icon: RefreshCw, title: "Refurbished Phones", desc: "Tested with warranty", to: "/refurbished" },
  { icon: Gift, title: "Gift Hampers", desc: "Custom accessory kits", to: "/gift-hampers" },
  { icon: CreditCard, title: "Easy EMI", desc: "Zero down payment plans", to: "/products" },
];

const WHY = [
  { icon: Award, title: "21+ Years of Trust", text: "Serving Talegaon Dabhade and Pune since 2005." },
  { icon: ShieldCheck, title: "100% Genuine Products", text: "Original sealed devices with official brand warranty." },
  { icon: BadgeCheck, title: "Certified Technicians", text: "Fast in-house repairs using genuine grade parts." },
  { icon: Headphones, title: "Friendly After-Sale Support", text: "Walk in anytime for data transfer, setup & help." },
];

const BRANDS = ["Samsung", "Apple", "Vivo", "Oppo", "Realme", "OnePlus", "Xiaomi", "Motorola"];

const REVIEWS = [
  {
    name: "Priya Deshmukh",
    text: "Got my Galaxy S24 here at a better price than online. Vijay Sir and his team handled the complete data transfer in store seamlessly.",
  },
  {
    name: "Imran Shaikh",
    text: "Screen replacement finished in 40 minutes with genuine quality display. Very fair and honest pricing.",
  },
  {
    name: "Ankit Verma",
    text: "Purchased a refurbished iPhone 13 for my brother. Excellent battery health and 3 months warranty included. Highly recommended.",
  },
];

function HomePage() {
  const settings = useSettings();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: refurbs = [] } = useQuery(refurbishedQuery);
  const [enquiry, setEnquiry] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);

  const featured = products.filter((p) => p.is_featured).slice(0, 4);
  const strip = featured.length ? featured : products.slice(0, 4);
  const refurbStrip = refurbs.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="hero-stagger text-center lg:text-left">
              <span className="eyebrow lg:justify-start">{settings["tagline"] || "Mobile Phone Dealer & Repair Service — Since 2005"}</span>
              <h1 className="mt-6 font-serif text-[38px] font-bold leading-[1.1] tracking-[-0.5px] sm:text-6xl">
                Your Complete Mobile Store, <em>Repair Lab &amp; Exchange Hub</em>
              </h1>
              <p className="mx-auto mt-6 max-w-[520px] text-sm sm:text-base leading-[1.8] text-muted-foreground lg:mx-0">
                Shop brand-new smartphones, certified second-hand phones, genuine accessories, custom gift hampers,
                and same-day phone repairs under one trusted roof.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="rounded-full px-8 text-[13px] font-semibold">
                  <Link to="/products">Shop New Phones</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link to="/repair">Repair Enquiry</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="rounded-full px-6 text-[13px]">
                  <Link to="/refurbished">Refurbished Phones</Link>
                </Button>
              </div>
            </div>

            {/* Contained hero image — small, crisp, fully visible */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-2xl" aria-hidden="true" />
              <div className="card-surface overflow-hidden rounded-3xl border border-border p-2">
                <img
                  src={heroImage}
                  alt="Premium smartphones on display"
                  width={1920}
                  height={1088}
                  className="aspect-[4/3] w-full rounded-[20px] object-cover"
                />
              </div>
            </div>
          </div>

          {/* Quick Pillars */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PILLARS.map((p) => (
              <Link
                key={p.title}
                to={p.to as "/repair"}
                className="card-surface hover-glow rounded-2xl p-4 text-left border border-border/80 transition-all hover:-translate-y-0.5"
              >
                <p.icon className="size-5 text-primary" />
                <p className="mt-2 text-xs font-semibold text-foreground">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Top Recommendations</span>
              <h2 className="text-2xl font-bold sm:text-3xl mt-1">Featured Smartphones</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Brand new, official warranty, live stock ready for checkout or store collection.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link to="/products">View All Products ({products.length})</Link>
            </Button>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {strip.map((product, i) => (
            <Reveal key={product.id} delay={i * 80}>
              <ProductCard product={product} onEnquire={setEnquiry} onOpen={setDetail} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Refurbished Phones Showcase Strip */}
      {refurbStrip.length > 0 && (
        <section className="border-y border-border bg-card/20 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="eyebrow">Smart Savings</span>
                  <h2 className="text-2xl font-bold sm:text-3xl mt-1">Certified Refurbished Phones</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tested on 30+ checkpoints, graded transparently with warranty.
                  </p>
                </div>
                <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link to="/refurbished">Browse Refurbished</Link>
                </Button>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {refurbStrip.map((item, i) => (
                <Reveal key={item.id} delay={i * 80}>
                  <div className="card-surface hover-glow rounded-2xl p-5 border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{item.brand}</span>
                        <h3 className="font-semibold text-base">{item.model}</h3>
                      </div>
                      <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-xs text-primary font-medium">
                        Grade {item.condition_grade ?? item.condition}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                      {item.storage && <span>{item.storage}</span>}
                      {item.battery_health && <span>· 🔋 {item.battery_health}%</span>}
                      {item.warranty && <span>· ✅ {item.warranty}</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="font-bold text-primary text-lg">{formatINR(item.price)}</p>
                      <Button asChild size="sm">
                        <Link to="/refurbished">View Details</Link>
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Repair & Service Highlight Banner */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <div className="card-surface rounded-3xl p-8 sm:p-12 border border-primary/30 bg-gradient-to-r from-card to-accent/30 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <span className="eyebrow">Fast &amp; Professional</span>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl text-foreground">
                Phone Broken? Get It Fixed Same Day
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cracked screens, battery drain, charging port issues or software trouble — our expert technicians
                diagnose and repair all major brands with original-quality spares and guaranteed workmanship.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs text-foreground/80">
                <span className="rounded-full bg-secondary px-3 py-1">⚡ 45-Min Screen Swap</span>
                <span className="rounded-full bg-secondary px-3 py-1">🔋 Genuine Batteries</span>
                <span className="rounded-full bg-secondary px-3 py-1">💧 Water Damage Recovery</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to="/repair">Submit Repair Enquiry</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-border">
                <Link to="/gift-hampers">Build Gift Hamper</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Vijay Sir & Brand Story Highlight */}
      <section className="border-y border-border bg-card/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <Reveal>
              <div className="space-y-4">
                <span className="eyebrow">The Sai Communication Heritage</span>
                <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                  21+ Years Guided by <em>Vijay Sir</em>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Established in 2005, Sai Communication has grown from a humble counter into one of Pune and
                  Talegaon Dabhade's most recommended electronics retailers. Our focus has never changed: give every customer
                  100% honest advice, authentic hardware, and after-sale support you can walk in and ask for.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="card-surface hover-glow rounded-xl p-3 text-center border border-border">
                    <p className="font-serif text-2xl font-bold text-primary"><CountUp value="2005" /></p>
                    <p className="text-[11px] text-muted-foreground">Established</p>
                  </div>
                  <div className="card-surface hover-glow rounded-xl p-3 text-center border border-border">
                    <p className="font-serif text-2xl font-bold text-primary"><CountUp value="4.8 / 5" /></p>
                    <p className="text-[11px] text-muted-foreground">Justdial Rating</p>
                  </div>
                  <div className="card-surface hover-glow rounded-xl p-3 text-center border border-border">
                    <p className="font-serif text-2xl font-bold text-primary"><CountUp value="25k+" /></p>
                    <p className="text-[11px] text-muted-foreground">Happy Customers</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <Link to="/about">Read Our Full Story <ArrowRight className="size-4 ml-1" /></Link>
                  </Button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="card-surface rounded-3xl p-8 border border-border/80 relative overflow-hidden bg-gradient-to-br from-accent/50 to-card">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full border-2 border-primary/50 bg-accent overflow-hidden flex items-center justify-center">
                    <img
                      src={settings["vijay_sir_photo_url"] || settings["hero_photo_url"] || vijaySirPhoto}
                      alt={settings["owner_name"] || "Vijay Sir"}
                      className="size-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{settings["owner_name"] || "Vijay Sir"}</h3>
                    <p className="text-xs text-primary font-semibold">Founder &amp; Owner</p>
                    <p className="text-xs text-muted-foreground">Talegaon Dabhade, Pune</p>
                  </div>
                </div>
                <p className="mt-4 text-xs italic text-foreground/90 leading-relaxed">
                  "{settings["owner_intro"] ||
                    "Our commitment is simple: We will never sell you a phone or repair you do not need. Come with questions, leave with confidence."}"
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Why Thousands Trust Us</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <div className="card-surface hover-glow h-full rounded-2xl p-6 border border-border">
                <span className="flex size-11 items-center justify-center rounded-full border border-primary/40 bg-accent">
                  <item.icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Brands Strip */}
      <section className="border-t border-border bg-card/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-2xl font-bold sm:text-3xl">Authorized &amp; Major Brands</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {BRANDS.map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-border bg-card px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {brand}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews */}
      <section className="border-y border-border py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-2xl font-bold sm:text-3xl">Customer Stories</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {REVIEWS.map((review, i) => (
              <Reveal key={review.name} delay={i * 100}>
                <div className="card-surface h-full rounded-2xl p-6 border border-border">
                  <div className="flex gap-1 text-primary">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-foreground/85">"{review.text}"</p>
                  <p className="mt-4 text-sm font-semibold">{review.name}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Store Location */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card-surface h-full rounded-2xl p-6 border border-border">
              <h2 className="text-2xl font-bold">Visit Our Store Counter</h2>
              <p className="mt-3 flex gap-2 text-sm text-foreground/85">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {settings["address"]}
              </p>
              <p className="mt-3 flex gap-2 text-sm text-foreground/85">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                {settings["hours"]}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <a href={`tel:${settings["phone"]}`}>Call {settings["phone"]}</a>
                </Button>
                {settings["phone_alt"] && (
                  <Button asChild variant="outline">
                    <a href={`tel:${settings["phone_alt"]}`}>Alt: {settings["phone_alt"]}</a>
                  </Button>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="h-72 overflow-hidden rounded-2xl border border-border lg:h-full">
              <iframe
                title="Store location"
                src={settings["maps_embed"]}
                loading="lazy"
                className="size-full"
                style={{ border: 0 }}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

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
