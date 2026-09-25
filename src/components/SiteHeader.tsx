import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { CATEGORIES, offerDiscountText } from "@/lib/types";
import { heroBannerOfferQuery } from "@/lib/queries";
import { AuthDialog } from "@/components/auth/AuthDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  Phone,
  MessageCircle,
  Smartphone,
  Wrench,
  Gift,
  ShieldCheck,
  Flame,
  Store,
  Clock,
  Sparkles,
  ShoppingBag,
  Search,
  ArrowRight,
  UserCircle2,
} from "lucide-react";

const PRODUCT_CATEGORY_CHIPS = CATEGORIES.filter((c) => c !== "All");

export function SiteHeader() {
  const settings = useSettings();
  const { itemCount, total } = useCart();
  const { user, profile, signOut } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: headerOffer } = useQuery(heroBannerOfferQuery);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { toggleTheme, isDark } = useTheme();

  const [query, setQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("All");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // The mobile drawer below is portaled to document.body (see its comment).
  // `document` doesn't exist during SSR, so the portal target is only ever
  // resolved after mount — this flag gates that render to the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Hide the header on scroll-down, reveal on scroll-up — frees vertical
  // space and stops it from stacking with the page's own sticky "Filter"
  // bar underneath it. Always visible at the very top of the page, and
  // never hides while a menu/dropdown is open so it can't vanish mid-use.
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastYRef.current;

        if (y <= 0) {
          setScrollHidden(false);
          lastYRef.current = y;
        } else if (Math.abs(delta) > 6) {
          setScrollHidden(delta > 0);
          lastYRef.current = y;
        }
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHidden = scrollHidden && !isCategoryDropdownOpen && !isMobileMenuOpen;

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close menus on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsCategoryDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const routerState = useRouterState();
  const searchParams = (routerState.location.search as Record<string, string | undefined>) || {};

  // Sync category and search query from URL when on /products
  useEffect(() => {
    if (pathname === "/products") {
      setSearchCategory(searchParams.category || "All");
      if (searchParams.q !== undefined) {
        setQuery(searchParams.q);
      }
    }
  }, [pathname, searchParams.category, searchParams.q]);

  function handleCategorySelectChange(newCat: string) {
    setSearchCategory(newCat);
    navigate({
      to: "/products",
      search: {
        q: query.trim() ? query.trim() : undefined,
        category: newCat === "All" ? undefined : newCat,
      },
    });
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    navigate({
      to: "/products",
      search: {
        q: query.trim() ? query.trim() : undefined,
        category: searchCategory === "All" ? undefined : searchCategory,
      },
    });
  }

  const phone = settings["phone"] || "09845458942";
  // Normalise to country-code form (91XXXXXXXXXX) whether the setting holds 10 digits, 0-prefixed or already 91-prefixed.
  const whatsappDigits = (settings["whatsapp"] || phone).replace(/\D/g, "").replace(/^0+/, "");
  const whatsapp = whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits;

  const NAV_ITEMS = [
    { label: "Home", to: "/" as const, isHome: true },
    { label: "Smartphones", to: "/products" as const, search: { q: "", category: "Smartphones" }, badge: "HOT", badgeColor: "bg-red-500 text-white" },
    { label: "Refurbished", to: "/refurbished" as const, badge: "Warranty", badgeColor: "bg-emerald-600 text-white" },
    { label: "Lab Repair", to: "/repair" as const, badge: "30-Min", badgeColor: "bg-amber-500 text-[#1B2430]" },
    { label: "Gift Hampers", to: "/gift-hampers" as const, badge: "New", badgeColor: "bg-purple-600 text-white" },
    { label: "Zero-Down EMI", to: "/contact" as const },
    { label: "About Vijay Sir", to: "/about" as const },
    { label: "Gallery", to: "/gallery" as const },
    { label: "Today's Offers", to: "/offers" as const, badge: "🔥 Deals", badgeColor: "bg-[#F5A623] text-[#1B2430] font-black" },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full pt-safe border-b shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        transform: isHidden ? "translateY(-100%)" : "translateY(0)",
      }}
    >
      {/* ── 0. Offer Ribbon — mobile/tablet only. On lg+ the same live offer
          is folded straight into the mega nav bar's CTA below, so this
          doesn't duplicate it there. ── */}
      {headerOffer && (
        <Link
          to="/offers"
          className="flex h-8 items-center justify-center gap-2.5 px-4 text-[11.5px] font-bold text-[#241505] transition-opacity hover:opacity-95 lg:hidden"
          style={{
            background: "linear-gradient(90deg, #B85C2B 0%, var(--primary) 45%, var(--primary-glow) 100%)",
          }}
        >
          <span className="rounded px-2 py-0.5 text-[10.5px] font-black tracking-wide" style={{ backgroundColor: "#241505", color: "var(--primary-glow)" }}>
            {offerDiscountText(headerOffer)}
          </span>
          <span className="truncate">{headerOffer.title || "Limited Time Offer"}</span>
          <span className="hidden items-center gap-1 font-black underline underline-offset-2 sm:flex">
            Shop now <ArrowRight className="size-3" />
          </span>
        </Link>
      )}

      {/* ── 2. Main Brand & Search Row ── */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex lg:hidden size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--muted)",
            color: "var(--foreground)",
          }}
          aria-label="Open Navigation Menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Brand Logo — Unique Charismatic Typography & Loving Brand Name */}
        <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3 group select-none py-1">
          {/* Bespoke Emblem Badge */}
          <img
            src="/logo.png"
            alt="Sai Communication logo"
            className="size-10 sm:size-12 shrink-0 rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Typography Lockup — Loving, Unique & Warm */}
          <div className="flex min-w-0 flex-col leading-none">
            <div
              className="flex min-w-0 items-baseline gap-1 sm:gap-1.5"
              style={{ fontFamily: "'Philosopher', 'Marcellus', serif" }}
            >
              <span className="text-[18px] sm:text-[23px] md:text-[26px] font-bold text-foreground transition-colors group-hover:text-primary tracking-[-0.01em]">
                Sai
              </span>
              <span
                className="truncate text-[18px] sm:text-[23px] md:text-[26px] font-bold tracking-[-0.01em] logo-text-gradient drop-shadow-[0_2px_12px_rgba(245,166,35,0.22)]"
              >
                Communication
              </span>
            </div>

            {/* Refined Subtitle with loving touch — hidden below sm; no room
                to show it without forcing the header into horizontal scroll */}
            <div className="hidden items-center gap-1.5 mt-1 sm:flex">
              <span className="inline-block size-1.5 rounded-full bg-[#F5A623]" />
              <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500 dark:text-slate-400 font-sans whitespace-nowrap">
                Smartphone Showroom <span className="text-[#F5A623] mx-0.5">✦</span> Chip-Level Lab
              </span>
            </div>
          </div>
        </Link>

        {/* Expanded Desktop Search Bar with Category Select */}
        <form
          onSubmit={handleSearch}
          className="relative hidden md:flex flex-1 max-w-xl lg:max-w-2xl items-center"
        >
          <div
            className="flex w-full items-center rounded-xl border transition-all overflow-hidden shadow-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            {/* Category Select inside search bar */}
            <select
              id="header-search-category-select"
              value={searchCategory}
              onChange={(e) => handleCategorySelectChange(e.target.value)}
              className="h-10 border-r px-3 text-xs font-bold focus:outline-none cursor-pointer hidden sm:block bg-muted text-foreground hover:bg-muted/80 transition-colors"
              style={{
                borderColor: "var(--border)",
              }}
              aria-label="Search Category"
            >
              <option className="bg-card text-foreground" value="All">All Categories</option>
              <option className="bg-card text-foreground" value="Smartphones">Smartphones</option>
              <option className="bg-card text-foreground" value="Feature Phones">Feature Phones</option>
              <option className="bg-card text-foreground" value="Tablets">Tablets</option>
              <option className="bg-card text-foreground" value="Accessories">Accessories</option>
            </select>

            <div className="relative flex-1 flex items-center">
              <Search
                className="pointer-events-none absolute left-3.5 size-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search iPhone, Samsung, screen repair, charger, earbuds..."
                className="h-10 w-full pl-10 pr-3 text-xs font-medium focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <button
              type="submit"
              className="flex h-10 items-center gap-1.5 px-4 text-xs font-bold text-primary-foreground transition-all hover:brightness-105 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)",
              }}
            >
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Right Actions: Dark Mode, Cart, Store Button */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex size-9 sm:size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            style={{
              backgroundColor: isDark ? "var(--primary)" : "var(--muted)",
              borderColor: isDark ? "var(--primary)" : "var(--border)",
              color: isDark ? "var(--primary-foreground)" : "var(--primary)",
            }}
          >
            {isDark ? (
              <Sun className="size-4" strokeWidth={2.5} />
            ) : (
              <Moon className="size-4" strokeWidth={2.5} />
            )}
          </button>

          {/* Cart with Item Counter */}
          <Link
            to="/cart"
            aria-label="Cart"
            className="flex h-9 sm:h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all hover:border-primary shadow-sm group"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <div className="relative">
              <ShoppingBag className="size-4 group-hover:text-primary transition-colors" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-none">
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                Cart
              </span>
              <span className="text-xs font-bold text-primary">
                {itemCount > 0 ? `₹${total.toLocaleString("en-IN")}` : "₹0"}
              </span>
            </div>
          </Link>

          {/* Account / Login */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 sm:h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all hover:border-primary shadow-sm cursor-pointer"
                  style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <UserCircle2 className="size-4 text-primary" />
                  <div className="hidden sm:flex flex-col items-start leading-none">
                    <span className="text-[10px] font-semibold" style={{ color: "var(--muted-foreground)" }}>Hello</span>
                    <span className="max-w-24 truncate text-xs font-bold">{profile?.full_name?.split(" ")[0] || "Account"}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.full_name || "My Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/account">👤 My Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/account">📦 My Orders</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/account">📍 My Addresses</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/account">❤️ Wishlist</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/account">💳 Payment Methods</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/account">🔄 Returns / Refunds</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/order-track" search={{ phone: profile?.phone ?? "", order: "" }}>🚚 Track Order</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await signOut(); toast.success("You've been logged out."); navigate({ to: "/" }); }}
                  className="text-destructive-foreground focus:text-destructive-foreground"
                >
                  🚪 Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAuthDialogOpen(true)}
                className="flex h-9 sm:h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all hover:border-primary shadow-sm cursor-pointer"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <UserCircle2 className="size-4 text-primary" />
                <span className="hidden sm:inline">Login</span>
              </button>
              <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
            </>
          )}

          {/* Visit Store Button */}
          <Link
            to="/contact"
            aria-label="Contact & Store"
            className="hidden sm:flex h-9 sm:h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
            style={{ backgroundColor: "var(--chrome-deep)" }}
          >
            <Store className="size-4 text-primary" />
            <span>Visit Store</span>
          </Link>
        </div>
      </div>

      {/* ── Mobile Search Bar (under logo on small screens) ── */}
      <form
        onSubmit={handleSearch}
        className="relative flex h-11 items-center px-4 md:hidden border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <Search
          className="pointer-events-none absolute left-7 size-4"
          style={{ color: "var(--muted-foreground)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search iPhone, Samsung, repair, accessories..."
          className="h-8 w-full rounded-lg pl-9 pr-3 text-xs focus:outline-none"
          style={{
            backgroundColor: "var(--muted)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </form>

      {/* ═══════════════════════════════════════════════════════════════
          3. MEGA NAV BAR (Desktop & Tablet) — one bar carrying everything
          that used to be three stacked strips: category menu + nav links,
          the live offer, and store info (hours / WhatsApp / phone). Split
          into two zones on a single row: an angled gold panel on the right
          holds the "urgent" info (offer + contact), cut diagonally into
          the muted nav zone instead of a plain vertical rule — that seam
          is the bar's one distinguishing shape.
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:block w-full border-t"
        style={{
          backgroundColor: "var(--muted)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex min-h-12 max-w-7xl items-stretch gap-0 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 py-1.5">
            {/* ── "All Categories" Mega Dropdown Button ── */}
            <div className="relative shrink-0 z-50" ref={categoryDropdownRef}>
              <button
                type="button"
                id="all-categories-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoryDropdownOpen((prev) => !prev);
                }}
                className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-4 text-xs font-extrabold transition-all cursor-pointer shadow-xs hover:opacity-95"
                style={{
                  backgroundColor: isCategoryDropdownOpen ? "var(--card)" : "var(--primary)",
                  color: isCategoryDropdownOpen ? "var(--primary)" : "var(--primary-foreground)",
                  border: isCategoryDropdownOpen ? "1px solid var(--primary)" : "1px solid transparent",
                }}
                aria-expanded={isCategoryDropdownOpen}
                aria-label="All Categories Menu"
              >
                <Menu className="size-4" />
                <span className="uppercase tracking-wider font-black">All Categories</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div
                  id="all-categories-dropdown-menu"
                  className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    Product Categories
                  </div>

                  <Link
                    to="/products"
                    search={{ q: "", category: "All" }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Sparkles className="size-4 text-primary" />
                      All Products &amp; Brands
                    </span>
                    <span className="text-[10px] font-black text-primary">ALL</span>
                  </Link>

                  <Link
                    to="/products"
                    search={{ q: "", category: "Smartphones" }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Smartphone className="size-4 text-primary" />
                      Smartphones (All Brands)
                    </span>
                    <span className="text-[10px] font-bold text-red-500">HOT</span>
                  </Link>

                  <Link
                    to="/products"
                    search={{ q: "", category: "Feature Phones" }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Phone className="size-4 text-primary" />
                    Feature &amp; Keypad Phones
                  </Link>

                  <Link
                    to="/products"
                    search={{ q: "", category: "Tablets" }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Smartphone className="size-4 text-primary rotate-90" />
                    Tablets &amp; iPads
                  </Link>

                  <Link
                    to="/products"
                    search={{ q: "", category: "Accessories" }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Sparkles className="size-4 text-purple-500" />
                    Chargers, Cases &amp; Earbuds
                  </Link>

                  <div
                    className="my-1.5 border-t"
                    style={{ borderColor: "var(--border)" }}
                  />

                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    Services &amp; Special Stores
                  </div>

                  <Link
                    to="/refurbished"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      Certified Refurbished
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">6-Mo Wty</span>
                  </Link>

                  <Link
                    to="/repair"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Wrench className="size-4 text-amber-500" />
                      Chip-Level Express Repair
                    </span>
                    <span className="text-[10px] font-bold text-amber-500">Same-Day</span>
                  </Link>

                  <Link
                    to="/gift-hampers"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Gift className="size-4 text-pink-500" />
                    Festival Gift Hampers
                  </Link>
                </div>
              )}
            </div>

            {/* ── Primary Navigation Bar Links ── */}
            <nav className="flex items-center gap-0.5 xl:gap-1 pl-2 overflow-x-auto no-scrollbar flex-1">
              {NAV_ITEMS.filter((item) => item.label !== "Today's Offers").map((item) => {
                const isActive = item.isHome
                  ? pathname === "/"
                  : item.to !== "/" && pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    search={item.search}
                    className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 xl:px-3 py-1.5 text-[12.5px] font-bold transition-all rounded-md ${
                      isActive
                        ? "text-primary bg-card shadow-xs"
                        : "hover:text-primary hover:bg-card/50"
                    }`}
                    style={{
                      color: isActive ? "var(--primary)" : "var(--foreground)",
                    }}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`shrink-0 whitespace-nowrap text-[8.5px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* ── Secondary quick-links — smaller, muted, so they read
                  as utility shortcuts rather than compete with the primary
                  nav items above. Carried over from the old utility strip. ── */}
              <span className="mx-1.5 hidden h-4 w-px shrink-0 xl:block" style={{ backgroundColor: "var(--border)" }} />
              <Link
                to="/order-track"
                search={{ phone: profile?.phone ?? "", order: "" }}
                className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors hover:text-primary xl:block"
                style={{ color: "var(--muted-foreground)" }}
              >
                Track Order
              </Link>
              <Link
                to="/repair-track"
                search={{ phone: profile?.phone ?? "" }}
                className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors hover:text-primary xl:block"
                style={{ color: "var(--muted-foreground)" }}
              >
                Track Repair
              </Link>
              <Link
                to="/contact"
                className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors hover:text-primary xl:block"
                style={{ color: "var(--muted-foreground)" }}
              >
                Store Locator
              </Link>
            </nav>
          </div>

          {/* ── Gold info panel — offer + store info, cut off the nav zone
              by a diagonal seam instead of a plain divider. Everything
              that used to be its own strip lives in here now. ── */}
          <div className="relative flex shrink-0 items-stretch">
            <div
              aria-hidden
              className="hidden xl:block w-6 shrink-0"
              style={{
                background: "linear-gradient(135deg, #B85C2B, var(--primary-glow))",
                clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="flex items-center gap-3 whitespace-nowrap px-4 text-[11.5px] font-bold"
              style={{
                background: "linear-gradient(135deg, #B85C2B, var(--primary-glow))",
                color: "#241505",
              }}
            >
              {/* Live offer (or a standing "Today's Offers" CTA when none is running) */}
              <Link
                to="/offers"
                className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${
                  pathname.startsWith("/offers") ? "bg-[#241505]/15" : "hover:bg-[#241505]/10"
                }`}
              >
                <Flame className="size-3.5" />
                {headerOffer ? (
                  <>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-black tracking-wide" style={{ backgroundColor: "#241505", color: "var(--primary-glow)" }}>
                      {offerDiscountText(headerOffer)}
                    </span>
                    <span className="max-w-40 truncate font-black">{headerOffer.title || "Limited Time Offer"}</span>
                  </>
                ) : (
                  <span className="font-black">Today's Offers</span>
                )}
              </Link>

              <span className="h-4 w-px bg-[#241505]/25" />

              {/* Store status */}
              <span className="hidden items-center gap-1.5 xl:flex" title="Station Road, Talegaon Dabhade, Pune">
                <span className="size-1.5 rounded-full bg-[#1B4D2E] animate-pulse" />
                Open till 9:30 PM
              </span>

              <span className="hidden h-4 w-px bg-[#241505]/25 xl:block" />

              <a
                href={`https://wa.me/${whatsapp}?text=Hello%20Vijay%20Sir%2C%20I%20want%20to%20enquire%20about%20a%20phone%20repair`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:underline"
                title="WhatsApp Vijay Sir"
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden 2xl:inline">WhatsApp</span>
              </a>

              <span className="h-4 w-px bg-[#241505]/25" />

              <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="size-3.5" />
                {phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Quick-Scroll Bar (Mobile/Tablet) ── */}
      <nav
        className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2 border-t"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--muted)",
        }}
      >
        <Link
          to="/products"
          search={{ q: "", category: "All" }}
          className="whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-bold transition-all"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          All Brands
        </Link>
        {PRODUCT_CATEGORY_CHIPS.map((c) => (
          <Link
            key={c}
            to="/products"
            search={{ q: "", category: c }}
            className="whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            {c}
          </Link>
        ))}
        <Link
          to="/repair"
          className="whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          ⚡ Lab Repair
        </Link>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          4. MOBILE NAVIGATION DRAWER (Slide-out menu)
          Portaled to <body> — this header animates its hide-on-scroll via
          `transform`, which creates a new containing block for any
          `position: fixed` descendant (per the CSS spec). Left in place,
          this drawer's "fixed inset-0" would size/position itself against
          the header's own box instead of the viewport, collapsing it into
          a small box pinned to the top instead of a full-screen overlay.
          Portaling it out of the header sidesteps that entirely.
          ═══════════════════════════════════════════════════════════════ */}
      {isMobileMenuOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className="relative flex w-5/6 max-w-sm flex-col h-full overflow-y-auto p-5 shadow-2xl z-10 animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            {/* Header with Close */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Sai Communication logo" className="size-10 rounded-full object-cover" />
                <div>
                  <div
                    className="font-bold text-lg tracking-tight leading-none"
                    style={{ fontFamily: "'Philosopher', 'Marcellus', serif" }}
                  >
                    <span>Sai </span>
                    <span className="logo-text-gradient">Communication</span>
                  </div>
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#F5A623] mt-0.5 font-sans">
                    Talegaon Dabhade ✦ Pune
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex size-8 items-center justify-center rounded-md border cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Account / Login */}
            {user ? (
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-4 flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-bold"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
              >
                <UserCircle2 className="size-5 text-primary" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold text-muted-foreground">Hello, {profile?.full_name?.split(" ")[0] || "there"}</span>
                  My Account
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); setAuthDialogOpen(true); }}
                className="mt-4 flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-bold"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
              >
                <UserCircle2 className="size-5 text-primary" />
                Login / Create Account
              </button>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 my-4">
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold text-white bg-chrome-deep"
              >
                <Phone className="size-3.5 text-primary" />
                Call Store
              </a>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold text-white bg-emerald-600"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider py-1 text-primary">
                Navigation Menu
              </div>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold hover:bg-muted transition-colors"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="my-4 border-t" style={{ borderColor: "var(--border)" }} />

            {/* Product Categories */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider py-1 text-primary">
                Departments &amp; Categories
              </div>
              {PRODUCT_CATEGORY_CHIPS.map((cat) => (
                <Link
                  key={cat}
                  to="/products"
                  search={{ q: "", category: cat }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <span>{cat}</span>
                  <span style={{ color: "var(--muted-foreground)" }}>→</span>
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                <p className="font-bold text-foreground">Sai Communication Showroom</p>
                <p>Opp. Talegaon Railway Station, Talegaon Dabhade, Pune 410506</p>
                <p className="mt-1">Mon–Sun: 10:00 AM – 9:30 PM</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
