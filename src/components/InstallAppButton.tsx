import { useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// One button, three behaviours, picked automatically — the user never has to know which:
//  - Android Chrome/Edge (and desktop Chrome/Edge): real native install prompt.
//  - iOS Safari: there is no programmatic install API at all — Apple only allows the
//    manual Share -> Add to Home Screen flow, so that's the one thing we explain.
//  - Anything else that hasn't handed us a native prompt (older/other browsers, or the
//    prompt not fired yet): the simplest fallback we have — a one-line pointer at the
//    browser's own menu, no click-through wizard.
// The button hides itself entirely once the app is already installed.
export function InstallAppButton({ className }: { className?: string }) {
  const { installed, canPromptNative, isIOS, promptInstall } = usePwaInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (installed) return null;

  async function handleClick() {
    if (canPromptNative) {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast.success("Installing Sai Communication…");
      return;
    }
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    // Simplest possible fallback — no menu-hunting walkthrough, just the one thing to look for.
    toast.message("Install this app", {
      description: "Open your browser menu and tap \"Install app\" or \"Add to Home screen\".",
    });
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className ?? "btn-primary-pulse"}>
        <Download className="size-4" />
        Download App
      </button>

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Add to Home Screen</DialogTitle>
            <DialogDescription>iOS only allows installing apps this way.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3 text-sm">
            <p className="flex items-center justify-center gap-2">
              1. Tap <Share className="size-4 text-primary" /> <strong>Share</strong> in Safari's toolbar
            </p>
            <p className="flex items-center justify-center gap-2">
              2. Tap <SquarePlus className="size-4 text-primary" /> <strong>Add to Home Screen</strong>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
