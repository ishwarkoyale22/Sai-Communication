import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { activePopupQuery } from "@/lib/queries";
import { offerDiscountText } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const POPUP_KEY = "sc_popup_last_shown";

// No per-offer control over popup timing exists on the `offers` row, so
// these are hardcoded — matching the site's own dead admin's PopupTab
// defaults.
const SHOW_AFTER_SECONDS = 3;
const SESSION_FREQUENCY_HOURS = 24;
const DEFAULT_CTA_LABEL = "View Offer";
const DEFAULT_CTA_LINK = "/offers";

export function PromoPopup() {
  const { data: popup } = useQuery(activePopupQuery);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!popup) return;
    const freqMs = SESSION_FREQUENCY_HOURS * 60 * 60 * 1000;
    const lastShown = localStorage.getItem(POPUP_KEY);
    const now = Date.now();
    if (lastShown && now - Number(lastShown) < freqMs) return;

    const timer = setTimeout(() => {
      setVisible(true);
      localStorage.setItem(POPUP_KEY, String(now));
    }, SHOW_AFTER_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [popup]);

  if (!popup || !visible) return null;

  const discountText = offerDiscountText(popup);
  const isCoupon = popup.offer_type === "coupon" && popup.coupon_code;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm", "animate-fade-in")}
      onClick={() => setVisible(false)}
    >
      <div
        className="relative w-full max-w-md card-surface rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {popup.image_url && (
          <img src={popup.image_url} alt={popup.title ?? "Offer"} className="w-full aspect-video object-cover" loading="lazy" />
        )}

        <div className="p-6 text-center">
          {discountText && !isCoupon && (
            <p className="text-2xl font-bold text-primary">{discountText}</p>
          )}
          {isCoupon && (
            <p className="inline-block border border-dashed border-gold bg-gold/10 px-4 py-1.5 text-lg font-bold tracking-wider text-gold">
              {popup.coupon_code}
            </p>
          )}
          {popup.title && (
            <h2 className="mt-1 text-xl font-bold">{popup.title}</h2>
          )}
          {popup.description && (
            <p className="mt-2 text-sm text-muted-foreground">{popup.description}</p>
          )}
          <Button asChild className="mt-4 w-full" size="lg">
            <Link to={DEFAULT_CTA_LINK} onClick={() => setVisible(false)}>
              {DEFAULT_CTA_LABEL}
            </Link>
          </Button>
          <button
            onClick={() => setVisible(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
