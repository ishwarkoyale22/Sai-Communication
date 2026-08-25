import { useEffect, useRef, useState } from "react";

/**
 * Animates the leading number in `value` (e.g. "25k+", "4.7 / 5", "21+")
 * from 0 up to its real value once scrolled into view, then leaves the
 * exact original string in place. Anything that isn't a leading number
 * (a suffix like " / 5" or "+") is preserved untouched.
 *
 * Falls back to the plain, final value immediately if the string doesn't
 * start with a number or the user prefers reduced motion — this is always
 * a progressive enhancement, never a requirement to read the number.
 */
export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(() => initialValue(value));

  useEffect(() => {
    const match = value.match(/^(\d+(?:\.\d+)?)/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const target = parseFloat(match[1]);
    const decimals = match[1].includes(".") ? match[1].split(".")[1].length : 0;
    const suffix = value.slice(match[1].length);

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            if (progress < 1) {
              setDisplay((target * eased).toFixed(decimals) + suffix);
              requestAnimationFrame(tick);
            } else {
              setDisplay(value);
            }
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}

function initialValue(value: string): string {
  const match = value.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return value;
  const decimals = match[1].includes(".") ? match[1].split(".")[1].length : 0;
  return (0).toFixed(decimals) + value.slice(match[1].length);
}
