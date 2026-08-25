import { Link, useCanGoBack, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Global "Back" navigation control. Hidden on the homepage (nothing to go
 * back to) and on /admin (handled separately). Falls back to a Home link
 * when there is no in-app history to go back to (e.g. a direct/shared link).
 */
export function BackButton() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/") return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      {canGoBack ? (
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
