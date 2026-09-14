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

// app.chimiq.app fanns aldrig i DNS — native-inloggning öppnade en död adress
// (upptäckt 2026-09-14). Allt Chimiq ligger på chimiq.com.
const NATIVE_AUTH_HOST = "https://www.chimiq.com";
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
  /** False när Chimiq-backend inte gick att nå vid senaste profilhämtningen. */
  backendReachable: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

type BackendProfile = Partial<
  Pick<AuthUser, "onboardingCompleted" | "displayName" | "avatarEmoji">
>;

/**
 * `reachable: false` betyder att vi inte fick något svar från Chimiq-backend
 * (nätverksfel, timeout, 5xx eller Railway-404 när tjänsten ligger nere).
 * Det får ALDRIG tolkas som "ny användare" — då kastas en färdig användare
 * in i onboardingen igen och fastnar där (SS-096).
 */
type ProfileResult =
  | { reachable: true; profile: BackendProfile | null }
  | { reachable: false };

const ONBOARDING_CACHE_PREFIX = "chimiq.onboardingCompleted:";
const PROFILE_TIMEOUT_MS = 15000;

function readCachedOnboarding(userId: string): boolean {
  try {
    return (
      window.localStorage.getItem(ONBOARDING_CACHE_PREFIX + userId) === "true"
    );
  } catch {
    return false;
  }
}

function writeCachedOnboarding(userId: string, completed: boolean): void {
  try {
    window.localStorage.setItem(
      ONBOARDING_CACHE_PREFIX + userId,
      completed ? "true" : "false",
    );
  } catch {
    // ignore (private mode / quota)
  }
}

async function fetchBackendUserProfile(
  accessToken: string,
): Promise<ProfileResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);
  try {
    const res = await apiFetch("/api/auth/user", {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    // 401/403 = backend nås, men token duger inte. Då är "ingen profil" ett riktigt svar.
    if (res.status === 401 || res.status === 403) {
      return { reachable: true, profile: null };
    }
    if (!res.ok) {
      console.warn(
        "[Chimiq auth] /api/auth/user svarade",
        res.status,
        res.statusText,
      );
      return { reachable: false };
    }
    const data = (await res.json()) as { user: AuthUser | null };
    return {
      reachable: true,
      profile: data.user
        ? {
            onboardingCompleted: data.user.onboardingCompleted,
            displayName: data.user.displayName ?? null,
            avatarEmoji: data.user.avatarEmoji ?? null,
          }
        : null,
    };
  } catch (err) {
    console.warn("[Chimiq auth] når inte /api/auth/user", err);
    return { reachable: false };
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendReachable, setBackendReachable] = useState(true);

  const applySession = useCallback(async (session: Session | null): Promise<AuthUser | null> => {
    if (!session?.user) {
      setUser(null);
      setIsLoading(false);
      return null;
    }
    const token = session.access_token;
    const result = await fetchBackendUserProfile(token);
    const uid = session.user.id;
    let extra: BackendProfile | null = null;
    let onboardingCompleted: boolean;
    if (result.reachable) {
      extra = result.profile;
      onboardingCompleted = extra?.onboardingCompleted ?? false;
      writeCachedOnboarding(uid, onboardingCompleted);
    } else {
      // Backend onåbar: falla tillbaka på senast kända status i stället för false.
      onboardingCompleted = readCachedOnboarding(uid);
      console.warn(
        "[Chimiq auth] backend onåbar — använder senast kända onboarding-status:",
        onboardingCompleted,
      );
    }
    setBackendReachable(result.reachable);
    const nextUser = {
      ...mapSupabaseUserToAuthUser(session.user, onboardingCompleted),
      displayName: extra?.displayName ?? null,
      avatarEmoji: extra?.avatarEmoji ?? null,
    };
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
    backendReachable,
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
