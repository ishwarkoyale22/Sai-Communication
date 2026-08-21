import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Award, ShieldCheck, Star, Clock, MapPin, Sparkles, Video } from "lucide-react";
import shopImage from "@/assets/shop.jpg";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useSettings } from "@/hooks/useSettings";

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
      value: `${settings["rating"] ?? "4.7"} / 5`,
      label: `${settings["total_ratings"] ?? "119"}+ Verified Ratings`,
    },
    { value: settings["verification"] || "Justdial Verified", label: "Certified Local Dealer" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-3xl">
        <span className="eyebrow">Serving Since 2005</span>
        <h1 className="mt-6 font-serif text-3xl font-bold sm:text-5xl">
          About <em>{settings["shop_name"]}</em>
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          {settings["tagline"]}
        </p>
      </header>

      {/* Story section */}
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
            <img
              src={shopImage}
              alt="Our mobile phone store front"
              loading="lazy"
              width={1280}
              height={800}
              className="size-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
            <h2 className="text-2xl font-bold text-foreground">Our Story &amp; Philosophy</h2>
            <p>
              {settings["owner_history"] ||
                "Founded in 2005, Sai Communication began with a simple promise: give every customer honest advice, 100% genuine products, and after-sale support you can count on. Over the last 21+ years, we have grown to become one of Pune & Talegaon's premier mobile destinations."}
            </p>
            <h3 className="pt-2 text-xl font-bold text-foreground">Our Mission</h3>
            <p>
              To eliminate confusion in buying electronics. Whether you are picking a flagship phone, finding a budget-friendly certified refurbished device, or getting your screen replaced in 45 minutes — we provide direct, transparent service.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/products">Browse Catalogue</Link>
              </Button>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link to="/repair">Repair Services</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Badges */}
      <div className="mt-14 grid gap-5 sm:grid-cols-3">
        {badges.map((badge, i) => (
          <Reveal key={badge.label} delay={i * 90}>
            <div className="card-surface hover-glow rounded-2xl p-6 text-center border border-border/80">
              <p className="font-serif text-3xl font-bold text-primary">{badge.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{badge.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Founder Section — Vijay Sir */}
      <section className="mt-20 card-surface rounded-3xl p-8 sm:p-12 border border-primary/20 bg-gradient-to-br from-card/80 to-accent/40">
        <div className="grid gap-8 lg:grid-cols-3 items-center">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="size-28 sm:size-36 rounded-full border-2 border-primary/40 bg-accent overflow-hidden flex items-center justify-center shadow-inner">
              {settings["vijay_sir_photo_url"] || settings["hero_photo_url"] ? (
                <img src={settings["vijay_sir_photo_url"] || settings["hero_photo_url"]} alt={settings["owner_name"] || "Vijay Sir"} className="size-full object-cover" />
              ) : (
                <User className="size-16 text-primary" />
              )}
            </div>
            <h3 className="mt-4 text-xl font-bold">{settings["owner_name"] || "Vijay Sir"}</h3>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">Founder &amp; Proprietor</p>
            <p className="mt-2 text-xs text-muted-foreground">Sai Communication · Est. 2005</p>
          </div>

          <div className="lg:col-span-2 space-y-4 text-sm leading-relaxed text-foreground/90">
            <h3 className="font-serif text-2xl font-bold">A Message From The Founder</h3>
            <p>
              {settings["owner_intro"] ||
                "\"When we opened Sai Communication in 2005, technology was simpler, but the need for trust was just as vital. Today, with hundreds of phones launched every year, our role is more important than ever: we test, verify, and guide you so your hard-earned money gets you the device that best fits your life. Thank you for making us a part of your family for over two decades.\""}
            </p>
            {settings["vijay_sir_video_url"] || settings["owner_video_url"] ? (
              <div className="mt-4 rounded-xl overflow-hidden border border-border aspect-video">
                <iframe src={settings["vijay_sir_video_url"] || settings["owner_video_url"]} title="Founder video" className="size-full" allowFullScreen />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2005-Present Timeline */}
      <section className="mt-20">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="eyebrow">Our Journey</span>
            <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">Milestones Over 21+ Years</h2>
            <p className="mt-2 text-sm text-muted-foreground">Key moments in our evolution as Talegaon Dabhade's trusted mobile destination.</p>
          </div>
        </Reveal>

        <div className="mt-12 relative border-l-2 border-primary/30 ml-4 sm:ml-32 space-y-10">
          {TIMELINE.map((item, idx) => (
            <Reveal key={item.year} delay={idx * 80}>
              <div className="relative pl-8 sm:pl-10">
                <div className="absolute -left-3.5 top-1 size-7 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <div className="size-2 rounded-full bg-primary" />
                </div>
                <div className="card-surface rounded-2xl p-5 border border-border hover-glow">
                  <span className="font-serif text-lg font-bold text-primary">{item.year}</span>
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
