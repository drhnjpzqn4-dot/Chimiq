import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { apiFetch } from "@/lib/api";

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

interface SummaryBucket {
  bucketStart: string;
  raiseCap: number;
  mint: number;
  total: number;
}

interface SummaryResponse {
  bucket: "quarter" | "month";
  buckets: SummaryBucket[];
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

// Strict YYYY-MM-DD shape check so a malformed `?from=garbage` URL doesn't
// silently propagate into the date inputs (which would render blank but
// still mark the preset as "custom"). We accept the value only if it
// also parses to a real calendar date.
function isValidDateParam(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [, y, mo, day] = m;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // Reject overflow dates like 2026-02-31 that JS would otherwise
  // silently normalize to a different calendar day.
  return (
    d.getFullYear() === Number(y) &&
    d.getMonth() + 1 === Number(mo) &&
    d.getDate() === Number(day)
  );
}

// Parse the bookmarkable filter params out of the current URL. We
// round-trip `actionFilter`, `q`, `page`, and the date-range controls
// (`preset`, `from`, `to`) so Pia can refresh, share a link, or use the
// back button without losing her view — including a quarter or custom
// range scoped view.
function readFiltersFromUrl(): {
  actionFilter: ActionFilter;
  q: string;
  page: number;
  datePreset: DatePreset;
  fromDate: string;
  toDate: string;
} {
  if (typeof window === "undefined") {
    return {
      actionFilter: "all",
      q: "",
      page: 1,
      datePreset: "all",
      fromDate: "",
      toDate: "",
    };
  }
  const params = new URLSearchParams(window.location.search);
  const rawAction = params.get("action");
  const actionFilter: ActionFilter =
    rawAction === "raise_cap" || rawAction === "mint" ? rawAction : "all";
  const q = params.get("q") ?? "";
  const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPreset = params.get("preset");
  const rawFrom = params.get("from") ?? "";
  const rawTo = params.get("to") ?? "";
  const fromValid = rawFrom && isValidDateParam(rawFrom);
  const toValid = rawTo && isValidDateParam(rawTo);

  let datePreset: DatePreset = "all";
  let fromDate = "";
  let toDate = "";
  if (
    rawPreset === "30d" ||
    rawPreset === "quarter" ||
    rawPreset === "ytd"
  ) {
    // For named presets we recompute the range from "today" rather than
    // trusting whatever from/to happen to be in the URL — that way a
    // bookmarked "?preset=quarter" link always means *this* quarter, not
    // the quarter that was current when the link was copied.
    datePreset = rawPreset;
    const resolved = resolvePreset(rawPreset);
    fromDate = resolved.from;
    toDate = resolved.to;
  } else if (rawPreset === "custom" || fromValid || toValid) {
    datePreset = "custom";
    if (fromValid) fromDate = rawFrom;
    if (toValid) toDate = rawTo;
  }

  return { actionFilter, q, page, datePreset, fromDate, toDate };
}

// Compact stacked bar chart for the per-bucket summary. Built from
// styled divs so we don't pull in a chart library for one small
// visualization. Each bar stacks raise-cap (blue) under mint (violet);
// native title tooltips surface the exact counts on hover. Single-
// bucket and all-zero cases still render a meaningful baseline instead
// of collapsing to nothing.
function SummaryBarChart({
  buckets,
  bucket,
  formatBucketLabel,
}: {
  buckets: SummaryBucket[];
  bucket: "quarter" | "month";
  formatBucketLabel: (iso: string, b: "quarter" | "month") => string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  // Cap the bar width so a single bucket doesn't stretch into one giant
  // block, and keep a sensible minimum so dense ranges stay readable.
  const barWidth =
    buckets.length <= 1
      ? 56
      : Math.min(56, Math.max(18, 320 / buckets.length));
  const gap = 12;
  const chartHeight = 96;
  if (buckets.length === 0) {
    // Preserve the chart's vertical footprint and legend so the card
    // doesn't visually jump when filters return no rows. The empty
    // baseline communicates "we plotted, there's just nothing here".
    return (
      <div className="mb-4">
        <div
          className="flex items-end pb-1"
          role="img"
          aria-label="No data to chart for the current filters"
        >
          <div
            className="rounded-md bg-muted/40 w-full"
            style={{ height: chartHeight }}
          />
        </div>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
            Raise cap
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400" />
            Mint
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <div
        className="flex items-end gap-3 overflow-x-auto pb-1"
        role="img"
        aria-label={`Bar chart of raise-cap and mint counts per ${bucket}`}
      >
        {buckets.map((b) => {
          const total = b.total;
          const raiseH = total > 0 ? (b.raiseCap / max) * chartHeight : 0;
          const mintH = total > 0 ? (b.mint / max) * chartHeight : 0;
          const label = formatBucketLabel(b.bucketStart, bucket);
          const tooltip = `${label}: ${b.raiseCap} raise-cap, ${b.mint} mint`;
          return (
            <div
              key={b.bucketStart}
              className="flex flex-col items-center gap-1 shrink-0"
              style={{ width: barWidth + gap }}
              title={tooltip}
            >
              <span className="text-[10px] tabular-nums text-muted-foreground h-3 leading-3">
                {total > 0 ? total : ""}
              </span>
              <div
                className="relative flex flex-col-reverse rounded-md overflow-hidden bg-muted/40"
                style={{ width: barWidth, height: chartHeight }}
              >
                {b.raiseCap > 0 && (
                  <div
                    className="bg-blue-400"
                    style={{ height: raiseH }}
                    aria-label={`${b.raiseCap} raise-cap`}
                  />
                )}
                {b.mint > 0 && (
                  <div
                    className="bg-violet-400"
                    style={{ height: mintH }}
                    aria-label={`${b.mint} mint`}
                  />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
          Raise cap
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400" />
          Mint
        </span>
      </div>
    </div>
  );
}

function AdminTesterPromoHistoryPageInner() {
  const { user, logout } = useAuth();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "") || "";

  const initialFilters = useMemo(() => readFiltersFromUrl(), []);

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>(
    initialFilters.actionFilter,
  );
  const [page, setPage] = useState(initialFilters.page);
  const [searchInput, setSearchInput] = useState(initialFilters.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.q);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    initialFilters.datePreset,
  );
  // YYYY-MM-DD strings bound to the date inputs. We keep the strings (not
  // Date objects) so the inputs render exactly what the user picked even
  // if their locale's formatting differs from ours.
  const [fromDate, setFromDate] = useState<string>(initialFilters.fromDate);
  const [toDate, setToDate] = useState<string>(initialFilters.toDate);

  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Debounce typing → query, mirroring AdminUsersPage's 300ms window so
  // Pia gets the same snappy-but-not-chatty feel across admin tools.
  // Skip the very first render so a deep link like ?q=foo&page=3 keeps
  // the hydrated page instead of being reset to 1 by the initial debounce.
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
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

  // Pick a bucket size for the summary based on how wide the active
  // range is. Quarters work for the typical "year so far" or unfiltered
  // view; switch to months when Pia narrows down to roughly a quarter
  // or less so each row carries some signal instead of just one bar.
  const summaryBucket: "quarter" | "month" = useMemo(() => {
    if (!fromDate || !toDate) return "quarter";
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return "quarter";
    }
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    return days <= 122 ? "month" : "quarter";
  }, [fromDate, toDate]);

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
      const res = await apiFetch(
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

  // Fetch the per-bucket summary alongside the table. We deliberately
  // don't gate it on `loading` so the summary still updates if the table
  // request is mid-flight; both endpoints share the same filter inputs.
  useEffect(() => {
    if (dateRangeInvalid) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ bucket: summaryBucket });
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (dateParams.from) params.set("from", dateParams.from);
    if (dateParams.to) params.set("to", dateParams.to);
    apiFetch(
      `/api/admin/tester-promo/history/summary?${params.toString()}`,
      { credentials: "include" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("summary failed");
        return (await res.json()) as SummaryResponse;
      })
      .then((body) => {
        if (!cancelled) setSummary(body);
      })
      .catch(() => {
        // Summary is a "nice to have" — if it fails we just hide it
        // rather than blocking the table view with an error.
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    actionFilter,
    debouncedSearch,
    dateParams,
    dateRangeInvalid,
    summaryBucket,
  ]);

  // Mirror the bookmarkable filters into window.location.search so that
  // refreshing or sharing the URL restores the same view. We use
  // replaceState (not pushState) to avoid pushing a new history entry on
  // every keystroke; the browser still preserves the URL across refreshes
  // and back/forward navigation away from and back to this page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (actionFilter !== "all") params.set("action", actionFilter);
    else params.delete("action");
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    // Date range: persist the preset name so a "?preset=quarter" link
    // always recomputes against today, and persist explicit from/to only
    // for custom ranges so the inputs come back exactly as Pia left them.
    if (datePreset !== "all") params.set("preset", datePreset);
    else params.delete("preset");
    if (datePreset === "custom" && fromDate) params.set("from", fromDate);
    else params.delete("from");
    if (datePreset === "custom" && toDate) params.set("to", toDate);
    else params.delete("to");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [actionFilter, debouncedSearch, page, datePreset, fromDate, toDate]);

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

  // Pretty-print a bucket-start timestamp as "Q2 2025" or "Apr 2025".
  // We treat the ISO string as UTC start-of-day (date_trunc returns
  // 00:00 UTC for the chosen unit) and read the calendar pieces back in
  // UTC too so a bucket never drifts across timezones.
  const formatBucketLabel = useCallback(
    (iso: string, bucket: "quarter" | "month"): string => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      const year = d.getUTCFullYear();
      if (bucket === "quarter") {
        const q = Math.floor(d.getUTCMonth() / 3) + 1;
        return `Q${q} ${year}`;
      }
      const month = d.toLocaleString(undefined, {
        month: "short",
        timeZone: "UTC",
      });
      return `${month} ${year}`;
    },
    [],
  );

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
          <h1 className="text-3xl font-serif font-medium text-foreground mb-1 flex items-center gap-2">
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

        {summary && (
          <div className="mb-4 rounded-2xl border border-border/60 bg-white p-3 sm:p-4">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                Summary by {summary.bucket}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Counts respect the active filters
              </span>
            </div>
            <SummaryBarChart
              buckets={summary.buckets}
              bucket={summary.bucket}
              formatBucketLabel={formatBucketLabel}
            />
            {summary.buckets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No promo changes match the current filters yet.
              </p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-4 font-semibold">Period</th>
                    <th className="py-1.5 pr-4 font-semibold">Raise cap</th>
                    <th className="py-1.5 pr-4 font-semibold">Mint</th>
                    <th className="py-1.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.buckets.map((b) => (
                    <tr
                      key={b.bucketStart}
                      className="border-t border-border/30"
                    >
                      <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap">
                        {formatBucketLabel(b.bucketStart, summary.bucket)}
                      </td>
                      <td className="py-1.5 pr-4 tabular-nums">
                        {b.raiseCap > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                              {b.raiseCap}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4 tabular-nums">
                        {b.mint > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">
                              {b.mint}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-1.5 tabular-nums text-muted-foreground">
                        {b.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

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
              <p className="text-lg font-serif font-medium text-foreground mb-1">
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
