import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Smartphone, X, ShoppingCart } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/repair", label: "Repair" },
  { to: "/refurbished", label: "Refurbished" },
  { to: "/gift-hampers", label: "Gift Hampers" },
  { to: "/offers", label: "Offers" },
  { to: "/gallery", label: "Gallery" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const logoUrl = settings["logo_url"];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          {logoUrl ? (
            <img src={logoUrl} alt={settings["shop_name"]} className="h-9 w-auto rounded-md object-contain" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full border border-primary/50">
              <Smartphone className="size-4 text-primary" />
            </span>
          )}
          <span className="font-serif text-[18px] sm:text-[20px] font-bold uppercase tracking-[1.5px] text-primary">
            {settings["shop_name"]}
          </span>
        </Link>

        {/* Desktop nav — scrollable, compact */}
        <nav className="hidden items-center gap-5 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="text-[11px] uppercase tracking-[1px] text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Cart icon */}
          <Link to="/cart" className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
            <ShoppingCart className="size-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          <Button
            asChild
            size="sm"
            className="hidden xl:flex rounded-full px-5 text-[11px] font-medium uppercase tracking-[0.5px]"
          >
            <Link to="/products">Shop Now</Link>
          </Button>

          <button
            className="rounded-lg p-2 text-foreground xl:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/70 xl:hidden",
          open ? "max-h-[28rem]" : "max-h-0",
        )}
        style={{ transition: "max-height 300ms ease" }}
      >
        <nav className="grid grid-cols-2 gap-1 px-4 py-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
