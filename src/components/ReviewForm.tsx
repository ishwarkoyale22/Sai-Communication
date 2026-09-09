import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = hovered ? n <= hovered : n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                filled ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,166,35,0.4)]" : "text-muted-foreground/30",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ReviewForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [device, setDevice] = useState("");
  const [rating, setRating] = useState(5);
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
      const fullComment = device.trim()
        ? `[Device/Service: ${device.trim()}] ${comment.trim()}`
        : comment.trim();

      const { error } = await supabase.from("reviews").insert({
        customer_name: name.trim(),
        rating,
        review_text: fullComment || null,
        source: "website",
        // New website reviews go up for admin moderation before appearing
        // in the live "Customer Stories" strip.
        is_featured: false,
      });
      if (error) throw new Error(error.message);

      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setSubmitted(true);
      toast.success("Thank you! Your review has been submitted.");
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex size-14 mx-auto items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle className="size-8" />
        </div>
        <h3 className="text-xl font-bold font-serif">Review Received!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Thank you for sharing your experience. Your feedback helps families in Talegaon make confident choices!
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setSubmitted(false);
            setName("");
            setDevice("");
            setRating(5);
            setComment("");
          }}
          className="rounded-xl font-bold"
        >
          Submit Another Review
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="review-name" className="text-xs font-bold">
          Your Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Deshmukh"
          className="rounded-xl text-xs h-10"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-device" className="text-xs font-bold">
          Device or Service Purchased <span className="text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          id="review-device"
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          placeholder="e.g. iPhone 15, Screen Replacement, OnePlus Refurbished"
          className="rounded-xl text-xs h-10"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold">
            Your Rating <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs font-extrabold text-amber-500">
            {rating} of 5 Stars
          </span>
        </div>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-comment" className="text-xs font-bold">
          Your Feedback &amp; Experience
        </Label>
        <Textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was your experience with Vijay Sir, product quality, repair speed, or EMI process?"
          className="rounded-xl text-xs resize-none"
        />
      </div>

      <Button
        type="submit"
        className="w-full rounded-xl font-bold h-11 shadow-md hover:brightness-105 transition-all text-xs uppercase tracking-wider"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" /> Submitting Review...
          </>
        ) : (
          "Submit Honest Review"
        )}
      </Button>
    </form>
  );
}

