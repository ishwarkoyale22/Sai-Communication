import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, ShieldCheck, Star, Clock, MapPin, Sparkles, Video } from "lucide-react";
import vijaySirPhoto from "@/assets/vijay-sir.jpg";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { CountUp } from "@/components/CountUp";
import { useSettings } from "@/hooks/useSettings";

// Served from /public/videos — real in-store footage
const SHOP_TOUR_VIDEO = "/videos/shop-tour-1.mp4";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Vijay Sir & Sai Communication | Talegaon Dabhade Pune" },
      {
        name: "description",
        content:
          "Founded in 2005 by Vijay Sir, Sai Communication has served over 25,000 happy customers across Talegaon Dabhade, Pune with genuine smartphones, repairs, accessories and honest advice.",
      },
      { property: "og:title", content: "About Sai Communication & Vijay Sir" },
    ],
  }),
  component: AboutPage,
});

const TIMELINE = [
  { year: "2005", title: "Humble Beginnings", desc: "Started as a dedicated telecom counter by Vijay Sir in Talegaon Dabhade." },
  { year: "2010", title: "Multi-Brand Expansion", desc: "Became an authorised dealer for leading brands including Samsung, Nokia & Sony." },
  { year: "2015", title: "Dedicated Repair Lab", desc: "Inaugurated professional repair bench with genuine spare parts & high-speed display machines." },
  { year: "2020", title: "Refurbished & Exchange", desc: "Launched certified testing & grading for second-hand phones with customer warranty." },
  { year: "2024", title: "Full Digital Platform", desc: "Omnichannel inventory, hamper builder, EMI pre-qualification and online tracking." },
];

function AboutPage() {
  const settings = useSettings();

  const badges = [
    { value: `${settings["years_in_business"] ?? "21"}+`, label: "Years of Trust" },
    {
      value: `${settings["rating"] ?? "4.8"} / 5`,
      label: `${settings["total_ratings"] ?? "242"}+ Verified Ratings`,
    },
    { value: settings["verification"] || "Justdial Verified", label: "Certified Local Dealer" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-3xl">
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-5xl">
          About <em>{settings["shop_name"]}</em>
        </TextReveal>
        <p className="mt-4 text-muted-foreground text-lg">
          {settings["tagline"]}
        </p>
      </header>

      {/* Story section */}
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="gold-frame">
            <video
              src={SHOP_TOUR_VIDEO}
              controls
              playsInline
              preload="metadata"
              aria-label="A walkthrough of our store"
              className="aspect-4/3 size-full bg-black object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
            <h2 className="text-2xl font-medium text-foreground">Our Story &amp; Philosophy</h2>
            <p>
              {settings["owner_history"] ||
                "Founded in 2005, Sai Communication began with a simple promise: give every customer honest advice, 100% genuine products, and after-sale support you can count on. Over the last 21+ years, we have grown to become one of Pune & Talegaon's premier mobile destinations."}
            </p>
            <h3 className="pt-2 text-xl font-medium text-foreground">Our Mission</h3>
            <p>
              To eliminate confusion in buying electronics. Whether you are picking a flagship phone, finding a budget-friendly certified refurbished device, or getting your screen replaced in 45 minutes — we provide direct, transparent service.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/products">Browse Catalogue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/repair">Repair Services</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Badges — stat strip */}
      <Reveal>
        <div className="stat-strip mt-14 sm:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.label} className="stat-strip-item">
              <p className="stat-num text-2xl"><CountUp value={badge.value} /></p>
              <p className="stat-label">{badge.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Founder Section — Vijay Sir */}
      <section className="mt-24 border-y border-border py-16 text-center">
        <Reveal>
          <div className="inline-flex items-center justify-center rounded-full border border-white p-1 shadow-md">
            <div className="rounded-full border border-gold p-1.5">
              <div className="size-28 overflow-hidden rounded-full bg-accent sm:size-32">
                <img
                  src={settings["vijay_sir_photo_url"] || settings["hero_photo_url"] || vijaySirPhoto}
                  alt={settings["owner_name"] || "Vijay Sir"}
                  className="size-full object-cover"
                />
              </div>
            </div>
          </div>
          <h3 className="mt-5 text-xl font-medium font-serif">{settings["owner_name"] || "Vijay Sir"}</h3>
          <p className="caption-mono mt-1">Founder &amp; Proprietor · Est. 2005</p>
        </Reveal>

        <Reveal delay={100}>
          <p className="mx-auto mt-8 max-w-2xl font-serif text-xl italic leading-relaxed text-foreground sm:text-2xl">
            {settings["owner_intro"] ||
              '"When we opened Sai Communication in 2005, technology was simpler, but the need for trust was just as vital. Today, with hundreds of phones launched every year, our role is more important than ever: we test, verify, and guide you so your hard-earned money gets you the device that best fits your life. Thank you for making us a part of your family for over two decades."'}
          </p>
        </Reveal>

        {settings["vijay_sir_video_url"] || settings["owner_video_url"] ? (
          <Reveal delay={160}>
            <div className="mx-auto mt-8 max-w-xl gold-frame">
              <iframe src={settings["vijay_sir_video_url"] || settings["owner_video_url"]} title="Founder video" className="aspect-video w-full" allowFullScreen />
            </div>
          </Reveal>
        ) : (
          <Reveal delay={160}>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-gold">
              <Video className="size-4" />
              <span>Watch our store in action below</span>
            </div>
          </Reveal>
        )}
      </section>

      {/* More Store Videos */}
      <section className="mt-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium sm:text-3xl">More From Our Store</h2>
            </div>
            <Link to="/gallery" className="link-underline text-sm font-medium text-gold">
              View Full Gallery →
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Reveal>
            <div className="overflow-hidden border border-border">
              <video
                src="/videos/shop-tour-2.mp4"
                controls
                playsInline
                preload="metadata"
                aria-label="Inside Sai Communication"
                className="aspect-video w-full bg-black object-cover"
              />
              <p className="p-3 text-sm font-medium">Inside Sai Communication</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="overflow-hidden border border-border">
              <video
                src="/videos/shop-tour-3.mp4"
                controls
                playsInline
                preload="metadata"
                aria-label="Our store counter"
                className="aspect-video w-full bg-black object-cover"
              />
              <p className="p-3 text-sm font-medium">Our Store Counter</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2005-Present Timeline */}
      <section className="mt-20">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl font-medium sm:text-4xl">Milestones Over 21+ Years</h2>
            <p className="mt-2 text-sm text-muted-foreground">Key moments in our evolution as Talegaon Dabhade's trusted mobile destination.</p>
          </div>
        </Reveal>

        <div className="mt-12 relative border-l border-gold ml-4 sm:ml-32 space-y-10">
          {TIMELINE.map((item, idx) => (
            <Reveal key={item.year} delay={idx * 80}>
              <div className="relative pl-8 sm:pl-10">
                <div className="absolute -left-3.5 top-1 size-7 rounded-full bg-background border border-gold flex items-center justify-center">
                  <div className="size-1.5 rounded-full bg-gold" />
                </div>
                <div className="card-surface p-5 hover-glow">
                  <span className="font-serif text-lg font-medium text-primary">{item.year}</span>
                  <h3 className="font-semibold text-foreground mt-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
