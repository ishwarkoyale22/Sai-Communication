import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star className={cn("size-7 transition-colors", n <= value ? "fill-gold text-gold" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        customer_name: name.trim(),
        rating,
        review_text: comment.trim() || null,
        source: "website",
        // New website reviews go up for admin moderation before appearing
        // in the live "Customer Stories" strip.
        is_featured: false,
      });
      if (error) throw new Error(error.message);
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle className="mx-auto size-12 text-primary" />
        <h3 className="text-xl font-bold">Thank You!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your review has been submitted and will appear on our website after a quick review.
        </p>
        <Button
          variant="outline"
          onClick={() => { setSubmitted(false); setName(""); setRating(0); setComment(""); }}
        >
          Submit Another Review
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="review-name">Your Name <span className="text-destructive-foreground">*</span></Label>
        <Input id="review-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
      </div>

      <div className="space-y-2">
        <Label>Your Rating <span className="text-destructive-foreground">*</span></Label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Your Feedback (optional)</Label>
        <Textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience with our products or service..."
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" /> Submitting...
          </>
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  );
}
