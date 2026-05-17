import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { AuthUser } from "@workspace/api-client-react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

export type { AuthUser };

export const AUTH_REFRESH_EVENT = "skinscreen:auth-refresh";

const NATIVE_AUTH_HOST = "https://app.chimiq.app";
const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function mapSupabaseUserToAuthUser(
  u: User,
  onboardingCompleted: boolean,
): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    firstName: (u.user_metadata?.first_name as string | undefined) ?? null,
    lastName: (u.user_metadata?.last_name as string | undefined) ?? null,
    profileImageUrl: (u.user_metadata?.avatar_url as string | undefined) ?? null,
    emailVerified: Boolean(u.email_confirmed_at),
    onboardingCompleted,
  };
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
  /** Hämtar om session + backend-profil (t.ex. efter onboarding). Returnerar aktuell AuthUser efter uppdatering. */
  refetch: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchBackendUserProfile(
  accessToken: string,
): Promise<Partial<Pick<AuthUser, "onboardingCompleted">> | null> {
  try {
    const res = await apiFetch("/api/auth/user", {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user
      ? { onboardingCompleted: data.user.onboardingCompleted }
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (session: Session | null): Promise<AuthUser | null> => {
    if (!session?.user) {
      setUser(null);
      setIsLoading(false);
      return null;
    }
    const token = session.access_token;
    const extra = await fetchBackendUserProfile(token);
    const onboardingCompleted = extra?.onboardingCompleted ?? false;
    const nextUser = mapSupabaseUserToAuthUser(session.user, onboardingCompleted);
    setUser(nextUser);
    setIsLoading(false);
    return nextUser;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session);
      },
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refetch = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return applySession(session);
  }, [applySession]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRefresh = () => {
      void refetch();
    };
    window.addEventListener(AUTH_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(AUTH_REFRESH_EVENT, onRefresh);
  }, [refetch]);

  const login = useCallback((returnTo?: string) => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "/";
    const target = returnTo ?? base;

    if (isNative()) {
      const url = `${NATIVE_AUTH_HOST}/login?next=${encodeURIComponent(NATIVE_AUTH_CALLBACK)}`;
      void Browser.open({ url, presentationStyle: "fullscreen" });
      return;
    }

    window.location.href = `/login?next=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    if (isNative()) {
      void Browser.open({
        url: `${NATIVE_AUTH_HOST}/`,
        presentationStyle: "fullscreen",
      });
      return;
    }
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";
    window.location.href = `${base}/goodbye`;
  }, []);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetch,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth måste användas inom <AuthProvider>");
  }
  return ctx;
}
