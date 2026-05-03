import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyOnVisibleProps {
  children: ReactNode;
  /** Min height for the placeholder so layout doesn't jump. */
  minHeight?: number | string;
  /** Distance from viewport (in px) to start mounting children. */
  rootMargin?: string;
  /** Render children immediately (e.g. SSR or no-IO fallback). */
  eager?: boolean;
}

/**
 * Mounts `children` only once they're about to scroll into view.
 * Used to defer below-the-fold marketing sections so their lazy
 * chunks aren't fetched during the initial landing render.
 */
export function LazyOnVisible({
  children,
  minHeight = 320,
  rootMargin = "400px 0px",
  eager = false,
}: LazyOnVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;

  return <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}
