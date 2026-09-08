import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle, Loader2, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback/$token")({
  head: () => ({
    meta: [
      { title: "Service Feedback | Sai Communication" },
      { name: "description", content: "Share feedback on your recent repair at Sai Communication." },
    ],
  }),
  component: FeedbackPage,
});

type FeedbackRow = {
  repair_id: string;
  device_brand: string;
  device_model: string;
  customer_name: string;
  status: string;
  rating: number | null;
  comment: string | null;
  wants_reschedule: boolean | null;
  requested_date: string | null;
  submitted_at: string | null;
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
          <Star className={cn("size-8 transition-colors", n <= value ? "fill-gold text-gold" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function FeedbackPage() {
  const { token } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [row, setRow] = useState<FeedbackRow | null>(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wantsReschedule, setWantsReschedule] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_service_feedback_by_token", { p_token: token });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setRow(data[0] as FeedbackRow);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: ok, error } = await supabase.rpc("submit_service_feedback", {
        p_token: token,
        p_rating: rating,
        p_comment: comment || null,
        p_wants_reschedule: wantsReschedule,
        p_requested_date: wantsReschedule && requestedDate ? requestedDate : null,
      });
      if (error) throw new Error(error.message);
      if (!ok) {
        toast.error("This feedback has already been submitted, or the link is no longer valid.");
        return;
      }
      setJustSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted-foreground">
        <Loader2 className="mx-auto size-8 animate-spin" />
        <p className="mt-4">Loading...</p>
      </div>
    );
  }

  if (notFound || !row) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <XCircle className="mx-auto size-12 text-destructive-foreground" />
        <h1 className="mt-4 text-xl font-bold">This feedback link isn't valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have expired or the link was typed incorrectly. Please contact the store if you need help.
        </p>
      </div>
    );
  }

  const alreadySubmitted = Boolean(row.submitted_at) || justSubmitted;
  const displayRating = justSubmitted ? rating : row.rating;
  const displayComment = justSubmitted ? comment : row.comment;
  const displayReschedule = justSubmitted ? wantsReschedule : row.wants_reschedule;
  const displayRequestedDate = justSubmitted ? requestedDate : row.requested_date;
  const displaySubmittedAt = justSubmitted ? new Date().toISOString() : row.submitted_at;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Service Feedback</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {row.device_brand} {row.device_model} · {row.customer_name}
        </p>
      </div>

      {alreadySubmitted ? (
        <div className="mt-8 card-surface rounded-2xl p-6 space-y-4 text-center">
          <CheckCircle className="mx-auto size-12 text-primary" />
          <h2 className="text-lg font-bold">
            Thanks, you already submitted feedback{displaySubmittedAt ? ` on ${new Date(displaySubmittedAt).toLocaleDateString("en-IN")}` : ""}.
          </h2>
          <div className="text-left text-sm space-y-3">
            {displayRating != null && (
              <div className="flex items-center gap-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("size-5", i < displayRating ? "fill-gold text-gold" : "text-muted-foreground")} />
                ))}
              </div>
            )}
            {displayComment && (
              <p className="text-muted-foreground text-center italic">"{displayComment}"</p>
            )}
            {displayReschedule && (
              <p className="text-center text-muted-foreground">
                You asked to be contacted for another service
                {displayRequestedDate ? ` on ${new Date(displayRequestedDate).toLocaleDateString("en-IN")}` : ""}.
              </p>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 card-surface rounded-2xl p-6 space-y-5">
          <div className="space-y-2 text-center">
            <Label>How was your repair experience?</Label>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-comment">Comments (optional)</Label>
            <Textarea
              id="feedback-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="feedback-reschedule"
              checked={wantsReschedule}
              onCheckedChange={(v) => setWantsReschedule(Boolean(v))}
            />
            <Label htmlFor="feedback-reschedule" className="font-normal cursor-pointer">
              I'm having the same or another problem
            </Label>
          </div>

          {wantsReschedule && (
            <div className="space-y-2">
              <Label htmlFor="feedback-date">Preferred date for next service</Label>
              <Input
                id="feedback-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
