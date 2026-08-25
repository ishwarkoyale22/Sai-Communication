import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Wrench, Clock, CheckCircle, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useSettings } from "@/hooks/useSettings";
import { RepairEnquiryForm } from "@/components/RepairEnquiryForm";

export const Route = createFileRoute("/repair")({
  head: () => ({
    meta: [
      { title: "Mobile Repair — Screen, Battery & Software Fix | Sai Communication" },
      { name: "description", content: "Submit a repair enquiry for your phone. Screen replacement, battery, software issues and more. Trained technicians at Sai Communication, Talegaon Dabhade, Pune." },
      { property: "og:title", content: "Phone Repair Enquiry | Sai Communication" },
      { property: "og:description", content: "Fast, reliable mobile repair. Submit your enquiry and we will contact you." },
    ],
  }),
  component: RepairPage,
});

const REPAIR_SERVICES = [
  { icon: "📱", title: "Screen Replacement", desc: "Original & high-grade displays fitted in under an hour with warranty." },
  { icon: "🔩", title: "Motherboard Repair", desc: "Chip-level diagnostics and motherboard repair for dead or malfunctioning phones." },
  { icon: "🔋", title: "Battery Replacement", desc: "Genuine batteries that restore full-day backup." },
  { icon: "⚡", title: "Charging Issues", desc: "Port cleaning, port replacement, cable diagnostics." },
  { icon: "💿", title: "Software & Hang", desc: "OS updates, factory reset, app issues and performance fixes." },
  { icon: "📷", title: "Camera Repair", desc: "Front and rear camera module replacement." },
  { icon: "🔊", title: "Speaker / Mic Issues", desc: "Audio diagnostics and component replacement." },
  { icon: "💧", title: "Water Damage", desc: "Cleaning, drying and component recovery." },
  {
    icon: "🔧",
    title: "Other Issues",
    desc: "Fingerprint sensor, back panel, audio jack, SIM tray, buttons, vibration motor & more — tell us the problem and we will diagnose it.",
  },
];

const STEPS = [
  { step: "01", title: "Submit Enquiry", desc: "Fill the form below with your phone details and problem." },
  { step: "02", title: "We Contact You", desc: "Our technician will call you within 2 business hours." },
  { step: "03", title: "Bring Your Device", desc: "Drop your phone at our store for diagnosis and repair." },
  { step: "04", title: "Repair & Collect", desc: "Most repairs done same day. Collect your phone as good as new." },
];

function RepairPage() {
  const settings = useSettings();
  const whatsapp = (settings["whatsapp"] || "917507575755").replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-3xl">
        <span className="eyebrow">Mobile Repair Service</span>
        <h1 className="mt-6 font-serif text-3xl font-bold sm:text-4xl">
          Fast, Reliable <em>Phone Repair</em> You Can Trust
        </h1>
        <p className="mt-4 text-muted-foreground">
          Trained technicians, genuine parts, most repairs done the same day. Submit your enquiry below and we will get back to you.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full px-8">
            <a href="#repair-form">Submit Enquiry</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
            <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(settings["repair_whatsapp_message"] || "Hello, I would like to enquire about a mobile repair.")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4 mr-2" /> WhatsApp
            </a>
          </Button>
        </div>
      </header>

      {/* Services Grid */}
      <section className="mt-16">
        <Reveal>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">What We Repair</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">All major brands — Samsung, Apple, Vivo, Oppo, Realme, OnePlus, Xiaomi & more</p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REPAIR_SERVICES.map((svc, i) => (
            <Reveal key={svc.title} delay={i * 60}>
              <div className="card-surface hover-glow h-full rounded-2xl p-5">
                <span className="text-3xl">{svc.icon}</span>
                <h3 className="mt-3 font-semibold">{svc.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{svc.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mt-16 border-y border-border py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How It Works</h2>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 80}>
              <div className="relative text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-primary/40 bg-accent">
                  <span className="font-serif text-lg font-bold text-primary">{s.step}</span>
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Repair Form */}
      <section id="repair-form" className="mt-16">
        <Reveal>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Submit Repair Enquiry</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">We will respond within 2 hours on business days.</p>
        </Reveal>
        <div className="mt-8 mx-auto max-w-2xl">
          <Reveal>
            <div className="card-surface rounded-2xl p-6 sm:p-8">
              <RepairEnquiryForm />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
