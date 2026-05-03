import { useEffect, useState } from "react";
import { Loader2, Ticket, AlertTriangle } from "lucide-react";

interface TesterPromo {
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  remaining: number | null;
  couponName: string | null;
}

export function TesterPromoAdmin() {
  const [data, setData] = useState<TesterPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/tester-promo", {
          credentials: "include",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setError(body.error ?? "Failed to load promo data.");
          return;
        }
        const body = (await res.json()) as TesterPromo;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setError("Network error loading promo data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          Track how many testers have redeemed the free-trial promo code.
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
          <div className="space-y-3">
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
              <div className="pt-1">
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
