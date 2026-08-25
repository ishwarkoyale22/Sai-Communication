import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, MapPin, MessageCircle, Phone, Twitter, Package, Wrench } from "lucide-react";
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
];

export function SiteFooter() {
  const settings = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-gradient-to-b from-card/60 to-card/20">
      {/* Faint brand-glow, echoes the header's premium strip instead of a flat cutoff */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <h2 className="text-lg font-bold text-primary">{settings["shop_name"]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{settings["tagline"]}</p>
          <p className="mt-3 text-xs text-muted-foreground">Est. {settings["established"]} · {settings["verification"]}</p>
          <div className="mt-4 flex gap-2">
            {settings["facebook"] && (
              <a href={settings["facebook"]} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md">
                <Facebook className="size-4" />
              </a>
            )}
            {settings["instagram"] && (
              <a href={settings["instagram"]} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md">
                <Instagram className="size-4" />
              </a>
            )}
            {settings["youtube"] && (
              <a href={settings["youtube"]} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md">
                <Youtube className="size-4" />
              </a>
            )}
            <a href={`https://wa.me/${settings["whatsapp"]}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md">
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
            <Phone className="size-4 text-primary" /> {settings["phone"]}
          </a>
          {settings["phone_alt"] && (
            <a href={`tel:${settings["phone_alt"]}`} className="mt-2 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
              <Phone className="size-4 text-primary" /> {settings["phone_alt"]}
            </a>
          )}
          <a href={`https://wa.me/${settings["whatsapp"]}`} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
            <MessageCircle className="size-4 text-green-500" /> WhatsApp Chat
          </a>
          <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {settings["address"]}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{settings["hours"]}</p>
        </div>
      </div>

      <div className="relative border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {year} {settings["shop_name"]}. All rights reserved. · Talegaon Dabhade, Pune, Maharashtra
      </div>
    </footer>
  );
}
