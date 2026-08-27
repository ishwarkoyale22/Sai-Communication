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
  Gift,
  RefreshCw,
  CreditCard,
  ArrowRight,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
} from "lucide-react";
import vijaySirPhoto from "@/assets/vijay-sir.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import img1 from "@/assets/hero_phones_transparent.png";
import { EnquiryDialog } from "@/components/EnquiryDialog";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
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
  { icon: BadgeCheck, title: "Certified Technicians", text: "Fast in-house repairs with genuine, quality-grade parts." },
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

  const rating = settings["rating"] || "4.8";
  const totalRatings = settings["total_ratings"] || "242";

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #FBF7EE 0%, #F7F2E6 100%)" }}
      >
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="hero-stagger flex flex-col items-center text-center">
            {/* Title */}
            <TextReveal
              as="h1"
              trigger="mount"
              delayStep={55}
              className="font-serif text-[32px] font-bold leading-[1.12] tracking-[-0.5px] text-foreground sm:text-[56px] max-w-2xl"
            >
              Premium Phones &amp; <em className="font-semibold text-[#1F3A8A]">Expert Repairs</em>
            </TextReveal>

            {/* Subtitle */}
            <p className="mx-auto mt-5 max-w-[540px] text-[13px] leading-[1.8] sm:text-[15px]" style={{ color: "#5B5B5B" }}>
              Your local store for brand-new smartphones, genuine accessories, tested second-hand and ady repairs — honest advice and easy EMI.
            </p>

            {/* Feature chips */}
            <div className="mx-auto mt-6 flex w-full max-w-[460px] flex-row gap-3 justify-center">
              <div
                className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                style={{ border: "1px solid #E6E0D2" }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "#EEF1FD", color: "#1F3A8A" }}
                >
                  <Clock className="size-4" />
                </span>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight text-foreground">Same-day repairs</p>
                  <p className="text-[10.5px] text-muted-foreground">Screen &amp; battery in 60 min</p>
                </div>
              </div>
              <div
                className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                style={{ border: "1px solid #E6E0D2" }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "#EEF1FD", color: "#1F3A8A" }}
                >
                  <CreditCard className="size-4" />
                </span>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight text-foreground">Easy EMI</p>
                  <p className="text-[10.5px] text-muted-foreground">Zero down payment plans</p>
                </div>
              </div>
            </div>

            {/* Centered Image with Blue Glow Background */}
            <div className="relative w-full max-w-2xl my-8 flex justify-center items-center">
              {/* Radial gradient glow behind the devices */}
              <div
                className="absolute inset-0 mx-auto max-w-[500px] aspect-square rounded-full blur-3xl -z-10 opacity-70"
                style={{
                  background: "radial-gradient(circle, rgba(31,58,138,0.25) 0%, rgba(31,58,138,0.05) 50%, transparent 70%)",
                }}
              />
              <img
                src={img1}
                alt="Fanned display of premium smartphones and a smartwatch available at Sai Communication"
                className="mx-auto w-full max-w-[550px] h-auto object-contain"
              />
            </div>

            {/* CTAs (Buttons stacked vertically) */}
            <div className="mt-4 flex flex-col gap-3 w-full max-w-[280px] sm:max-w-[320px] mx-auto">
              <Button
                asChild
                size="lg"
                className="w-full rounded-2xl py-6 font-semibold shadow-sm cursor-pointer"
                style={{ background: "#1F3A8A", color: "#fff" }}
              >
                <Link to="/products">Shop New Phones</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-2xl py-6 font-semibold bg-[#F2EDE4] border border-[#E6E0D2] text-[#1b1b1b] shadow-sm cursor-pointer"
                style={{ borderWidth: 1 }}
              >
                <Link to="/repair">Book a Repair</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full rounded-2xl py-6 font-semibold shadow-sm cursor-pointer"
                style={{ background: "#C99A4F", color: "#fff" }}
              >
                <Link to="/refurbished">Refurbished deals</Link>
              </Button>
            </div>

            {/* Trust row & Social icons */}
            <div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-3 border-t border-[#E6E0D2]/60 pt-6 w-full max-w-4xl mx-auto text-xs"
              style={{ color: "#5B5B5B" }}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex text-gold">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-3.5 fill-current" />
                  ))}
                </div>
                <span>
                  <span className="font-bold text-foreground">4.7/5</span> · 118 Justdial reviews
                </span>
              </div>
              <span className="hidden h-3 w-px bg-[#E6E0D2] sm:block" />
              <p>
                <span className="font-bold text-foreground">21+ years</span> ·{" "}
                <span className="font-bold text-foreground">25,000+</span> happy customers
              </p>
              <span className="hidden h-3 w-px bg-[#E6E0D2] sm:block" />
              <div className="flex items-center gap-4">
                <a
                  href={settings["instagram"] || "https://instagram.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1F3A8A] transition-colors"
                >
                  <Instagram className="size-4" />
                </a>
                <a
                  href={settings["twitter"] || "https://twitter.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1F3A8A] transition-colors"
                >
                  <Twitter className="size-4" />
                </a>
                <a
                  href={settings["facebook"] || "https://facebook.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1F3A8A] transition-colors"
                >
                  <Facebook className="size-4" />
                </a>
                <a
                  href={settings["youtube"] || "https://youtube.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1F3A8A] transition-colors"
                >
                  <Youtube className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Pillars */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:pb-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLARS.map((p) => (
            <Link
              key={p.title}
              to={p.to as "/repair"}
              className="group card-surface hover-glow flex items-center gap-3 p-4 text-left sm:flex-col sm:items-start sm:gap-3"
            >
              <span className="medallion-ring-sm shrink-0 transition-colors group-hover:bg-gold group-hover:text-primary-foreground">
                <p.icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <TextReveal as="h2" className="text-2xl font-medium sm:text-3xl">Featured Smartphones</TextReveal>
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
        <section className="border-y border-border py-24">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <TextReveal as="h2" className="text-2xl font-medium sm:text-3xl">Certified Refurbished Phones</TextReveal>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every device is inspected, graded honestly and backed by our warranty.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/refurbished">Browse Refurbished</Link>
                </Button>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {refurbStrip.map((item, i) => (
                <Reveal key={item.id} delay={i * 80}>
                  <div className="card-surface hover-glow p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="caption-mono">{item.brand}</span>
                        <h3 className="font-semibold text-base mt-0.5">{item.model}</h3>
                      </div>
                      <span className="border border-gold/50 px-2 py-0.5 text-xs text-gold font-medium">
                        Grade {item.condition_grade ?? item.condition}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                      {item.storage && <span>{item.storage}</span>}
                      {item.battery_health && <span>· 🔋 {item.battery_health}%</span>}
                      {item.warranty && <span>· ✅ {item.warranty}</span>}
                    </div>
                    <hr className="mt-4 border-border" />
                    <div className="mt-4 flex items-center justify-between">
                      <p className="font-semibold text-primary text-lg">{formatINR(item.price)}</p>
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
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <div className="card-surface p-8 sm:p-14 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <TextReveal as="h2" className="font-serif text-3xl font-medium sm:text-4xl text-foreground">
                Phone Broken? Get It Fixed Same Day
              </TextReveal>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cracked screen, weak battery, dead charging port or software trouble? Our technicians handle all
                major brands with quality spares — and most repairs are done the same day.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs text-foreground/80">
                <span className="bg-secondary px-3 py-1">⚡ 45-Min Screen Swap</span>
                <span className="bg-secondary px-3 py-1">🔋 Genuine Batteries</span>
                <span className="bg-secondary px-3 py-1">💧 Water Damage Recovery</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button asChild size="lg">
                <Link to="/repair">Submit Repair Enquiry</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/gift-hampers">Build Gift Hamper</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Vijay Sir & Brand Story — centered founder moment */}
      <section className="border-y border-border py-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <Reveal>
            <TextReveal as="h2" className="font-serif text-3xl font-medium sm:text-4xl">
              21+ Years Guided by <em>Vijay Sir</em>
            </TextReveal>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-8 inline-flex items-center justify-center rounded-full border border-white p-1 shadow-md">
              <div className="rounded-full border border-gold p-1.5">
                <div className="size-24 overflow-hidden rounded-full bg-accent sm:size-28">
                  <img
                    src={settings["vijay_sir_photo_url"] || settings["hero_photo_url"] || vijaySirPhoto}
                    alt={settings["owner_name"] || "Vijay Sir"}
                    className="size-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-8 font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
              {settings["owner_intro"] ||
                '"Our commitment is simple: We will never sell you a phone or repair you do not need. Come with questions, leave with confidence."'}
            </p>
            <p className="caption-mono mt-4 not-italic">
              {settings["owner_name"] || "Vijay Sir"} · Founder &amp; Owner
            </p>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
              Established in {settings["established"] || "2005"}, Sai Communication has grown from a humble counter
              into one of Pune and Talegaon Dabhade's most recommended electronics retailers. Our focus has never
              changed: give every customer 100% honest advice, authentic hardware, and after-sale support you can
              walk in and ask for.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="stat-strip mt-10 sm:grid-cols-3">
              <div className="stat-strip-item">
                <p className="stat-num"><CountUp value={settings["established"] || "2005"} /></p>
                <p className="stat-label">Established</p>
              </div>
              <div className="stat-strip-item">
                <p className="stat-num"><CountUp value={`${rating} / 5`} /></p>
                <p className="stat-label">Justdial Rating</p>
              </div>
              <div className="stat-strip-item">
                <p className="stat-num"><CountUp value="25k+" /></p>
                <p className="stat-label">Happy Customers</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <div className="mt-10">
              <Button asChild variant="outline">
                <Link to="/about">
                  Read Our Full Story <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why Choose Us — single bordered band, divided by hairlines */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <TextReveal as="h2" className="text-center text-2xl font-medium sm:text-3xl">Why Thousands Trust Us</TextReveal>
        </Reveal>
        <Reveal delay={80}>
          <div className="hairline-band mt-10 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((item) => (
              <div key={item.title} className="hairline-band-item">
                <span className="medallion-ring-sm">
                  <item.icon className="size-4.5" />
                </span>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Brands Strip — plain text, hairline underline, gold on hover */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <TextReveal as="h2" className="text-center text-2xl font-medium sm:text-3xl">Authorized &amp; Major Brands</TextReveal>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              {BRANDS.map((brand) => (
                <span
                  key={brand}
                  className="group flex items-center justify-center border-b border-border px-4 py-5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-gold"
                >
                  {brand}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews */}
      <section className="border-b border-border py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <TextReveal as="h2" className="text-center text-2xl font-medium sm:text-3xl">Customer Stories</TextReveal>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {REVIEWS.map((review, i) => (
              <Reveal key={review.name} delay={i * 100}>
                <div className="card-surface hover-glow h-full p-6">
                  <div className="flex gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 font-serif text-lg italic leading-relaxed text-foreground/90">"{review.text}"</p>
                  <div className="mt-5 w-8 border-t border-gold" />
                  <p className="caption-mono mt-2">{review.name}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Store Location */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card-surface hover-glow h-full p-6">
              <TextReveal as="h2" className="text-2xl font-medium">Visit Our Store Counter</TextReveal>
              <p className="mt-3 flex gap-2 text-sm text-foreground/85">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                {settings["address"]}
              </p>
              <p className="mt-3 flex gap-2 text-sm text-foreground/85">
                <Clock className="mt-0.5 size-4 shrink-0 text-gold" />
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
            <div className="h-72 overflow-hidden border border-border lg:h-full">
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
