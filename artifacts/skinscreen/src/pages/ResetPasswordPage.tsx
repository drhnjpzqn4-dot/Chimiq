import { useState } from "react";

function getQueryParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const accessToken = getQueryParam("access_token");

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: accessToken, password }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Failed to reset password.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-border/60 shadow-sm p-8 text-center">
          <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="h-8 mx-auto mb-6" />
          <p className="text-sm text-muted-foreground mb-4">
            Invalid or expired reset link. Please request a new one.
          </p>
          <a href="/login" className="text-sm font-medium text-primary-strong hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-border/60 shadow-sm p-8 text-center">
          <img src={`${base}/images/logo-chimiq-long.png`} alt="Chimiq" className="h-8 mx-auto mb-6" />
          <h2 className="text-xl font-serif font-semibold text-foreground mb-3">Password updated!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
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
          <h1 className="text-2xl font-serif font-semibold text-foreground">Set new password</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-strong hover:bg-primary-strong/90 text-white py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isLoading ? "…" : "Update password"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-primary-strong font-medium hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
