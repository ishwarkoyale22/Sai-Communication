import { Link, useCanGoBack, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Global "Back" navigation control. Hidden on the homepage (nothing to go
 * back to) and on /admin (handled separately). Falls back to a Home link
 * when there is no in-app history to go back to (e.g. a direct/shared link).
 */
export function BackButton() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Track whether we've hydrated on the client yet.
  // On SSR, canGoBack is always false, so we always render the Link <a>.
  // After mount we can safely switch to the <button> if history allows it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (pathname === "/") return null;

  // Before hydration (SSR + first render): always show the Home link so the
  // server HTML matches the client's initial render.
  const showBack = mounted && canGoBack;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      {showBack ? (
        <button
          type="button"
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      ) : (
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
      )}
    </div>
  );
}
