import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Buttery, weighted scroll on desktop mouse wheels — the kind of subtle
 * inertia/easing premium sites use. Deliberately leaves touch devices on
 * native scrolling (`syncTouch` stays false): phones and tablets already
 * have excellent native momentum scrolling, and layering a JS scroll
 * engine on top of that makes touch scrolling feel laggier and less
 * responsive than the OS's own implementation — this was tried
 * (`syncTouch: true`) and made mobile scrolling noticeably worse, so it
 * was reverted.
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
 * instead, so they actually work — this runs regardless of `syncTouch`,
 * so hash links keep working on mobile even with native touch scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
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
