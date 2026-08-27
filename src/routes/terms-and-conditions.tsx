import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, ShoppingBag, Wrench, RefreshCw, AlertTriangle, FileText, Phone, Globe } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Sai Communication | Talegaon Pune" },
      {
        name: "description",
        content:
          "Read the Terms and Conditions of Sai Communication. Understand our sales, repair service, return, warranty and website usage policies.",
      },
      { property: "og:title", content: "Terms & Conditions — Sai Communication" },
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    icon: Globe,
    title: "Use of Website",
    content: [
      "This website is operated by Sai Communication for informational and enquiry purposes only. No online payment checkout is provided; all purchases are completed in store.",
      "You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others.",
      "We reserve the right to modify, suspend or discontinue any part of the website at any time without prior notice.",
      "Product images, descriptions and pricing are indicative and subject to change without notice. Final pricing is confirmed in store at the time of purchase.",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Sales & Pricing",
    content: [
      "All prices displayed are in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise.",
      "Prices are subject to change without prior notice due to manufacturer revisions, currency fluctuations or promotional periods.",
      "An enquiry or reservation made through this website does not constitute a binding contract of sale. Ownership passes only upon full payment in store.",
      "We do not offer online payment; accepted in-store modes include cash, UPI, debit/credit card and bank transfer.",
      "**EMI financing** is subject to the terms and conditions of the respective finance partner or bank and requires documentary verification.",
    ],
  },
  {
    icon: Wrench,
    title: "Repair Services",
    content: [
      "We offer in-store repair services for mobile phones and tablets. Estimated turnaround times are indicative and may vary based on parts availability.",
      "**A job card must be signed** before any repair commences. The job card constitutes your agreement to the quoted charges.",
      "We are not responsible for any pre-existing damage, data loss or software issues on the device before it is handed over for repair.",
      "**Data backup is the customer's responsibility.** We strongly advise backing up all data before submitting a device for repair.",
      "Repaired devices carry a **30-day warranty** on the specific part or service performed, unless stated otherwise on the job card.",
      "Warranty is void if the device shows signs of physical damage, water exposure or unauthorised repair by a third party after collection.",
    ],
  },
  {
    icon: RefreshCw,
    title: "Returns & Exchanges",
    content: [
      "New sealed devices may be exchanged within **7 days of purchase** provided the device is in original, unopened condition with all accessories and bill.",
      "Opened devices are not eligible for refund but may be exchanged for another product of equal or higher value, subject to inspection.",
      "Accessories (earphones, chargers, cases, screen guards) are **non-refundable** once the packaging has been opened.",
      "Refurbished and second-hand phones carry the warranty stated on the sales receipt. Change of mind returns are not accepted for refurbished devices.",
      "Manufacturer warranty claims must be taken up with the respective brand service centre. We will assist with documentation on request.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Limitation of Liability",
    content: [
      "Sai Communication is not liable for any indirect, incidental or consequential loss arising from the purchase of a product or use of a repaired device.",
      "We are not responsible for software updates, compatibility issues or manufacturer firmware changes that affect device performance after purchase.",
      "In any case, our maximum liability to a customer shall not exceed the amount actually paid by the customer for the product or service in question.",
      "We make every effort to display accurate product information, but we do not warrant that product descriptions, specifications or availability on the website are error-free.",
    ],
  },
  {
    icon: FileText,
    title: "Intellectual Property",
    content: [
      "All content on this website — including text, images, graphics, logos and layout — is the property of Sai Communication or its content suppliers.",
      "You may not reproduce, redistribute or commercially exploit any content from this site without our prior written permission.",
      "Brand names, logos and trademarks displayed on this website belong to their respective owners and are used solely for identification purposes.",
    ],
  },
  {
    icon: Scale,
    title: "Governing Law & Disputes",
    content: [
      "These Terms and Conditions are governed by the laws of India.",
      "Any disputes arising shall first be attempted to be resolved amicably. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra.",
      "Consumer disputes may be referred to the relevant Consumer Forum as per the Consumer Protection Act, 2019.",
    ],
  },
  {
    icon: Phone,
    title: "Contact & Amendments",
    content: [
      "We may update these Terms and Conditions at any time. The revised version will be posted on this page with an updated date.",
      "Continued use of our website or services after changes constitutes acceptance of the revised terms.",
      "For queries regarding these terms, please visit us in store or call us at the number provided on our Contact page.",
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

function TermsPage() {
  const settings = useSettings();
  const shopName = settings["shop_name"] || "Sai Communication";

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      {/* Header */}
      <header className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gold">
          <Scale className="size-3.5" />
          Legal
        </div>
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-5xl">
          Terms &amp; Conditions
        </TextReveal>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: <span className="font-medium text-foreground">27 August 2026</span>
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
          By visiting or using the <strong className="text-foreground">{shopName}</strong> website or availing our
          in-store services, you agree to be bound by the following terms. Please read them carefully.
        </p>
        <div className="mt-8 h-px bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
      </header>

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map((section, idx) => (
          <Reveal key={section.title} delay={idx * 60}>
            <section
              id={`terms-${section.title.toLowerCase().replace(/[\s&]+/g, "-")}`}
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

      {/* Related links */}
      <Reveal delay={200}>
        <div className="mt-14 rounded-lg border border-gold/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
          <Scale className="mx-auto mb-3 size-8 text-gold/70" />
          <h2 className="font-serif text-xl font-medium">Have a question about our policies?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Visit us in store or get in touch — we are always happy to clarify.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Contact Us
            </Link>
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
