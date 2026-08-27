import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BatteryCharging,
  CreditCard,
  Package,
  Smartphone,
  Wrench,
  MonitorSmartphone,
  RefreshCw,
  Gift,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Phone Repair, Refurbished, Hampers & EMI | Sai Communication" },
      {
        name: "description",
        content:
          "New smartphones, 45-min phone repair, screen & battery replacement, certified refurbished devices, custom gift hampers and easy EMI at Sai Communication, Talegaon Dabhade Pune.",
      },
      { property: "og:title", content: "Comprehensive Mobile Services | Sai Communication" },
    ],
  }),
  component: ServicesPage,
});

const SERVICES = [
  {
    icon: Smartphone,
    title: "New Smartphone Sales",
    text: "Authorized dealer for Samsung, Apple, Vivo, Oppo, Realme, OnePlus and Xiaomi with live counter demos.",
    link: "/products",
    linkText: "Browse Phones",
  },
  {
    icon: Wrench,
    title: "Mobile Repair & Service",
    text: "Fast in-house diagnostics and repairs by trained technicians. Most repairs done within 45 to 60 minutes.",
    link: "/repair",
    linkText: "Submit Repair Enquiry",
  },
  {
    icon: MonitorSmartphone,
    title: "Screen & Display Replacement",
    text: "Original & high-grade replacement displays fitted with precision and touch warranty.",
    link: "/repair",
    linkText: "Book Display Fix",
  },
  {
    icon: BatteryCharging,
    title: "Battery & Charging Port Fix",
    text: "Restore full battery health with genuine high-capacity batteries and fast charging port repairs.",
    link: "/repair",
    linkText: "Fix Battery Issue",
  },
  {
    icon: RefreshCw,
    title: "Certified Refurbished Phones",
    text: "Pre-owned smartphones inspected on 30+ quality checkpoints with store warranty and bill.",
    link: "/refurbished",
    linkText: "Explore Refurbished",
  },
  {
    icon: Gift,
    title: "Custom Gift Hamper Builder",
    text: "Curate a personalized tech hamper with phone cases, premium earphones, fast chargers and accessories.",
    link: "/gift-hampers",
    linkText: "Build A Hamper",
  },
  {
    icon: CreditCard,
    title: "Easy EMI & Finance Plans",
    text: "No-cost and low-cost EMI options through leading finance partners with instant digital approval.",
    link: "/products",
    linkText: "Learn About EMI",
  },
  {
    icon: Package,
    title: "Accessories & Spares",
    text: "Cases, tempered glass, high-speed GaN chargers, TWS earbuds, cables and genuine spare parts.",
    link: "/products",
    linkText: "View Accessories",
  },
];

function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-3xl">
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-5xl">
          One Store for Every <em>Phone Need</em>
        </TextReveal>
        <p className="mt-4 text-muted-foreground text-lg">
          New phones, same-day repairs, certified refurbished devices, custom gift hampers and easy EMI — all at
          our Talegaon Dabhade counter.
        </p>
      </header>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service, i) => (
          <Reveal key={service.title} delay={i * 60}>
            <div className="card-surface hover-glow h-full p-6 flex flex-col justify-between">
              <div>
                <span className="medallion-ring-sm">
                  <service.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{service.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{service.text}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50">
                <Button asChild size="sm" variant="ghost" className="w-full justify-between px-2 text-xs text-primary hover:text-gold">
                  <Link to={service.link as "/products"}>
                    {service.linkText} <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="card-surface mt-16 flex flex-wrap items-center justify-between gap-6 p-8 sm:p-10">
        <div className="max-w-xl">
          <h2 className="font-serif text-2xl font-medium">Have a custom requirement?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visit our store counter in Talegaon Dabhade or reach us on WhatsApp. Our technicians and staff are ready to help.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link to="/contact">Contact Store</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
