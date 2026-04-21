import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

/**
 * Custom event other code can dispatch to force useAuth to re-fetch the
 * current user. Used by the native deep-link handler after a successful
 * sign-in completes in the system browser.
 */
export const AUTH_REFRESH_EVENT = "skinscreen:auth-refresh";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
  refetch: () => void;
}

interface CapacitorBrowserModule {
  Browser: {
    open: (opts: { url: string; presentationStyle?: string }) => Promise<void>;
  };
}

type CapWin = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as CapWin).Capacitor?.isNativePlatform?.();
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  // Listen for forced refresh requests (e.g. from the native deep-link
  // handler after a successful system-browser sign-in).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRefresh = () => setRefetchTick((n) => n + 1);
    window.addEventListener(AUTH_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(AUTH_REFRESH_EVENT, onRefresh);
  }, []);

  const refetch = useCallback(() => {
    setRefetchTick((n) => n + 1);
  }, []);

  const login = useCallback((returnTo?: string) => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "/";
    const target = returnTo ?? base;

    if (isNativePlatform()) {
      const callback = "skinscreen://auth/callback";
      const origin = window.location.origin;
      const loginUrl = `${origin}/api/login?returnTo=${encodeURIComponent(callback)}`;
      // Indirect specifier so TS / Vite don't try to resolve @capacitor/browser
      // at compile time (the package is only installed in mobile/capacitor).
      const browserSpec = "@capacitor/browser";
      (import(/* @vite-ignore */ browserSpec) as Promise<CapacitorBrowserModule>)
        .then((mod) => mod.Browser.open({ url: loginUrl, presentationStyle: "fullscreen" }))
        .catch(() => {
          window.location.href = `/api/login?returnTo=${encodeURIComponent(target)}`;
        });
      return;
    }

    window.location.href = `/api/login?returnTo=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(() => {
    if (isNativePlatform()) {
      const browserSpec = "@capacitor/browser";
      const origin = window.location.origin;
      (import(/* @vite-ignore */ browserSpec) as Promise<CapacitorBrowserModule>)
        .then((mod) =>
          mod.Browser.open({ url: `${origin}/api/logout`, presentationStyle: "fullscreen" }),
        )
        .catch(() => {
          window.location.href = "/api/logout";
        });
      return;
    }
    window.location.href = "/api/logout";
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetch,
  };
}
