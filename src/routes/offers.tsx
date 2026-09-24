import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { offersQuery, offerProductsQuery } from "@/lib/queries";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { Button } from "@/components/ui/button";
import { Tag, Clock } from "lucide-react";
import { offerDiscountText, type Offer } from "@/lib/types";

const DEFAULT_CTA_LABEL = "View Offer";
const DEFAULT_CTA_LINK = "/products";

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
  const { data: offerProducts = {} } = useQuery(offerProductsQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-4xl">
          Current <em>Offers &amp; Promotions</em>
        </TextReveal>
        <p className="mt-4 text-muted-foreground">
          Exclusive deals, festival offers and limited-time discounts. Check back regularly for the latest savings.
        </p>
      </header>

      {isLoading ? (
        <p className="mt-16 text-center text-muted-foreground">Loading offers...</p>
      ) : offers.length === 0 ? (
        <div className="mt-16 text-center card-surface p-12">
          <Tag className="mx-auto size-12 text-gold" />
          <h2 className="mt-4 text-xl font-medium font-serif">No Active Offers Right Now</h2>
          <p className="mt-2 text-sm text-muted-foreground">Visit our store or check back soon for the latest deals.</p>
          <Button asChild className="mt-6"><Link to="/products">Browse Products</Link></Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <Reveal key={offer.id} delay={i * 70}>
              <OfferCard offer={offer} products={offerProducts[offer.id] ?? []} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, products }: { offer: Offer; products: string[] }) {
  const discountText = offerDiscountText(offer);
  const isCoupon = offer.offer_type === "coupon" && offer.coupon_code;

  return (
    <div className="card-surface hover-glow overflow-hidden">
      {offer.image_url ? (
        <img src={offer.image_url} alt={offer.title} className="w-full aspect-video object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-accent to-secondary/50 flex items-center justify-center">
          <span className="text-5xl">🎁</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold leading-tight">{offer.title}</h2>
          {isCoupon && (
            <span className="shrink-0 border border-gold bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
              {offer.coupon_code}
            </span>
          )}
        </div>
        {discountText && !isCoupon && (
          <p className="mt-1 text-primary font-semibold text-sm">{discountText}</p>
        )}
        {offer.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{offer.description}</p>
        )}
        {products.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{products.length === 1 ? "Applies to: " : "Applies to these products: "}</span>
            {products.slice(0, 3).join(", ")}
            {products.length > 3 ? ` +${products.length - 3} more` : ""}
          </p>
        )}
        {offer.ends_at && (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Valid until {new Date(offer.ends_at).toLocaleDateString("en-IN")}
          </p>
        )}
        <Button asChild className="mt-4 w-full" size="sm">
          {products.length === 1 ? (
            <Link to="/products" search={{ q: products[0], category: "All" }}>{DEFAULT_CTA_LABEL}</Link>
          ) : (
            <Link to={DEFAULT_CTA_LINK}>{DEFAULT_CTA_LABEL}</Link>
          )}
        </Button>
      </div>
    </div>
  );
}
