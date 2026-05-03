import { useEffect, useRef, useState, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  fullWidth?: boolean;
}

const TRANSFORMS: Record<NonNullable<FadeInProps["direction"]>, string> = {
  up: "translate3d(0, 40px, 0)",
  down: "translate3d(0, -40px, 0)",
  left: "translate3d(40px, 0, 0)",
  right: "translate3d(-40px, 0, 0)",
  none: "translate3d(0, 0, 0)",
};

/**
 * CSS-only fade-in-on-scroll. Uses IntersectionObserver instead of
 * framer-motion so it can ship in the marketing landing first-load
 * without pulling the motion vendor chunk.
 */
export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
  fullWidth = false,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
      { rootMargin: "0px 0px -100px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={fullWidth ? `w-full ${className}` : className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : TRANSFORMS[direction],
        transition: `opacity 0.7s cubic-bezier(0.21, 0.47, 0.32, 0.98) ${delay}s, transform 0.7s cubic-bezier(0.21, 0.47, 0.32, 0.98) ${delay}s`,
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
