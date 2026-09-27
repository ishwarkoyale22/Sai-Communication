import { useEffect, useState, useCallback } from "react";

// Chrome/Edge fire this event (and only this one) when the current page meets their
// installability bar (manifest + service worker + HTTPS, roughly). Capturing it is the
// only way to trigger the *real* native install prompt from a button click later —
// if we don't listen for it and stash it, it's gone.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag for "opened from home screen"
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh" but exposes touch points; real Macs don't.
  const iPadOS13Plus = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS13Plus;
}

export type PwaInstallState = {
  /** True once we know the app is already installed/running standalone — callers should hide the button. */
  installed: boolean;
  /** True when Chrome/Edge has handed us a real native prompt we can trigger on click. */
  canPromptNative: boolean;
  /** iOS never fires beforeinstallprompt — there is no automatic prompt, only the manual Share sheet. */
  isIOS: boolean;
  /** Opens the real native install prompt. Only call when canPromptNative is true. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault(); // stop Chrome's own mini-infobar; we show our own button instead
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    // Covers the case where the user installs via the browser's own menu
    // (not our button) while this tab stays open.
    const mql = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mql.addEventListener?.("change", onDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null); // a captured prompt can only ever be used once
    return outcome;
  }, [deferredPrompt]);

  return {
    installed,
    canPromptNative: !!deferredPrompt,
    isIOS: isIOS(),
    promptInstall,
  };
}
