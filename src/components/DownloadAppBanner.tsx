import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallAction } from "@/hooks/useInstallAction";
import { AddToHomeScreenDialog } from "@/components/AddToHomeScreenDialog";

const DISMISS_KEY = "sai-comm-app-banner-dismissed";

// The homepage's main app-install pitch — a full-width strip in the same amber brand
// gradient as the hero, so it reads as part of the site rather than a generic browser
// nag. Sits above the hero (the very first thing on the page) so it's seen before
// anything else, and hides itself once installed or once the visitor dismisses it.
export function DownloadAppBanner() {
  const { installed, showIOSHelp, setShowIOSHelp, handleClick } = useInstallAction();
  const [dismissed, setDismissed] = useState(true); // start hidden; only show after we know localStorage

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (installed || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage can throw in private/locked-down browsing — dismissal just won't
      // persist across visits then, which is a harmless fallback, not a crash.
    }
  }

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3 text-white sm:justify-center sm:gap-4 sm:py-3.5"
      style={{ background: "var(--gradient-hero)" }}
    >
      <img
        src="/icons/icon-192.png"
        alt=""
        className="size-10 shrink-0 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:size-11"
      />
      <div className="min-w-0 flex-1 sm:flex-initial">
        <p className="text-[13px] font-bold leading-tight sm:text-sm">Get the Sai Communication App</p>
        <p className="hidden text-[11px] text-white/75 min-[380px]:block sm:text-xs">Faster shopping &amp; live order tracking</p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-extrabold text-[#B85C2B] shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.04] active:scale-[0.97] sm:px-5 sm:text-sm"
      >
        <span className="flex items-center gap-1.5">
          <Download className="size-3.5 sm:size-4" />
          <span className="hidden min-[380px]:inline">Download App</span>
          <span className="min-[380px]:hidden">Install</span>
        </span>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="size-4" />
      </button>

      <AddToHomeScreenDialog open={showIOSHelp} onOpenChange={setShowIOSHelp} />
    </div>
  );
}
