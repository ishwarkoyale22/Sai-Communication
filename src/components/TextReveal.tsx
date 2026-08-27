import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Premium "curtain lift" headline animation: splits the given text into
 * words, each masked inside an overflow-hidden box, and lifts them into
 * place with a short stagger. Understands a single <em> child (the common
 * "Premium Phones & <em>Expert Repairs</em>" pattern used across the site)
 * and keeps its italic/color styling on the animated words.
 *
 * - `trigger="scroll"` (default): plays once when scrolled into view —
 *   pairs with the site's existing <Reveal> block-level fade-up.
 * - `trigger="mount"`: plays immediately, for above-the-fold headlines
 *   (hero) where an IntersectionObserver would otherwise fire instantly.
 *
 * Degrades to plain static text for prefers-reduced-motion or when
 * IntersectionObserver isn't available — never a requirement to read.
 */
export function TextReveal({
  children,
  as: Tag = "span",
  className,
  trigger = "scroll",
  delayStep = 45,
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  trigger?: "scroll" | "mount";
  delayStep?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setShown(true);
      return;
    }

    if (trigger === "mount") {
      const id = setTimeout(() => setShown(true), Math.max(delay, 10));
      return () => clearTimeout(id);
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setTimeout(() => setShown(true), delay);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, delay]);

  const { words, emClassName } = flattenToWords(children);

  return (
    <Tag ref={ref} className={className}>
      {reduced
        ? children
        : words.map((w, i) => (
            <Fragment key={i}>
              <span className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                <span
                  className="inline-block transition-[transform,opacity] duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                  style={{
                    transitionDelay: `${i * delayStep}ms`,
                    transform: shown ? "translateY(0)" : "translateY(115%)",
                    opacity: shown ? 1 : 0,
                  }}
                >
                  {w.em ? <em className={emClassName}>{w.text}</em> : w.text}
                </span>
              </span>
              {i < words.length - 1 ? " " : ""}
            </Fragment>
          ))}
    </Tag>
  );
}

function flattenToWords(children: ReactNode): {
  words: { text: string; em: boolean }[];
  emClassName?: string;
} {
  const words: { text: string; em: boolean }[] = [];
  let emClassName: string | undefined;
  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      String(child)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((wtext) => words.push({ text: wtext, em: false }));
    } else if (isValidElement(child) && child.type === "em") {
      const props = child.props as { children?: ReactNode; className?: string };
      emClassName = props.className;
      String(props.children ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((wtext) => words.push({ text: wtext, em: true }));
    }
  });
  return { words, emClassName };
}
