import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Loader2,
  LogOut,
  ShieldCheck,
  Users,
  ScanLine,
  ShoppingBag,
  CreditCard,
  Crown,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { FunnelTrendChart } from "@/components/admin/FunnelTrendChart";

type Period = "7d" | "30d" | "90d" | "all";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  conversionFromPrev: number;
  conversionFromTop: number;
}

interface FunnelResponse {
  period: string;
  since: string | null;
  funnel: FunnelStep[];
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const STEP_ICONS: Record<string, typeof Users> = {
  signups: Users,
  scans: ScanLine,
  shelfSaves: ShoppingBag,
  checkouts: CreditCard,
  subscriptions: Crown,
};

const STEP_COLORS: Record<string, string> = {
  signups: "#6366f1",
  scans: "#8b5cf6",
  shelfSaves: "#a855f7",
  checkouts: "#d946ef",
  subscriptions: "#22c55e",
};

function AdminFunnelPageInner() {
  const { user, logout } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funnel?period=${period}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to load funnel data.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as FunnelResponse;
      setData(json);
    } catch {
      setError("Network error loading funnel data.");
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  const maxCount = data
    ? Math.max(1, ...data.funnel.map((s) => s.count))
    : 1;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={base + "/"}>
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="Chimiq"
              className="h-8 w-auto"
            />
          </a>
          <div className="flex items-center gap-3">
            <a
              href={base + "/admin/submissions"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Products →
            </a>
            <a
              href={base + "/admin/users"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Users →
            </a>
            <a
              href={base + "/admin/recipes"}
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Recipes →
            </a>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary px-3 py-1.5 rounded-full bg-primary/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-border/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-1">
              Conversion funnel
            </h1>
            <p className="text-muted-foreground text-base">
              How users progress from sign-up through to subscription.
              {user?.email ? ` Signed in as ${user.email}.` : ""}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Counts are unique users who performed each action in the selected period (activity-based, not cohort-based).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  period === opt.value
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
              {data.funnel.map((step) => {
                const Icon = STEP_ICONS[step.key] ?? Users;
                const color = STEP_COLORS[step.key] ?? "#6366f1";
                return (
                  <div
                    key={step.key}
                    className="bg-white rounded-2xl border border-border/60 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}14` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold leading-tight">
                        {step.label}
                      </p>
                    </div>
                    <p className="text-2xl font-serif font-semibold text-foreground tabular-nums">
                      {step.count.toLocaleString()}
                    </p>
                    {step.key !== "signups" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.conversionFromTop}% of sign-ups
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <FunnelTrendChart period={period} />

            <div className="bg-white rounded-2xl border border-border/60 p-6 mb-8">
              <h2 className="text-lg font-serif font-semibold text-foreground mb-6">
                Funnel visualization
              </h2>
              <div className="space-y-3">
                {data.funnel.map((step, i) => {
                  const color = STEP_COLORS[step.key] ?? "#6366f1";
                  const Icon = STEP_ICONS[step.key] ?? Users;
                  const barWidth = Math.max(
                    3,
                    (step.count / maxCount) * 100,
                  );
                  return (
                    <div key={step.key}>
                      <div className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 shrink-0 flex items-center gap-2">
                          <Icon
                            className="w-4 h-4 shrink-0"
                            style={{ color }}
                          />
                          <span className="text-sm font-medium text-foreground truncate">
                            {step.label}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-8 rounded-lg bg-muted/30 overflow-hidden relative">
                            <div
                              className="h-full rounded-lg transition-all duration-700 ease-out flex items-center"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: color,
                              }}
                            >
                              <span className="text-xs font-semibold text-white pl-3 whitespace-nowrap">
                                {step.count.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-16 sm:w-20 shrink-0 text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {step.key === "signups"
                              ? "100%"
                              : `${step.conversionFromTop}%`}
                          </span>
                        </div>
                      </div>
                      {i < data.funnel.length - 1 && (
                        <div className="flex items-center gap-3 my-1">
                          <div className="w-28 sm:w-36 shrink-0" />
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <TrendingDown className="w-3 h-3" />
                            <span>
                              {data.funnel[i + 1].conversionFromPrev}%
                              convert
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40">
                <h2 className="text-lg font-serif font-semibold text-foreground">
                  Step-by-step breakdown
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border/40">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3 font-semibold">Step</th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Count
                      </th>
                      <th className="px-6 py-3 font-semibold text-right">
                        From previous
                      </th>
                      <th className="px-6 py-3 font-semibold text-right">
                        From sign-ups
                      </th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Drop-off
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.funnel.map((step, i) => {
                      const prev =
                        i === 0 ? step.count : data.funnel[i - 1].count;
                      const dropOff = prev - step.count;
                      const color = STEP_COLORS[step.key] ?? "#6366f1";
                      return (
                        <tr
                          key={step.key}
                          className="border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-medium text-foreground">
                                {step.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold tabular-nums text-foreground">
                            {step.count.toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                            {i === 0 ? "—" : `${step.conversionFromPrev}%`}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                            {i === 0 ? "—" : `${step.conversionFromTop}%`}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums">
                            {i === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : dropOff > 0 ? (
                              <span className="text-red-600">
                                −{dropOff.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-emerald-600">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function AdminFunnelPage() {
  return (
    <AdminRouteGuard>
      <AdminFunnelPageInner />
    </AdminRouteGuard>
  );
}
