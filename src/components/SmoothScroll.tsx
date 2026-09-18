import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Buttery, weighted scroll on every device — mouse wheel on desktop and
 * touch drags on phones/tablets both ride the same eased inertia, so the
 * feel is consistent everywhere instead of desktop-only.
 *
 * Touch uses a lighter touch-specific duration/multiplier than desktop:
 * a 1:1 `syncTouch` at desktop settings feels laggy under a finger (touch
 * expects to track the drag almost instantly), so touch gets a shorter
 * duration and near-1 multiplier — just enough easing to smooth out the
 * native scroll-stop jitter without fighting the finger.
 *
 * Also respects prefers-reduced-motion automatically (a Lenis default).
 * Doesn't touch how scroll position is read elsewhere on the site
 * (ScrollProgress, the header's hide-on-scroll, IntersectionObserver-based
 * reveals) — Lenis scrolls the real document, so all of that keeps
 * working unchanged, just riding the smoothed motion.
 *
 * Hash links (e.g. `<a href="#repair-form">`): Lenis owns the scroll
 * animation loop, so a plain browser anchor jump gets overwritten on the
 * very next animation frame and silently does nothing. We intercept
 * same-page hash link clicks here and drive the scroll through Lenis
 * instead, so they actually work.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.075,
      touchMultiplier: 1,
      autoRaf: true,
    });

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return null;
}
