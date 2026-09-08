import { Link, useRouterState } from "@tanstack/react-router";
import { useCart } from "@/context/CartContext";
import { Store, Wrench, ShieldCheck, ShoppingBag, Phone } from "lucide-react";

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { itemCount } = useCart();

  const ITEMS = [
    { to: "/" as const, icon: Store, label: "Home" },
    { to: "/products" as const, icon: ShoppingBag, label: "Catalog" },
    { to: "/repair" as const, icon: Wrench, label: "Repairs" },
    { to: "/refurbished" as const, icon: ShieldCheck, label: "Certified" },
    { to: "/cart" as const, icon: ShoppingBag, label: "Cart", isCart: true },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full pb-safe border-t backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex h-15 items-center justify-around px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${
                active
                  ? "text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {item.isCart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {active && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
