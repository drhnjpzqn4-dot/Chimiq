import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { AuthUser } from "@workspace/api-client-react";
import { clearChimiqStoredSessionId } from "./chimiq-session";

export type { AuthUser };

export const AUTH_REFRESH_EVENT = "skinscreen:auth-refresh";

/**
 * Production backend the native shell talks to. The Capacitor WebView origin
 * is `capacitor://localhost` (iOS) or `https://localhost` (Android), so the
 * deployed host has to be hard-coded for native auth/login URLs.
 */
const NATIVE_AUTH_HOST = "https://app.chimiq.app";
const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
  refetch: () => void;
}

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
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

    if (isNative()) {
      const url = `${NATIVE_AUTH_HOST}/api/login?returnTo=${encodeURIComponent(NATIVE_AUTH_CALLBACK)}`;
      Browser.open({ url, presentationStyle: "fullscreen" });
      return;
    }

    window.location.href = `/login?next=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(() => {
    if (isNative()) {
      Browser.open({ url: `${NATIVE_AUTH_HOST}/api/logout`, presentationStyle: "fullscreen" });
      return;
    }
    void (async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // ignore — vi rensar lokalt ändå
      }
      clearChimiqStoredSessionId();
      window.location.href = "/";
    })();
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
