import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  Smartphone,
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
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

// Tucked under "More" on the pill (still full links in the mobile menu).
const MORE_NAV = [
  { to: "/refurbished", label: "Refurbished" },
  { to: "/gift-hampers", label: "Gift Hampers" },
  { to: "/offers", label: "Offers" },
  { to: "/gallery", label: "Gallery" },
] as const;

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV] as const;

const navLinkClass =
  "link-underline rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const navLinkActiveClass = "bg-secondary text-foreground shadow-sm";

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
    <div className="hidden bg-secondary/40 sm:block">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-5">
          {phone && (
            <a href={`tel:${phone}`} className="link-underline flex items-center gap-1.5 hover:text-primary">
              <Phone className="size-3" />
              {phone}
            </a>
          )}
          {hours && (
            <span className="hidden items-center gap-1.5 md:flex">
              <Clock className="size-3" />
              {hours}
            </span>
          )}
        </div>
        {social.length > 0 && (
          <div className="flex items-center gap-3.5">
            {social.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <s.icon className="size-3.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const logoUrl = settings["logo_url"];

  return (
    <div className="sticky top-0 z-40">
      <TopBar />

      <div className="relative flex justify-center px-3 py-3 sm:px-4">
        {/* Floating pill */}
        <div className="flex w-full max-w-4xl items-center gap-1 rounded-full border border-border/70 bg-card/95 p-1.5 pl-4 shadow-lg shadow-black/[0.06] backdrop-blur-xl">
          <Link to="/" className="flex shrink-0 items-center gap-2 pr-2" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <img src={logoUrl} alt={settings["shop_name"]} className="h-8 w-auto rounded-md object-contain" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full border border-primary/50">
                <Smartphone className="size-3.5 text-primary" />
              </span>
            )}
            <span className="hidden font-serif text-sm font-bold uppercase tracking-[1px] text-primary sm:inline">
              {settings["shop_name"]}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 xl:flex">
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
                className={cn(
                  navLinkClass,
                  "flex items-center gap-1 data-[state=open]:bg-secondary data-[state=open]:text-foreground",
                )}
              >
                More
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-40 rounded-2xl p-1.5">
                {MORE_NAV.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="rounded-xl px-3 py-2 text-sm">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-1">
            <Link
              to="/cart"
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              onClick={() => setOpen(false)}
            >
              <ShoppingCart className="size-4" />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            <Button
              asChild
              size="sm"
              className="hidden rounded-full px-5 text-[12px] font-semibold xl:flex"
            >
              <Link to="/products">Shop Now</Link>
            </Button>

            <button
              className="rounded-full p-2 text-foreground xl:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav — floats as its own card under the pill */}
        <div
          className={cn(
            "absolute left-3 right-3 top-full z-40 mt-2 overflow-hidden rounded-3xl border border-border/70 bg-card/98 shadow-xl shadow-black/[0.08] backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:left-4 sm:right-4 xl:hidden",
            open ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav className="grid grid-cols-2 gap-1 p-3">
            {ALL_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
