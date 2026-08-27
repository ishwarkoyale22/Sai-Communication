import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Buttery, weighted scroll on desktop mouse wheels — the kind of subtle
 * inertia/easing premium sites use. Deliberately leaves touch devices on
 * native scrolling (`syncTouch` stays false): phones and tablets already
 * have excellent native momentum scrolling, and layering a JS scroll
 * engine on top of that usually makes touch scrolling feel *worse* —
 * laggier and less responsive than the OS's own implementation.
 *
 * Also respects prefers-reduced-motion automatically (a Lenis default).
 * Doesn't touch how scroll position is read elsewhere on the site
 * (ScrollProgress, the header's hide-on-scroll, IntersectionObserver-based
 * reveals) — Lenis scrolls the real document, so all of that keeps
 * working unchanged, just riding the smoothed motion.
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

    return () => lenis.destroy();
  }, []);

  return null;
}
