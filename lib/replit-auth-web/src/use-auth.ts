import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  const login = useCallback((returnTo?: string) => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "/";
    const target = returnTo ?? base;

    // Native (Capacitor) auth flow: open the system browser and ask the
    // server to redirect back into the app via the registered URL scheme.
    // The web app stays untouched (`window.Capacitor` is undefined on web).
    type CapWin = Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    const w = (typeof window !== "undefined" ? window : undefined) as CapWin | undefined;
    const isNative = !!w?.Capacitor?.isNativePlatform?.();

    if (isNative) {
      const callback = "skinscreen://auth/callback";
      // Get the absolute URL of the running web app so the server can
      // redirect back through the system browser before the OS deep-links.
      const origin = w?.location?.origin ?? "";
      const loginUrl = `${origin}/api/login?returnTo=${encodeURIComponent(callback)}`;
      const browserSpec = "@capacitor/browser";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import(/* @vite-ignore */ browserSpec) as Promise<any>)
        .then((mod) => mod.Browser.open({ url: loginUrl, presentationStyle: "fullscreen" }))
        .catch(() => {
          // Plugin missing? Fall back to a direct top-level navigation.
          if (w) w.location.href = `/api/login?returnTo=${encodeURIComponent(target)}`;
        });
      return;
    }

    window.location.href = `/api/login?returnTo=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(() => {
    type CapWin = Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    const w = (typeof window !== "undefined" ? window : undefined) as CapWin | undefined;
    const isNative = !!w?.Capacitor?.isNativePlatform?.();

    if (isNative) {
      const browserSpec = "@capacitor/browser";
      const origin = w?.location?.origin ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import(/* @vite-ignore */ browserSpec) as Promise<any>)
        .then((mod) => mod.Browser.open({ url: `${origin}/api/logout`, presentationStyle: "fullscreen" }))
        .catch(() => {
          if (w) w.location.href = "/api/logout";
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
  };
}
