import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Phone,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  ChevronDown,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

// Shown directly on the floating pill.
const PRIMARY_NAV = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/repair", label: "Repair" },
  { to: "/about", label: "About" },
] as const;

// Tucked under "More" on the pill (still full links in the mobile menu).
const MORE_NAV = [
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
  { to: "/refurbished", label: "Refurbished" },
  { to: "/gift-hampers", label: "Gift Hampers" },
  { to: "/offers", label: "Offers" },
  { to: "/gallery", label: "Gallery" },
] as const;

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV] as const;

const navLinkClass =
  "border-b-2 border-transparent pb-1 text-sm font-medium text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground";
const navLinkActiveClass = "border-gold text-foreground";

/**
 * Slim utility strip above the nav — contact + social. Scrolls away with
 * the page (only the pill below stays floating/sticky), and is hidden on
 * small screens where that vertical space matters more.
 */
function TopBar() {
  const settings = useSettings();
  const phone = settings["phone"];
  const hours = settings["hours"];

  const social = (
    [
      { key: "instagram", href: settings["instagram"], icon: Instagram, label: "Instagram" },
      { key: "facebook", href: settings["facebook"], icon: Facebook, label: "Facebook" },
      { key: "youtube", href: settings["youtube"], icon: Youtube, label: "YouTube" },
      { key: "twitter", href: settings["twitter"], icon: Twitter, label: "Twitter" },
    ] as const
  ).filter((s) => s.href);

  if (!phone && !hours && social.length === 0) return null;

  return (
    <div className="relative hidden overflow-hidden bg-[linear-gradient(120deg,#0c0e14,#171a24_55%,#0c0e14)] sm:block">
      {/* Faint brand-glow accents for a premium, non-flat feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(420px circle at 10% 0%, rgba(184,137,75,0.22), transparent 60%), radial-gradient(360px circle at 92% 100%, rgba(184,137,75,0.14), transparent 55%)",
        }}
      />
      <div className="relative mx-auto flex h-10 max-w-7xl items-center justify-between px-4 text-[11px] tracking-wide text-white/70">
        <div className="flex items-center gap-5">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="group flex items-center gap-2 font-medium text-white/85 transition-colors hover:text-white"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-primary-glow">
                <Phone className="size-2.5" />
              </span>
              <span className="link-underline">{phone}</span>
            </a>
          )}
          {hours && (
            <span className="hidden items-center gap-2 text-white/60 md:flex">
              <span className="h-3 w-px bg-white/15" />
              <Clock className="size-3" />
              {hours}
            </span>
          )}
        </div>
        {social.length > 0 && (
          <div className="flex items-center gap-1.5">
            {social.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex size-6 items-center justify-center rounded-full text-white/60 transition-all duration-300 hover:-translate-y-px hover:bg-white/10 hover:text-white"
              >
                <s.icon className="size-3.5" />
              </a>
            ))}
          </div>
        )}
      </div>
      {/* Hairline seam with a subtle brand-colored glow, so the bar reads as
          an intentional band rather than an abrupt cutoff. */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

export function SiteHeader() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const logoUrl = settings["logo_url"];

  // Hide-on-scroll-down / show-on-scroll-up. Purely a transform on the sticky
  // pill — no change to its size, position, or styling.
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastYRef.current;

        if (y <= 0) {
          // Always visible at the very top of the page.
          setScrollHidden(false);
          lastYRef.current = y;
        } else if (Math.abs(delta) > 6) {
          // Ignore sub-threshold jitter to keep the motion flicker-free.
          setScrollHidden(delta > 0); // down → hide, up → show
          lastYRef.current = y;
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Never hide while the mobile menu is open, so it can't vanish mid-interaction.
  const isHidden = scrollHidden && !open;

  return (
    <>
      {/* Utility strip scrolls away with the page — only the pill below stays pinned. */}
      <TopBar />

      <div
        className={cn(
          "sticky top-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          isHidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        {/* Flush ledger bar — one gold hairline does the work shadows used to */}
        <div className="relative border-b border-gold bg-background">
          <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
              {logoUrl ? (
                <img src={logoUrl} alt={settings["shop_name"]} className="h-8 w-auto object-contain" />
              ) : (
                <span
                  className="flex size-8 items-center justify-center rounded-full font-serif text-sm font-semibold text-gold"
                  style={{ background: "linear-gradient(160deg, #1c2f6e, #0d1633)" }}
                >
                  {(settings["shop_name"] || "S").charAt(0)}
                </span>
              )}
              <span className="hidden font-serif text-sm font-semibold uppercase tracking-[1px] text-foreground sm:inline">
                {settings["shop_name"]}
              </span>
            </Link>

            {/* Desktop nav — centered, text links with a gold underline */}
            <nav className="hidden flex-1 items-center justify-center gap-8 xl:flex">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className={navLinkClass}
                  activeProps={{ className: navLinkActiveClass }}
                >
                  {item.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(navLinkClass, "flex items-center gap-1 data-[state=open]:border-gold data-[state=open]:text-foreground")}
                >
                  More
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-40 rounded-md p-1.5">
                  {MORE_NAV.map((item) => (
                    <DropdownMenuItem key={item.to} asChild className="rounded-[3px] px-3 py-2 text-sm">
                      <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <Link
                to="/cart"
                className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold"
                onClick={() => setOpen(false)}
              >
                <ShoppingCart className="size-4" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              <Button asChild size="sm" className="hidden px-5 text-[12px] font-semibold xl:flex">
                <Link to="/products">Shop Now</Link>
              </Button>

              <button
                className="p-2 text-foreground xl:hidden"
                aria-label="Toggle menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav — drops down flush beneath the bar */}
        <div
          className={cn(
            "overflow-hidden border-b border-border bg-card transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] xl:hidden",
            open ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-1 p-3">
            {ALL_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-[3px] px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
