import { Link } from "@tanstack/react-router";
import {
  Send,
  Phone,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function SiteFooter() {
  const settings = useSettings();
  const year = new Date().getFullYear();
  const phone = settings["phone"] || "09845458942";
  const whatsapp = settings["whatsapp"] || "917507575755";
  const address =
    settings["address"] ||
    "Shop No. 30, P.L. Khandge Plaza, Opp. Talegaon Railway Station, Talegaon Dabhade, Pune 410507";
  const email = settings["email"] || "contact@saicommunication.com";

  const QUICK_LINKS = [
    { to: "/products", search: { q: "", category: "Smartphones" }, label: "Smartphones (All Brands)" },
    { to: "/refurbished", label: "Certified Refurbished Handsets" },
    { to: "/repair", label: "Chip-Level Laboratory Repair" },
    { to: "/gift-hampers", label: "Custom Festive Gift Hampers" },
    { to: "/contact", label: "0% Down Payment EMI Schemes" },
    { to: "/products", search: { q: "", category: "Accessories" }, label: "Mobile Accessories & Earbuds" },
    { to: "/#reviews-section", label: "Customer Reviews & Stories (4.8 ★)" },
    { to: "/order-track", label: "Track Live Repair / Order Status" },
  ];

  const SERVICES = [
    { to: "/repair", label: "30-Min Display & Screen Replacement" },
    { to: "/repair", label: "Battery & Fast Charging Port Fix" },
    { to: "/repair", label: "Motherboard IC Micro-Soldering" },
    { to: "/repair", label: "Water & Liquid Damage Recovery" },
    { to: "/products", search: { q: "", category: "Smartphones" }, label: "Old Phone Exchange Bonus (₹3,500)" },
    { to: "/contact", label: "Bajaj Finserv & TVS Credit Approvals" },
    { to: "/refurbished", label: "42-Point Handset Quality Inspection" },
  ];

  const SOCIAL_UPDATES = [
    {
      text: "Festival Special: Exchange any old 4G/5G handset and get flat ₹3,500 extra bonus. In-store only...",
      link: "https://sai-communication.in/deals",
      to: "/products" as const,
    },
    {
      text: "New Stock: iPhone 16 & Samsung S24 Series now available with zero-down payment EMI in Talegaon...",
      link: "https://sai-communication.in/smartphones",
      to: "/products" as const,
    },
    {
      text: "Express Lab: 30-minute display replacement with 90-day warranty running daily by Vijay Sir...",
      link: "https://sai-communication.in/repair",
      to: "/repair" as const,
    },
  ];

  return (
    <footer
      className="w-full text-slate-300 pb-16 lg:pb-0"
      style={{
        backgroundColor: "#1F2732",
      }}
    >
      {/* ── Top Main Footer Grid (4 Columns matching Bootstrap 4 Footer reference) ── */}
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Column 1: Brand & Find us (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 group select-none">
              <img src="/logo.png" alt="Sai Communication logo" className="size-10 rounded-full object-cover" />
              <div
                className="font-bold text-lg tracking-tight leading-none"
                style={{ fontFamily: "'Philosopher', 'Marcellus', serif" }}
              >
                <span className="text-white">Sai </span>
                <span className="logo-text-gradient">Communication</span>
              </div>
            </Link>

            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              Serving Talegaon Dabhade &amp; Pune since 2005. Sai Communication is your trusted multi-brand smartphone showroom, certified refurbished center, and express chip-level repair laboratory headed by Vijay Sir.
            </p>

            <div className="space-y-2.5 pt-2 text-xs text-slate-300">
              {/* Location */}
              <div className="flex items-start gap-3">
                <Send className="size-4 shrink-0 text-[#F5A623] mt-0.5" />
                <span className="leading-snug text-slate-300">{address}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-[#F5A623]" />
                <a
                  href={`tel:${phone}`}
                  className="hover:text-[#F5A623] transition-colors font-medium text-slate-200"
                >
                  +91-{phone.replace(/^(\+91|0)/, "")}
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-[#F5A623]" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#F5A623] transition-colors text-slate-200"
                >
                  {email}
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick links (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-base font-bold text-white tracking-wide">
              Quick links
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {QUICK_LINKS.map((item, idx) => (
                <li key={idx}>
                  <Link
                    to={item.to}
                    search={"search" in item ? item.search : undefined}
                    className="hover:text-[#F5A623] hover:translate-x-1 inline-block transition-all"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick links / Services (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white tracking-wide">
              Quick links
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {SERVICES.map((item, idx) => (
                <li key={idx}>
                  <Link
                    to={item.to}
                    search={"search" in item ? item.search : undefined}
                    className="hover:text-[#F5A623] hover:translate-x-1 inline-block transition-all"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Follow us with Twitter update stream (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-base font-bold text-white tracking-wide">
              Follow us
            </h3>
            <div className="space-y-3.5 text-xs">
              {SOCIAL_UPDATES.map((update, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <Twitter className="size-4 shrink-0 text-[#00ACEE] mt-0.5" />
                  <p className="text-slate-400 leading-relaxed">
                    {update.text}{" "}
                    <Link
                      to={update.to}
                      className="text-[#00ACEE] hover:underline break-all"
                    >
                      {update.link}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider line ── */}
      <div
        className="w-full border-t"
        style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
      />

      {/* ── Bottom Section (Horizontal Nav + Copyright + Circular Social Icons) ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6">
        {/* Horizontal Navigation row */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-300">
          <Link to="/" className="hover:text-[#F5A623] transition-colors">
            Home
          </Link>
          <Link to="/about" className="hover:text-[#F5A623] transition-colors">
            About
          </Link>
          <Link to="/repair" className="hover:text-[#F5A623] transition-colors">
            Services
          </Link>
          <Link to="/products" className="hover:text-[#F5A623] transition-colors">
            Pricing
          </Link>
          <Link to="/gift-hampers" className="hover:text-[#F5A623] transition-colors">
            Hampers
          </Link>
          <Link to="/contact" className="hover:text-[#F5A623] transition-colors">
            Contact
          </Link>
        </nav>

        {/* Copyright notice */}
        <p className="mt-4 text-xs text-slate-400">
          Copyright © {year} | Designed with ❤️ for{" "}
          <span
            className="font-bold text-white tracking-wide"
            style={{ fontFamily: "'Philosopher', 'Marcellus', serif" }}
          >
            Sai <span className="logo-text-gradient">Communication</span>
          </span>{" "}
          | Founder: <span className="text-slate-300 font-medium">Vijay Sir</span>
        </p>

        {/* Design credit pill */}
        <div className="mt-4 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-wide"
            style={{
              backgroundColor: "#19212A",
              borderColor: "rgba(255, 255, 255, 0.12)",
              color: "#F5A623",
            }}
          >
            <Sparkles className="size-3.5" />
            Designed by <span className="font-bold">RELENTIX</span>
          </span>
        </div>

        {/* Circular Social Media Icon Buttons */}
        <div className="mt-5 flex items-center justify-center gap-3">
          {/* Facebook */}
          <a
            href={settings["facebook"] || "https://facebook.com"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="flex size-9 items-center justify-center rounded-full border text-slate-300 transition-all hover:bg-[#F5A623] hover:text-[#1B2430] hover:border-[#F5A623] hover:scale-110"
            style={{
              backgroundColor: "#19212A",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Facebook className="size-4 fill-current" />
          </a>

          {/* Twitter / X */}
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            className="flex size-9 items-center justify-center rounded-full border text-slate-300 transition-all hover:bg-[#F5A623] hover:text-[#1B2430] hover:border-[#F5A623] hover:scale-110"
            style={{
              backgroundColor: "#19212A",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Twitter className="size-4 fill-current" />
          </a>

          {/* LinkedIn / WhatsApp */}
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="flex size-9 items-center justify-center rounded-full border text-slate-300 transition-all hover:bg-[#F5A623] hover:text-[#1B2430] hover:border-[#F5A623] hover:scale-110"
            style={{
              backgroundColor: "#19212A",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Linkedin className="size-4 fill-current" />
          </a>

          {/* Instagram */}
          <a
            href={"https://www.instagram.com/saicommunication_2266/"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex size-9 items-center justify-center rounded-full border text-slate-300 transition-all hover:bg-[#F5A623] hover:text-[#1B2430] hover:border-[#F5A623] hover:scale-110"
            style={{
              backgroundColor: "#19212A",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Instagram className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
