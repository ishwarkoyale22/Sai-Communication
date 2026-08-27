import { createFileRoute } from "@tanstack/react-router";
import { Shield, Database, Eye, Lock, Globe, UserCheck, RefreshCw, Bell } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sai Communication | Talegaon Pune" },
      {
        name: "description",
        content:
          "Read Sai Communication Privacy Policy to understand how we collect, use and protect your personal information when you visit our store or use our website.",
      },
      { property: "og:title", content: "Privacy Policy — Sai Communication" },
    ],
  }),
  component: PrivacyPolicyPage,
});

const SECTIONS = [
  {
    icon: Database,
    title: "Information We Collect",
    content: [
      "**Contact details** you submit through our enquiry or repair booking forms — name, phone number, email address and device description.",
      "**Purchase & service records** such as order history, device IMEI (for warranty), and repair job cards.",
      "**Technical data** automatically collected by your browser: IP address, browser type, device model, pages visited and time spent on site.",
      "**Communication history** — WhatsApp messages and call logs initiated from our contact page, to deliver and improve our service.",
    ],
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: [
      "To process enquiries, repair bookings and purchase orders you place with us.",
      "To send you order confirmations, repair status updates and delivery notifications.",
      "To contact you for feedback and after-sale support.",
      "To improve our website content and product catalogue based on aggregate browsing patterns.",
      "To comply with legal obligations such as GST invoicing and warranty registration with brand manufacturers.",
    ],
  },
  {
    icon: Globe,
    title: "Sharing of Information",
    content: [
      "**Brand manufacturers & authorised service centres** — solely for warranty registration and escalated repair cases.",
      "**Logistics partners** — name, address and phone number are shared only when a delivery is dispatched.",
      "**Payment processors** — we do not store card or UPI details; transactions are processed entirely by the respective payment gateway.",
      "We **never sell, rent or trade** your personal information to third-party marketers.",
      "We may disclose information when required by law or to protect the rights and safety of our customers.",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      "All data transmitted between your browser and our servers is encrypted using HTTPS / TLS.",
      "Customer records stored in our database are access-controlled — only authorised staff can view them.",
      "Repair job cards with device details are kept securely on premises and shredded after the retention period.",
      "While we implement industry-standard security measures, no method of electronic transmission is 100% secure.",
    ],
  },
  {
    icon: Bell,
    title: "Cookies & Tracking",
    content: [
      "Our website uses essential cookies to remember your cart and session preferences.",
      "We may use analytics tools to understand page performance and visitor trends. These tools collect anonymised, aggregated data only.",
      "You can disable cookies in your browser settings. Note that some website features may not function correctly without them.",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content: [
      "**Access** — you may request a copy of the personal data we hold about you.",
      "**Correction** — you can ask us to update inaccurate or incomplete information.",
      "**Deletion** — you may request erasure of your data, subject to any legal retention obligations.",
      "**Opt-out** — reply STOP to any promotional message from us to be removed from our marketing list.",
      "To exercise any right, contact us at the address or phone number listed on our Contact page.",
    ],
  },
  {
    icon: RefreshCw,
    title: "Updates to This Policy",
    content: [
      "We may update this Privacy Policy occasionally to reflect changes in our practices or for legal compliance.",
      "The Last Updated date at the top of the page will always indicate the most recent revision.",
      "Continued use of our website or services after changes are posted constitutes acceptance of the revised policy.",
    ],
  },
];

function BulletContent({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function PrivacyPolicyPage() {
  const settings = useSettings();
  const shopName = settings["shop_name"] || "Sai Communication";

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <header className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gold">
          <Shield className="size-3.5" />
          Legal
        </div>
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-5xl">
          Privacy Policy
        </TextReveal>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: <span className="font-medium text-foreground">27 August 2026</span>
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
          At <strong className="text-foreground">{shopName}</strong>, we value the trust you place in us.
          This policy explains what information we collect, why we collect it, and how we keep it safe.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
      </header>

      <div className="space-y-10">
        {SECTIONS.map((section, idx) => (
          <Reveal key={section.title} delay={idx * 60}>
            <section
              id={`privacy-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="group relative rounded-lg border border-border bg-card/50 p-6 transition-colors hover:border-gold/30 hover:bg-card"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-l-lg bg-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
                  <section.icon className="size-4 text-gold" />
                </span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                  <ul className="mt-3 space-y-2">
                    {section.content.map((point, pIdx) => (
                      <li key={pIdx} className="flex gap-2.5 text-sm leading-relaxed text-foreground/75">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold/60" aria-hidden="true" />
                        <BulletContent text={point} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <div className="mt-14 rounded-lg border border-gold/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
          <Shield className="mx-auto mb-3 size-8 text-gold/70" />
          <h2 className="font-serif text-xl font-medium">Questions about your privacy?</h2>
          <p className="mt-2 text-sm text-muted-foreground">We are happy to help. Reach us in store or over the phone.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
            {settings["phone"] && (
              <a href={`tel:${settings["phone"]}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                {settings["phone"]}
              </a>
            )}
            {settings["address"] && (
              <span className="text-muted-foreground">{settings["address"]}</span>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
