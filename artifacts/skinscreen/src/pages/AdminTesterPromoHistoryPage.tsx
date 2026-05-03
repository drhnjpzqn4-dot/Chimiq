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
  Search,
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
  q: string | null;
  from: string | null;
  to: string | null;
}

type ActionFilter = "all" | "raise_cap" | "mint";
type DatePreset = "all" | "30d" | "quarter" | "ytd" | "custom";

const PAGE_SIZE = 50;

const ACTION_FILTERS: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "raise_cap", label: "Raise cap" },
  { value: "mint", label: "Mint" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "This quarter" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom" },
];

// Format a Date as YYYY-MM-DD in the user's local timezone, suitable for
// an <input type="date"> value. We deliberately avoid toISOString() here
// because that converts to UTC and would shift the displayed day for
// anyone west of UTC (Pia is in CET so it would actually round forward,
// but we want consistency for everyone).
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Resolve a preset into concrete YYYY-MM-DD `from` / `to` strings. The
// returned values feed both the date inputs (when the user switches into
// custom) and the URL params we send to the API.
function resolvePreset(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const to = toDateInputValue(today);
  if (preset === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toDateInputValue(from), to };
  }
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3);
    const from = new Date(today.getFullYear(), q * 3, 1);
    return { from: toDateInputValue(from), to };
  }
  if (preset === "ytd") {
    const from = new Date(today.getFullYear(), 0, 1);
    return { from: toDateInputValue(from), to };
  }
  return { from: "", to: "" };
}

// Convert a YYYY-MM-DD input into a precise instant for the API. `from`
// snaps to start-of-day local time; `to` snaps to end-of-day local time
// so a same-day range like 2025-04-01..2025-04-01 captures every change
// from that whole day, not just midnight.
function dayStartIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function dayEndIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  // YYYY-MM-DD strings bound to the date inputs. We keep the strings (not
  // Date objects) so the inputs render exactly what the user picked even
  // if their locale's formatting differs from ours.
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Debounce typing → query, mirroring AdminUsersPage's 300ms window so
  // Pia gets the same snappy-but-not-chatty feel across admin tools.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Build the date params shared between the JSON fetch and the CSV
  // download link, so both views always agree about the active range.
  const dateParams = useMemo(() => {
    const params: { from?: string; to?: string } = {};
    if (dateRangeInvalid) return params;
    const fromIso = dayStartIso(fromDate);
    const toIso = dayEndIso(toDate);
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;
    return params;
  }, [fromDate, toDate, dateRangeInvalid]);

  const fetchHistory = useCallback(async () => {
    if (dateRangeInvalid) {
      setError("End date can't be before start date.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (dateParams.from) params.set("from", dateParams.from);
      if (dateParams.to) params.set("to", dateParams.to);
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
  }, [page, actionFilter, debouncedSearch, dateParams, dateRangeInvalid]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handlePresetClick = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    if (preset === "custom") {
      // Keep whatever's already in the inputs so the admin can tweak the
      // current range; nothing to compute.
      return;
    }
    const { from, to } = resolvePreset(preset);
    setFromDate(from);
    setToDate(to);
  }, []);

  // Build the CSV download URL with the same filters as the table view.
  const csvHref = useMemo(() => {
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (dateParams.from) params.set("from", dateParams.from);
    if (dateParams.to) params.set("to", dateParams.to);
    const qs = params.toString();
    return `/api/admin/tester-promo/history.csv${qs ? `?${qs}` : ""}`;
  }, [actionFilter, debouncedSearch, dateParams]);

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

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by code or admin email…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>
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
            href={csvHref}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border/60 bg-white text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors ${
              dateRangeInvalid ? "pointer-events-none opacity-40" : ""
            }`}
            aria-disabled={dateRangeInvalid || undefined}
            title="Download the rows matching the current filters as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </a>
        </div>

        <div className="mb-6 rounded-2xl border border-border/60 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mr-1">
              Date range
            </span>
            {DATE_PRESETS.map((p) => {
              const active = datePreset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePresetClick(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset("custom");
                  setPage(1);
                }}
                className="mt-1 px-3 py-1.5 rounded-lg border border-border/60 text-sm font-normal normal-case text-foreground tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </label>
            <label className="flex flex-col text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              To
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset("custom");
                  setPage(1);
                }}
                className="mt-1 px-3 py-1.5 rounded-lg border border-border/60 text-sm font-normal normal-case text-foreground tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => handlePresetClick("all")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mb-1.5"
              >
                Clear
              </button>
            )}
            {dateRangeInvalid && (
              <span className="text-xs text-red-600 mb-1.5">
                End date must be on or after the start date.
              </span>
            )}
          </div>
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
