import { useState } from "react";
import { useLocation } from "wouter";

function useNextParam(): string {
  if (typeof window === "undefined") return "/app/scan";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") ?? params.get("returnTo");
  if (next && next.startsWith("/")) return next;
  return "/app/scan";
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const next = useNextParam();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (mode === "signup") {
        setSignupDone(true);
        return;
      }
      window.location.href = next;
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

  if (signupDone) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-border/60 shadow-sm p-8 text-center">
          <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="h-8 mx-auto mb-6" />
          <h2 className="text-xl font-serif font-semibold text-foreground mb-3">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it and then sign in.
          </p>
          <button
            type="button"
            onClick={() => { setMode("signin"); setSignupDone(false); }}
            className="text-sm font-medium text-primary-strong hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border/60 shadow-sm p-8">
        <div className="text-center mb-6">
          <a href={base + "/"}>
            <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="h-8 mx-auto mb-4" />
          </a>
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-strong hover:bg-primary-strong/90 text-white py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isLoading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "No account yet? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-primary-strong font-medium hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
