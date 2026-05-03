import { type ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLoginWithConsent } from "@/components/ConsentGate";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Wraps any `/admin/*` page so non-admin viewers can never see it,
 * regardless of which URL they type. Behavior:
 *   - Auth still loading → spinner.
 *   - Not signed in → kick to the login flow, returning here on success.
 *   - Signed in but not admin → redirect home (no flash of admin chrome).
 *   - Signed in and admin → render children.
 *
 * The server-side admin gate (lib/admin.ts) is still authoritative for
 * every API call; this component is just defense-in-depth for the UI.
 */
export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: adminLoading, isAdmin } = useIsAdmin();
  const { requestLogin } = useLoginWithConsent();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      requestLogin(base + window.location.pathname.replace(base, ""));
    }
  }, [authLoading, isAuthenticated, requestLogin, base]);

  useEffect(() => {
    if (adminLoading) return;
    if (isAuthenticated && !isAdmin) {
      // Hard redirect home — using window.location keeps the URL bar
      // honest and clears any in-memory admin state from devtools.
      window.location.replace(base + "/");
    }
  }, [adminLoading, isAuthenticated, isAdmin, base]);

  if (authLoading || adminLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
