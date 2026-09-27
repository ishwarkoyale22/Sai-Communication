import { useState } from "react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";

// Shared click behaviour for every "Download/Install App" control on the site, so the
// button and the homepage banner can't drift out of sync with each other:
//  - Android Chrome/Edge (and desktop Chrome/Edge): real native install prompt.
//  - iOS Safari/iPadOS: no programmatic install API exists at all — the only path is
//    Safari's own Share -> Add to Home Screen, so that's the one thing we explain.
//  - Anything else (no captured prompt yet, other browsers): the simplest fallback —
//    one line pointing at the browser's own menu, no click-through wizard.
export function useInstallAction() {
  const { installed, canPromptNative, isIOS, promptInstall } = usePwaInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

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
    toast.message("Install this app", {
      description: "Open your browser menu and tap \"Install app\" or \"Add to Home screen\".",
    });
  }

  return { installed, showIOSHelp, setShowIOSHelp, handleClick };
}
