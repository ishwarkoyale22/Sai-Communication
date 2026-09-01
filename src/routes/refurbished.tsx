import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MessageCircle, ShieldCheck, Battery, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { refurbishedQuery } from "@/lib/queries";
import { useRealtimeRefetch } from "@/hooks/useRealtimeRefetch";
import { formatINR } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import type { RefurbishedProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/refurbished")({
  head: () => ({
    meta: [
      { title: "Refurbished & Second-Hand Phones | Sai Communication" },
      { name: "description", content: "Buy certified refurbished and second-hand smartphones at Sai Communication. Grade A/B/C phones from top brands with warranty. Talegaon Dabhade, Pune." },
      { property: "og:title", content: "Refurbished Phones | Sai Communication" },
    ],
  }),
  component: RefurbishedPage,
});

const CONDITIONS = ["All", "excellent", "good", "fair"] as const;
const CONDITION_LABELS: Record<string, string> = { excellent: "Excellent", good: "Good", fair: "Fair" };
const CONDITION_COLORS: Record<string, string> = {
  excellent: "text-green-400 border-green-400/40 bg-green-400/10",
  good: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  fair: "text-orange-400 border-orange-400/40 bg-orange-400/10",
};

function RefurbishedPage() {
  const { data: phones = [], isLoading } = useQuery(refurbishedQuery);
  useRealtimeRefetch("inventory", [refurbishedQuery.queryKey]);
  const settings = useSettings();
  const whatsapp = (settings["whatsapp"] || "917507575755").replace(/\D/g, "");
  const [condition, setCondition] = useState("All");
  const [brand, setBrand] = useState("All");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const brands = useMemo(() => ["All", ...Array.from(new Set(phones.map((p) => p.brand))).sort()], [phones]);
  const priceCeiling = useMemo(() => Math.max(10000, ...phones.map((p) => Math.ceil(p.price / 1000) * 1000)), [phones]);

  const filtered = phones.filter((p) => {
    if (condition !== "All" && p.condition !== condition) return false;
    if (brand !== "All" && p.brand !== brand) return false;
    if (maxPrice && p.price > maxPrice) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-4xl">
          Refurbished &amp; <em>Second-Hand Phones</em>
        </TextReveal>
        <p className="mt-4 text-muted-foreground">
          Every phone is tested, graded and verified before listing. Full transparency — condition, battery health and warranty shown upfront.
        </p>
      </header>

      {/* Trust badges */}
      <div className="mt-8 flex flex-wrap gap-4">
        {[
          { icon: ShieldCheck, text: "Tested & Verified" },
          { icon: Star, text: "Graded A / B / C" },
          { icon: Battery, text: "Battery Health Shown" },
        ].map((b) => (
          <div key={b.text} className="flex items-center gap-2 border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
            <b.icon className="size-4 text-gold" /> {b.text}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-8 card-surface p-5 flex flex-wrap gap-4 items-center">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Condition</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} onClick={() => setCondition(c)}
                className={cn("border px-4 py-1.5 text-xs font-medium transition-colors",
                  condition === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-gold hover:text-gold")}>
                {c === "All" ? "All" : CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Brand</p>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <button key={b} onClick={() => setBrand(b)}
                className={cn("border px-4 py-1.5 text-xs font-medium transition-colors",
                  brand === b ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-gold hover:text-gold")}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-16 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">No phones match your filters.</p>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon — we add new devices regularly.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((phone, i) => (
            <Reveal key={phone.id} delay={i * 60}>
              <RefurbishedCard phone={phone} whatsapp={whatsapp} msg={settings["product_whatsapp_message"] || "Hello, I am interested in"} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function RefurbishedCard({ phone, whatsapp, msg }: { phone: RefurbishedProduct; whatsapp: string; msg: string }) {
  const waText = encodeURIComponent(`${msg} ${phone.brand} ${phone.model} (Refurbished, ${phone.condition_grade ?? phone.condition} condition). Price: ${formatINR(phone.price)}.`);
  return (
    <div className="card-surface hover-glow overflow-hidden">
      <div className="aspect-square bg-secondary/50 flex items-center justify-center">
        {phone.images[0] ? (
          <img src={phone.images[0]} alt={`${phone.brand} ${phone.model}`} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="text-5xl">📱</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="caption-mono">{phone.brand}</p>
            <h2 className="mt-0.5 font-semibold leading-tight">{phone.model}</h2>
          </div>
          {phone.condition_grade && (
            <span className={cn("shrink-0 border px-2.5 py-1 text-xs font-semibold", CONDITION_COLORS[phone.condition] ?? "text-muted-foreground border-border")}>
              Grade {phone.condition_grade}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {phone.storage && <Tag>{phone.storage}</Tag>}
          {phone.ram && <Tag>{phone.ram} RAM</Tag>}
          {phone.battery_health && <Tag>🔋 {phone.battery_health}%</Tag>}
        </div>
        {phone.warranty && <p className="mt-2 text-xs text-muted-foreground">✅ {phone.warranty}</p>}
        <hr className="mt-4 border-border" />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-medium text-primary">{formatINR(phone.price)}</p>
            {phone.original_price && <p className="text-xs text-muted-foreground line-through">{formatINR(phone.original_price)}</p>}
          </div>
          {!phone.is_available && <span className="text-xs text-muted-foreground">Sold Out</span>}
        </div>
        <Button asChild className="mt-4 w-full" size="sm">
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 mr-2" /> Enquire on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-border bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
  );
}
