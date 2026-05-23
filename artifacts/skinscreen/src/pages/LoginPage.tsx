import { useState, type ReactNode } from "react";
import WelcomeSlides, { WELCOME_BG_WHITE } from "@/components/WelcomeSlides";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

function useNextParam(): string {
  if (typeof window === "undefined") return "/app/scan";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") ?? params.get("returnTo");
  if (next && next.startsWith("/")) return next;
  return "/app/scan";
}

function LoginPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <img
        src={WELCOME_BG_WHITE}
        alt=""
        aria-hidden
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[rgba(255,255,255,0.75)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const next = useNextParam();
  const [showWelcome, setShowWelcome] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("chimiq.welcome_seen") !== "true",
  );
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [signupDone, setSignupDone] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (mode === "forgot") {
      try {
        await apiFetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      } catch {
        setError("Network error — please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      if (mode === "signin") {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
        window.location.href = next;
        return;
      }

      if (mode === "signup" && !firstName.trim()) {
        setError("Please enter your name.");
        return;
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName.trim() } },
      });
      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }
      if (data.session) {
        window.location.href = next;
        return;
      }
      setSignupDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: "signin" | "signup" | "forgot") => {
    setMode(newMode);
    setError(null);
    setForgotSent(false);
    if (newMode !== "signup") setFirstName("");
  };

  const welcomeOverlay = showWelcome ? (
    <WelcomeSlides onDone={() => setShowWelcome(false)} />
  ) : null;

  if (signupDone) {
    return (
      <>
        {welcomeOverlay}
        <LoginPageShell>
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-white p-8 text-center shadow-sm">
            <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="mx-auto mb-6 h-8" />
            <h2 className="mb-3 font-serif text-xl font-medium text-foreground">Check your email</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              We sent a confirmation link to <strong>{email}</strong>. Click it and then sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setSignupDone(false);
              }}
              className="text-sm font-medium text-primary-strong hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </LoginPageShell>
      </>
    );
  }

  if (mode === "forgot" && forgotSent) {
    return (
      <>
        {welcomeOverlay}
        <LoginPageShell>
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-white p-8 text-center shadow-sm">
            <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="mx-auto mb-6 h-8" />
            <h2 className="mb-3 font-serif text-xl font-medium text-foreground">Check your email</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              If <strong>{email}</strong> is registered, you will receive a reset link shortly.
            </p>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="text-sm font-medium text-primary-strong hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </LoginPageShell>
      </>
    );
  }

  const title = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";
  const submitLabel = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link";

  return (
    <>
      {welcomeOverlay}
      <LoginPageShell>
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <a href={base + "/"}>
              <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="mx-auto mb-4 h-8" />
            </a>
            <h1 className="font-serif text-2xl font-medium text-foreground">{title}</h1>
            {mode === "forgot" && (
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="firstName">
                  {t("signup.firstNameLabel")}
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t("signup.firstNamePlaceholder")}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="you@example.com"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-primary-strong hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-primary-strong py-3 text-sm font-semibold text-white transition-all hover:bg-primary-strong/90 disabled:opacity-50"
            >
              {isLoading ? "…" : submitLabel}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-primary-strong hover:underline"
                >
                  Create one
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-medium text-primary-strong hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <>
                Remembered it?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-medium text-primary-strong hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </LoginPageShell>
    </>
  );
}
