import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Database, Eye, Lock, Globe, UserCheck, RefreshCw, Bell, Clock, Gavel } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { useSettings } from "@/hooks/useSettings";

// LEGAL REVIEW REQUIRED: this entire page is drafted to satisfy the Digital Personal Data
// Protection Act, 2023 (DPDP Act) and should be reviewed by a lawyer before being relied on —
// in particular the retention periods, the Grievance Officer designation, and the "legal
// basis" wording in "How We Use Your Information" (consent vs. legitimate use vs. contract).
// See DPDP_PROGRESS.md at the repo root for what drove each addition.

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
    icon: Clock,
    title: "Data Retention",
    content: [
      "**[LEGAL REVIEW] Enquiry & repair booking records** — retained for 3 years from the last interaction, to support warranty claims and service history.",
      "**[LEGAL REVIEW] Purchase/order records** — retained for 8 years to meet GST and other statutory record-keeping obligations under Indian tax law.",
      "**[LEGAL REVIEW] Account data** (name, phone, email, password hash) — retained until you request deletion or close your account, then erased within 30 days except where we must keep it to comply with law.",
      "**Consent records** — retained for 3 years after the consent is withdrawn or expires, as evidence of compliance.",
      "After the applicable retention period, personal data is deleted or irreversibly anonymised.",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights as a Data Principal",
    content: [
      "**Access** — you may request a copy of the personal data we hold about you.",
      "**Correction & completion** — you can ask us to update inaccurate, incomplete or outdated information.",
      "**Erasure** — you may request deletion of your data once it is no longer needed for the purpose it was collected, subject to legal retention obligations.",
      "**Withdraw consent** — you may withdraw any consent you previously gave, at any time, as easily as you gave it. Withdrawal does not affect the lawfulness of processing done before withdrawal.",
      "**Nominate** — you may nominate another individual to exercise these rights on your behalf in the event of death or incapacity.",
      "**Grievance redressal** — you may raise a complaint about how we handle your data (see below) before approaching the Data Protection Board of India.",
      "To exercise any of these rights, submit a request via our Data Rights Request page (linked in the footer) or contact our Grievance Officer below. We aim to respond within 30 days.",
    ],
  },
  {
    icon: Gavel,
    title: "Grievance Redressal",
    content: [
      "**[LEGAL REVIEW] Grievance Officer:** Vijay Sir — reachable via the phone number and email on our Contact page, and via the footer of every page on this website.",
      "You may raise any concern about how your personal data is collected, used or shared by submitting a request through our Data Rights Request page, calling us, or emailing our Grievance Officer directly.",
      "We will acknowledge your grievance and aim to resolve it within **30 days**.",
      "If you are not satisfied with our response, you may approach the **Data Protection Board of India** under the Digital Personal Data Protection Act, 2023.",
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
            <Link
              to="/data-rights-request"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Submit a Data Rights Request
            </Link>
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
