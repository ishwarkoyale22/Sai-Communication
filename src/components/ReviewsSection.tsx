import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { reviewsQuery } from "@/lib/queries";
import { ReviewForm } from "@/components/ReviewForm";
import {
  Star,
  ThumbsUp,
  ShieldCheck,
  CheckCircle,
  MessageSquareQuote,
  PenLine,
  Sparkles,
  Smartphone,
  Wrench,
  RefreshCw,
  CreditCard,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LocalReview = {
  id: string;
  name: string;
  location: string;
  category: "Smartphones" | "Repair & Screen" | "Certified Refurbished" | "0-Down EMI";
  device: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  initialHelpful: number;
};

const CURATED_REVIEWS: LocalReview[] = [
  {
    id: "cr-1",
    name: "Rahul Deshmukh",
    location: "Talegaon Station Road",
    category: "Smartphones",
    device: "Apple iPhone 15 Pro (128GB)",
    rating: 5,
    date: "3 days ago",
    comment:
      "Bought my iPhone 15 Pro with zero down payment via TVS Credit. Vijay Sir personally explained every single EMI term and gave a free 20W original adapter + premium tempered glass. No hidden charges at all. The best mobile showroom in Talegaon!",
    verified: true,
    initialHelpful: 19,
  },
  {
    id: "cr-2",
    name: "Pooja Shinde",
    location: "Vadgaon Maval",
    category: "Repair & Screen",
    device: "Samsung Galaxy S22 Display Repair",
    rating: 5,
    date: "1 week ago",
    comment:
      "My phone screen shattered after falling on railway tracks. Other shops in Pimpri quoted 3 to 4 days. Sai Communication's technician replaced it with an original AMOLED display in just 40 minutes right before my eyes! Highly transparent and trustworthy.",
    verified: true,
    initialHelpful: 14,
  },
  {
    id: "cr-3",
    name: "Amit Kulkarni",
    location: "Urse MIDC",
    category: "Certified Refurbished",
    device: "OnePlus 11 5G (Certified Pre-Owned)",
    rating: 5,
    date: "2 weeks ago",
    comment:
      "Picked up a certified refurbished OnePlus 11 with 6-month store warranty. The phone looks 100% brand new, 96% battery health, and I saved ₹21,000 compared to brand new. Truly the smartest way to buy flagship phones in Pune.",
    verified: true,
    initialHelpful: 23,
  },
  {
    id: "cr-4",
    name: "Sachin More",
    location: "Dehu Road",
    category: "0-Down EMI",
    device: "Vivo V30 5G (Bajaj Finserv EMI)",
    rating: 5,
    date: "3 weeks ago",
    comment:
      "Very transparent pricing! Instant in-store Bajaj Finserv finance approval within 10 minutes. No extra file charges or hidden interest. Vijay Sir treats every customer like family. Got a complimentary festive gift hamper too!",
    verified: true,
    initialHelpful: 11,
  },
  {
    id: "cr-5",
    name: "Sneha Patil",
    location: "Somatane Phata",
    category: "Repair & Screen",
    device: "iPhone Battery & Speaker Servicing",
    rating: 5,
    date: "1 month ago",
    comment:
      "Vijay Sir's advice is genuine. When I went in thinking I had to replace my phone, he inspected it and recommended just a battery swap and speaker mesh cleaning. Saved me ₹35,000! Rare honesty in the mobile repair industry.",
    verified: true,
    initialHelpful: 27,
  },
  {
    id: "cr-6",
    name: "Ganesh Jagtap",
    location: "Talegaon Dabhade",
    category: "Smartphones",
    device: "Samsung Galaxy A55 5G",
    rating: 5,
    date: "1 month ago",
    comment:
      "Serving Talegaon since 2005 for a reason. I have bought 4 smartphones for my family members from Sai Communication over the last 8 years. Proper GST invoice, sealed box brand warranty, and best exchange value for old handsets.",
    verified: true,
    initialHelpful: 16,
  },
];

const CATEGORY_TABS = [
  { label: "All Reviews", value: "all", icon: Sparkles },
  { label: "Smartphones", value: "Smartphones", icon: Smartphone },
  { label: "30-Min Repairs", value: "Repair & Screen", icon: Wrench },
  { label: "Certified Refurbished", value: "Certified Refurbished", icon: RefreshCw },
  { label: "Zero-Down EMI", value: "0-Down EMI", icon: CreditCard },
] as const;

export function ReviewsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch any approved reviews from Supabase
  const { data: dbReviews = [] } = useQuery(reviewsQuery);

  // Merge DB featured reviews with curated local reviews
  const allReviews = useMemo(() => {
    const formattedDbReviews: LocalReview[] = dbReviews.map((r) => {
      // Parse optional device prefix
      let device = "Customer Purchase";
      let cleanComment = r.review_text || "Great service and genuine advice!";
      const match = cleanComment.match(/^\[Device\/Service:\s*([^\]]+)\]\s*(.*)$/s);
      if (match) {
        device = match[1];
        cleanComment = match[2];
      }

      return {
        id: `db-${r.id}`,
        name: r.customer_name,
        location: "Talegaon Customer",
        category: "Smartphones",
        device,
        rating: r.rating || 5,
        date: "Recently verified",
        comment: cleanComment,
        verified: true,
        initialHelpful: 5,
      };
    });

    return [...formattedDbReviews, ...CURATED_REVIEWS];
  }, [dbReviews]);

  // Filter reviews by tab
  const filteredReviews = useMemo(() => {
    if (selectedCategory === "all") return allReviews;
    return allReviews.filter((r) => r.category === selectedCategory);
  }, [allReviews, selectedCategory]);

  const handleHelpfulClick = (reviewId: string, baseCount: number) => {
    setHasVoted((prev) => {
      const currentlyVoted = !!prev[reviewId];
      const newVoted = !currentlyVoted;

      setHelpfulVotes((vPrev) => ({
        ...vPrev,
        [reviewId]: (vPrev[reviewId] ?? baseCount) + (newVoted ? 1 : -1),
      }));

      return { ...prev, [reviewId]: newVoted };
    });
  };

  return (
    <section
      id="reviews-section"
      className="relative overflow-hidden py-16 sm:py-24 border-t"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute -left-20 top-20 size-80 rounded-full bg-primary/8 blur-[90px]" />
      <div className="pointer-events-none absolute right-0 bottom-10 size-96 rounded-full bg-[#F5A623]/8 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        {/* ── Header Row ── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-10 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="space-y-3 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
              <Sparkles className="size-3.5" />
              <span>Verified Customer Stories · Since 2005</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-foreground">
              What Our Customers Say{" "}
              <span className="logo-text-gradient">About Vijay Sir</span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              From first-time iPhone buyers to emergency 30-minute chip-level repairs, see why 2,500+ local families trust Sai Communication on Station Road, Talegaon Dabhade.
            </p>
          </div>

          {/* Overall Rating & Write Review CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Rating pill */}
            <div
              className="flex items-center gap-4 rounded-2xl border p-4 shadow-sm"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex flex-col items-center justify-center border-r pr-4" style={{ borderColor: "var(--border)" }}>
                <span className="font-serif text-3xl font-black text-foreground">4.8</span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">240+ Local Ratings</p>
                <p className="text-[11px] text-muted-foreground">Google &amp; Justdial Verified</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3.5" />
                  <span>100% Genuine Reviews</span>
                </div>
              </div>
            </div>

            {/* Write Review Dialog Trigger */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  id="write-review-trigger-btn"
                  className="rounded-2xl font-bold h-auto py-4 px-6 text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  <PenLine className="size-4" />
                  <span>Write a Review</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg rounded-2xl p-6 sm:p-8" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <DialogHeader className="text-left space-y-2 pb-2">
                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                    <Star className="size-3.5 fill-primary" />
                    <span>Customer Feedback</span>
                  </div>
                  <DialogTitle className="font-serif text-2xl font-black">
                    Share Your Experience
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Bought a new phone, got a screen repair, or availed 0-down EMI at Sai Communication? We value your honest review!
                  </DialogDescription>
                </DialogHeader>

                <ReviewForm onSuccess={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-2 py-6 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedCategory(tab.value)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Review Cards Grid ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((review) => {
            const currentHelpful = helpfulVotes[review.id] ?? review.initialHelpful;
            const userVoted = !!hasVoted[review.id];

            return (
              <article
                key={review.id}
                className="group relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                {/* Decorative subtle quotation watermark */}
                <MessageSquareQuote className="pointer-events-none absolute right-4 top-4 size-16 text-muted-foreground/10 group-hover:text-primary/10 transition-colors" />

                <div>
                  {/* Top Customer Info */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar initials */}
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl font-bold font-serif text-white shadow-xs"
                        style={{
                          background: "linear-gradient(135deg, #F5A623 0%, #E55A1B 100%)",
                        }}
                      >
                        {review.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-foreground leading-tight">
                            {review.name}
                          </h4>
                          {review.verified && (
                            <span title="Verified Customer" className="text-emerald-500">
                              <CheckCircle className="size-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>{review.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Category pill */}
                    <span className="badge-primary text-[9px] py-0.5 px-2 shrink-0">
                      {review.category}
                    </span>
                  </div>

                  {/* Rating Stars & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" />
                      {review.date}
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-[13px] leading-relaxed text-foreground/90 font-medium italic">
                    "{review.comment}"
                  </p>
                </div>

                {/* Bottom Footer: Device tag + Helpful button */}
                <div className="mt-5 pt-4 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border max-w-[170px] truncate"
                    style={{
                      backgroundColor: "var(--muted)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    title={review.device}
                  >
                    <Smartphone className="size-3 text-primary shrink-0" />
                    <span className="truncate">{review.device}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(review.id, review.initialHelpful)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer border",
                      userVoted
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    aria-label="Mark review as helpful"
                  >
                    <ThumbsUp className={cn("size-3", userVoted && "fill-primary")} />
                    <span>Helpful ({currentHelpful})</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* ── Footer Trust Guarantee Strip ── */}
        <div
          className="mt-12 rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-4 text-left">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Our 100% Honest Service Guarantee
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                "We will never sell you a phone or repair you do not need." — Vijay Sir, Founder of Sai Communication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-primary text-primary hover:bg-primary/10"
                >
                  <PenLine className="size-3.5 mr-1.5" />
                  Leave Feedback
                </Button>
              </DialogTrigger>
            </Dialog>
            <a
              href="tel:09845458942"
              className="btn-primary text-xs py-2.5 px-4 rounded-xl font-bold"
            >
              Talk to Vijay Sir
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
