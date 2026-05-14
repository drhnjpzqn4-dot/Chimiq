import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

const UNSEEN_EVENT = "recipes:unseen-changed";

/**
 * Lightweight client-side polling for the unseen-recipe count powering the
 * bottom tab bar dot (#70). Refetches on:
 *  - mount
 *  - every route change (cheap; the endpoint is a single SELECT count(*))
 *  - explicit `recipes:unseen-changed` events dispatched after the
 *    Profile screen marks the feedback as seen so the dot disappears
 *    without waiting for a navigation.
 */
export function useUnseenRecipeCount(): number {
  const [count, setCount] = useState(0);
  const [location] = useLocation();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiFetch("/api/recipes/mine/unseen-count", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { unseenCount: 0 }))
        .then((d) => {
          if (cancelled) return;
          setCount((d as { unseenCount?: number }).unseenCount ?? 0);
        })
        .catch(() => {});
    };
    load();
    const handler = () => load();
    window.addEventListener(UNSEEN_EVENT, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(UNSEEN_EVENT, handler);
    };
  }, [location]);

  return count;
}

export function notifyUnseenRecipesChanged(): void {
  window.dispatchEvent(new Event(UNSEEN_EVENT));
}
