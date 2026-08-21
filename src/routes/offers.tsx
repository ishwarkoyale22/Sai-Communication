import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { offersQuery } from "@/lib/queries";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Tag, Clock } from "lucide-react";
import type { Offer } from "@/lib/types";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Deals | Sai Communication Mobile Shop" },
      { name: "description", content: "Latest mobile phone deals, discounts, festival offers and EMI offers at Sai Communication, Talegaon Dabhade, Pune." },
      { property: "og:title", content: "Offers & Deals | Sai Communication" },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { data: offers = [], isLoading } = useQuery(offersQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <span className="eyebrow">Latest Deals</span>
        <h1 className="mt-6 font-serif text-3xl font-bold sm:text-4xl">
          Current <em>Offers &amp; Promotions</em>
        </h1>
        <p className="mt-4 text-muted-foreground">
          Exclusive deals, festival offers and limited-time discounts. Check back regularly for the latest savings.
        </p>
      </header>

      {isLoading ? (
        <p className="mt-16 text-center text-muted-foreground">Loading offers...</p>
      ) : offers.length === 0 ? (
        <div className="mt-16 text-center card-surface rounded-2xl p-12">
          <Tag className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold">No Active Offers Right Now</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visit our store or check back soon for the latest deals.</p>
          <Button asChild className="mt-6"><Link to="/products">Browse Products</Link></Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <Reveal key={offer.id} delay={i * 70}>
              <OfferCard offer={offer} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <div className="card-surface hover-glow rounded-2xl overflow-hidden">
      {offer.banner_image_url ? (
        <img src={offer.banner_image_url} alt={offer.title} className="w-full aspect-video object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-accent to-secondary/50 flex items-center justify-center">
          <span className="text-5xl">🎁</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold leading-tight">{offer.title}</h2>
          {offer.badge_text && (
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
              {offer.badge_text}
            </span>
          )}
        </div>
        {offer.discount_text && (
          <p className="mt-1 text-primary font-semibold text-sm">{offer.discount_text}</p>
        )}
        {offer.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{offer.description}</p>
        )}
        {offer.valid_until && (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Valid until {new Date(offer.valid_until).toLocaleDateString("en-IN")}
          </p>
        )}
        <Button asChild className="mt-4 w-full" size="sm">
          <Link to={offer.cta_link as "/products"}>{offer.cta_label}</Link>
        </Button>
      </div>
    </div>
  );
}
