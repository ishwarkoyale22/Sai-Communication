import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dpdp_tracker_consent_v1";

export type TrackerConsent = "accepted" | "rejected";

// Reads the visitor's non-essential-tracker choice. Returns null until they decide.
// As of 2026-10-11 this site loads no non-essential trackers (no analytics/ads SDK found
// in the audit — see DPDP_PROGRESS.md item 4), so nothing is gated behind this yet. This
// banner exists so that the day someone adds Google Analytics/Meta Pixel/etc., there is
// already a consent gate to wire it behind instead of shipping it ungated.
export function getTrackerConsent(): TrackerConsent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function ConsentBanner() {
  // Starts null on both server and client (SSR has no localStorage), then syncs to the
  // real stored choice after mount so hydration never mismatches.
  const [choice, setChoice] = useState<TrackerConsent | null>(null);
  useEffect(() => {
    setChoice(getTrackerConsent());
  }, []);

  function choose(v: TrackerConsent) {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore storage failures (private browsing, quota) — banner just reappears next visit
    }
    setChoice(v);
  }

  if (choice !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-xl">
          We use essential cookies to run this site (cart, login session). We do not currently load
          analytics or advertising trackers; if that changes, your choice here decides whether they run.
          Read our{" "}
          <Link to="/privacy-policy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose("rejected")}>
            Reject non-essential
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
