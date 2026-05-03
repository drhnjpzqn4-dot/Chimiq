import { useEffect, useState } from "react";
import { Loader2, Ticket, AlertTriangle, Plus, Sparkles } from "lucide-react";

interface TesterPromo {
  code: string;
  promotionCodeId: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  promoMaxRedemptions: number | null;
  remaining: number | null;
  couponName: string | null;
}

type Mode = "idle" | "raise" | "mint";

export function TesterPromoAdmin() {
  const [data, setData] = useState<TesterPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [newCap, setNewCap] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCodeCap, setNewCodeCap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tester-promo", {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load promo data.");
        return;
      }
      const body = (await res.json()) as TesterPromo;
      setData(body);
    } catch {
      setError("Network error loading promo data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForms = () => {
    setMode("idle");
    setNewCap("");
    setNewCode("");
    setNewCodeCap("");
    setActionError(null);
  };

  const submitRaiseCap = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(newCap);
    if (!Number.isInteger(value) || value <= 0) {
      setActionError("Enter a whole number greater than zero.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tester-promo/raise-cap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRedemptions: value }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | TesterPromo
        | { error?: string };
      if (!res.ok) {
        setActionError(("error" in body && body.error) || "Failed to raise cap.");
        return;
      }
      setData(body as TesterPromo);
      setFlash(`Cap raised to ${value.toLocaleString()}.`);
      resetForms();
    } catch {
      setActionError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitMint = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(newCodeCap);
    if (!newCode.trim()) {
      setActionError("Enter a code string.");
      return;
    }
    if (!Number.isInteger(value) || value <= 0) {
      setActionError("Enter a whole number greater than zero for the cap.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tester-promo/mint", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          maxRedemptions: value,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | TesterPromo
        | { error?: string };
      if (!res.ok) {
        setActionError(("error" in body && body.error) || "Failed to mint code.");
        return;
      }
      setData(body as TesterPromo);
      setFlash(`Minted ${(body as TesterPromo).code}.`);
      resetForms();
    } catch {
      setActionError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const usageRatio =
    data && data.maxRedemptions != null && data.maxRedemptions > 0
      ? data.timesRedeemed / data.maxRedemptions
      : null;
  const nearCap = usageRatio != null && usageRatio >= 0.8;
  const pct = usageRatio != null ? Math.min(100, Math.round(usageRatio * 100)) : null;

  return (
    <section aria-labelledby="tester-promo-heading">
      <div className="mb-4">
        <h2
          id="tester-promo-heading"
          className="text-2xl font-serif font-semibold text-foreground mb-1"
        >
          Tester promo
        </h2>
        <p className="text-sm text-muted-foreground">
          Track how many testers have redeemed the free-trial promo code, and raise
          the cap or mint a new code without leaving the page.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-border/60 shadow-sm p-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading from Stripe…
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Ticket className="w-4 h-4 text-primary shrink-0" />
                <span className="font-mono text-sm font-semibold text-foreground truncate">
                  {data.code}
                </span>
                {data.couponName && (
                  <span className="text-xs text-muted-foreground truncate">
                    · {data.couponName}
                  </span>
                )}
                {!data.active && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                    Inactive
                  </span>
                )}
              </div>
              {nearCap && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {pct}% used
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat label="Redeemed" value={data.timesRedeemed.toLocaleString()} />
              <Stat
                label="Cap"
                value={
                  data.maxRedemptions != null
                    ? data.maxRedemptions.toLocaleString()
                    : "Unlimited"
                }
              />
              <Stat
                label="Remaining"
                value={
                  data.remaining != null ? data.remaining.toLocaleString() : "—"
                }
                emphasize={nearCap}
              />
            </div>

            {data.maxRedemptions != null && (
              <div>
                <div
                  className="h-2 w-full rounded-full bg-border/40 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct ?? 0}
                  aria-label="Tester promo redemptions"
                >
                  <div
                    className={`h-full transition-all ${
                      nearCap ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {flash && (
              <div className="text-xs px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                {flash}
              </div>
            )}

            <div className="pt-2 border-t border-border/40">
              {mode === "idle" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("raise");
                      setNewCap(
                        data.promoMaxRedemptions != null
                          ? String(data.promoMaxRedemptions + 100)
                          : "",
                      );
                      setActionError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Raise cap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("mint");
                      setNewCode("");
                      setNewCodeCap("100");
                      setActionError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Mint new code
                  </button>
                </div>
              )}

              {mode === "raise" && (
                <form onSubmit={submitRaiseCap} className="space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      New cap
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={newCap}
                      onChange={(e) => setNewCap(e.target.value)}
                      autoFocus
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                      placeholder="e.g. 250"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Stripe doesn't allow editing an existing cap, so this
                    deactivates the current code and re-issues{" "}
                    <span className="font-mono">{data.code}</span> with the new
                    cap. Testers won't notice — the code string stays the same.
                  </p>
                  {actionError && (
                    <p className="text-xs text-red-700">{actionError}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Raise cap
                    </button>
                    <button
                      type="button"
                      onClick={resetForms}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-border/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {mode === "mint" && (
                <form onSubmit={submitMint} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        New code
                      </span>
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        autoFocus
                        maxLength={40}
                        pattern="[A-Za-z0-9_-]+"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-border/60 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        placeholder="e.g. TESTER6M2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Cap
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={newCodeCap}
                        onChange={(e) => setNewCodeCap(e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        placeholder="e.g. 100"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The current code{" "}
                    <span className="font-mono">{data.code}</span> will be
                    deactivated so the new one becomes the active tester promo.
                  </p>
                  {actionError && (
                    <p className="text-xs text-red-700">{actionError}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Mint code
                    </button>
                    <button
                      type="button"
                      onClick={resetForms}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-border/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          emphasize ? "text-amber-700" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
