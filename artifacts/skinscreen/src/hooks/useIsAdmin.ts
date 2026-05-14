import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

/**
 * Resolve whether the current viewer is an admin (super-admin allowlist
 * lives server-side in `lib/admin.ts`). Returns:
 *   - `isLoading` until we know the answer (auth still loading or admin
 *     check in flight),
 *   - `isAdmin` true only when the server confirms it.
 *
 * Used to gate admin routes (`/admin/*`) and admin nav links so non-admin
 * users never see them, no matter what URL they type.
 */
export function useIsAdmin(): { isLoading: boolean; isAdmin: boolean } {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    apiFetch("/api/admin/check", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((data: { isAdmin?: boolean }) => {
        if (!cancelled) setIsAdmin(!!data.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  return { isLoading: authLoading || checking, isAdmin };
}
