import { useEffect } from "react";

/**
 * Cursor-tracking spotlight for every `.hover-glow` card on the site (see
 * the `hover-glow` utility in styles.css). One delegated listener updates
 * --mx/--my on whichever card is under the pointer — no per-component
 * wiring needed.
 *
 * Skipped entirely on touch devices (no real hover, and touch-scroll fires
 * pointermove too — pointless work that only costs battery/frame budget
 * there) and when the user prefers reduced motion. DOM writes are batched
 * to one per animation frame so it never fights the browser's paint loop.
 */
export function useSpotlight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let raf = 0;
    let pendingTarget: HTMLElement | null = null;
    let pendingX = 0;
    let pendingY = 0;

    function flush() {
      raf = 0;
      if (!pendingTarget) return;
      pendingTarget.style.setProperty("--mx", `${pendingX}%`);
      pendingTarget.style.setProperty("--my", `${pendingY}%`);
    }

    function handlePointerMove(e: PointerEvent) {
      const target = (e.target as HTMLElement)?.closest?.(".hover-glow") as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      pendingTarget = target;
      pendingX = ((e.clientX - rect.left) / rect.width) * 100;
      pendingY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!raf) raf = requestAnimationFrame(flush);
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
