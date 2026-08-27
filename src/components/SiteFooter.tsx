import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, MapPin, MessageCircle, Phone, Twitter, Package, Wrench, Star } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const QUICK_LINKS = [
  { to: "/products", label: "Products" },
  { to: "/repair", label: "Mobile Repair" },
  { to: "/refurbished", label: "Refurbished Phones" },
  { to: "/gift-hampers", label: "Gift Hampers" },
  { to: "/offers", label: "Offers & Deals" },
  { to: "/gallery", label: "Gallery" },
];

const INFO_LINKS = [
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
  { to: "/order-track", label: "Track Order" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-and-conditions", label: "Terms & Conditions" },
];

export function SiteFooter() {
  const settings = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/40">
      {/* Thin gold hairline, echoes the header's premium strip instead of a flat cutoff */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <h2 className="text-lg font-medium font-serif text-primary">{settings["shop_name"]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{settings["tagline"]}</p>
          <p className="caption-mono mt-3">Est. {settings["established"]} · {settings["verification"]}</p>
          <div className="mt-4 flex gap-2">
            {settings["facebook"] && (
              <a href={settings["facebook"]} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="flex size-9 items-center justify-center rounded-full border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                style={{ borderColor: "#1877F233", color: "#1877F2" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1877F2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <Facebook className="size-4" />
              </a>
            )}
            {settings["instagram"] && (
              <a href={settings["instagram"]} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="flex size-9 items-center justify-center rounded-full border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                style={{ borderColor: "#E1306C33", color: "#E1306C" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <Instagram className="size-4" />
              </a>
            )}
            {settings["youtube"] && (
              <a href={settings["youtube"]} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="flex size-9 items-center justify-center rounded-full border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                style={{ borderColor: "#FF000033", color: "#FF0000" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FF0000")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <Youtube className="size-4" />
              </a>
            )}
            <a href={`https://wa.me/${settings["whatsapp"]}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="flex size-9 items-center justify-center rounded-full border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
              style={{ borderColor: "#25D36633", color: "#25D366" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#25D366")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <MessageCircle className="size-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Links</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="link-underline text-foreground/80 hover:text-primary">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Info */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Information</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {INFO_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="link-underline text-foreground/80 hover:text-primary">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Visit & Contact</h3>
          <a href={`tel:${settings["phone"]}`} className="mt-3 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
            <Phone className="size-4 text-gold" /> {settings["phone"]}
          </a>
          {settings["phone_alt"] && (
            <a href={`tel:${settings["phone_alt"]}`} className="mt-2 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
              <Phone className="size-4 text-gold" /> {settings["phone_alt"]}
            </a>
          )}
          <a href={`https://wa.me/${settings["whatsapp"]}`} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
            <MessageCircle className="size-4 text-gold" /> WhatsApp Chat
          </a>
          <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
            {settings["address"]}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{settings["hours"]}</p>
        </div>
      </div>

      <div
        className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t px-4 py-5 text-center text-xs"
        style={{ borderColor: "#2A2E22", background: "#14150F", color: "#9A9E8C" }}
      >
        <span>
          © {year} {settings["shop_name"]}. All rights reserved. · Talegaon Dabhade, Pune, Maharashtra
        </span>
        <span className="hidden h-3 w-px sm:block" style={{ background: "#2A2E22" }} />
        <span className="inline-flex items-center gap-3">
          <Link to="/privacy-policy" style={{ color: "#9A9E8C" }} className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span style={{ color: "#2A2E22" }}>·</span>
          <Link to="/terms-and-conditions" style={{ color: "#9A9E8C" }} className="hover:text-white transition-colors">
            Terms &amp; Conditions
          </Link>
        </span>
        <span className="hidden h-3 w-px sm:block" style={{ background: "#2A2E22" }} />
        <span className="inline-flex items-center gap-1.5">
          Designed by
          <a
            href="https://relentix.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold uppercase tracking-[0.5px] transition-colors hover:bg-gold/10"
            style={{ borderColor: "#B8894B", color: "#D9B57C" }}
          >
            <Star className="size-3 fill-current" />
            Relentix
          </a>
        </span>
      </div>
    </footer>
  );
}
