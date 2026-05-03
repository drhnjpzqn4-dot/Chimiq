import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Loader2,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  History,
  ArrowLeft,
  Download,
} from "lucide-react";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";

interface PromoChange {
  id: number;
  action: "raise_cap" | "mint" | string;
  adminEmail: string;
  oldCode: string | null;
  oldMaxRedemptions: number | null;
  oldPromotionCodeId: string | null;
  newCode: string;
  newMaxRedemptions: number | null;
  newPromotionCodeId: string;
  createdAt: string;
}

interface HistoryResponse {
  changes: PromoChange[];
  total: number;
  page: number;
  pageSize: number;
  action: "raise_cap" | "mint" | null;
}

type ActionFilter = "all" | "raise_cap" | "mint";

const PAGE_SIZE = 50;

const ACTION_FILTERS: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "raise_cap", label: "Raise cap" },
  { value: "mint", label: "Mint" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminTesterPromoHistoryPageInner() {
  const { user, logout } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(
        `/api/admin/tester-promo/history?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load history.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as HistoryResponse;
      setData(body);
    } catch {
      setError("Network error loading history.");
    }
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const totalPages = useMemo(() => {
    if (!data || data.total === 0) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
              Admin home →
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <a
          href={base + "/admin/submissions"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to admin
        </a>

        <div className="mb-6">
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-1 flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Tester promo history
          </h1>
          <p className="text-muted-foreground text-base">
            Every raise-cap and mint action recorded for the tester promo, newest
            first. Signed in as {user?.email}.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {ACTION_FILTERS.map((f) => {
            const active = actionFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setActionFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <a
            href={`/api/admin/tester-promo/history.csv${
              actionFilter !== "all" ? `?action=${actionFilter}` : ""
            }`}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border/60 bg-white text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors"
            title={
              actionFilter === "all"
                ? "Download all rows as CSV"
                : `Download ${actionFilter === "mint" ? "mint" : "raise-cap"} rows as CSV`
            }
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </a>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
          {loading && !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data && data.changes.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="text-lg font-serif font-semibold text-foreground mb-1">
                No changes match this filter
              </p>
              <p className="text-muted-foreground text-sm">
                Try a different action filter, or come back after the next
                raise-cap or mint.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/40">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">From</th>
                    <th className="px-4 py-3 font-semibold">To</th>
                    <th className="px-4 py-3 font-semibold">By</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.changes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 last:border-b-0 hover:bg-muted/20 align-top"
                    >
                      <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        <time dateTime={c.createdAt}>
                          {formatDateTime(c.createdAt)}
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${
                            c.action === "mint"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {c.action === "mint" ? "Mint" : "Raise cap"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.oldCode ? (
                          <span className="font-mono">{c.oldCode}</span>
                        ) : (
                          "—"
                        )}
                        {c.oldMaxRedemptions != null && (
                          <span className="block text-[11px] text-muted-foreground">
                            cap {c.oldMaxRedemptions.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <span className="font-mono">{c.newCode}</span>
                        {c.newMaxRedemptions != null && (
                          <span className="block text-[11px] text-muted-foreground">
                            cap {c.newMaxRedemptions.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate">
                        {c.adminEmail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                {data.total} change{data.total === 1 ? "" : "s"} · page{" "}
                {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminTesterPromoHistoryPage() {
  return (
    <AdminRouteGuard>
      <AdminTesterPromoHistoryPageInner />
    </AdminRouteGuard>
  );
}
