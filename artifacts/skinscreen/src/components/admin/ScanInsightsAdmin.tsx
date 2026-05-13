import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  CalendarDays,
  X,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ScanTrendChart } from "./ScanTrendChart";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type VerdictFilter = "all" | "safe" | "warning" | "high";
type DatePreset = "7d" | "30d" | "90d" | "custom" | "all";

interface ProductRow {
  productName: string;
  totalScans: number;
  safeCount: number;
  warningCount: number;
  highCount: number;
  lastScanned: string;
}

interface Summary {
  totalEvents: number;
  safe: number;
  warning: number;
  high: number;
}

interface InsightsResponse {
  products: ProductRow[];
  summary: Summary;
}

const VERDICT_TABS: { value: VerdictFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "safe", label: "Safe" },
  { value: "warning", label: "Warning" },
  { value: "high", label: "High risk" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function presetToRange(preset: DatePreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  switch (preset) {
    case "7d":
      return { from: startOfDay(subDays(now, 7)), to: now };
    case "30d":
      return { from: startOfDay(subDays(now, 30)), to: now };
    case "90d":
      return { from: startOfDay(subDays(now, 90)), to: now };
    default:
      return { from: undefined, to: undefined };
  }
}

function formatDateParam(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return format(d, "yyyy-MM-dd");
}

function verdictBadge(verdict: VerdictFilter) {
  switch (verdict) {
    case "safe":
      return { icon: ShieldCheck, className: "bg-green-100 text-green-700" };
    case "warning":
      return { icon: AlertTriangle, className: "bg-amber-100 text-amber-700" };
    case "high":
      return { icon: ShieldAlert, className: "bg-red-100 text-red-700" };
    default:
      return { icon: BarChart3, className: "bg-muted text-muted-foreground" };
  }
}

export function ScanInsightsAdmin() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [fromPopoverOpen, setFromPopoverOpen] = useState(false);
  const [toPopoverOpen, setToPopoverOpen] = useState(false);

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      return { from: customFrom, to: customTo };
    }
    return presetToRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ verdict: verdictFilter, limit: "100" });
      const fromStr = formatDateParam(dateRange.from);
      const toStr = formatDateParam(dateRange.to);
      if (fromStr) params.set("from", fromStr);
      if (toStr) params.set("to", toStr);

      const res = await fetch(`/api/admin/scan-insights?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load scan insights.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as InsightsResponse;
      setData(body);
    } catch {
      setError("Network error loading scan insights.");
    }
    setLoading(false);
  }, [verdictFilter, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedSearch) return data.products;
    return data.products.filter((p) =>
      p.productName.toLowerCase().includes(debouncedSearch),
    );
  }, [data, debouncedSearch]);

  const maxScans = useMemo(
    () => Math.max(1, ...filtered.map((p) => p.totalScans)),
    [filtered],
  );

  function handlePresetClick(preset: DatePreset) {
    setDatePreset(preset);
    if (preset !== "custom") {
      setCustomFrom(undefined);
      setCustomTo(undefined);
    }
  }

  function handleCustomFromSelect(day: Date | undefined) {
    setCustomFrom(day);
    setDatePreset("custom");
    setFromPopoverOpen(false);
  }

  function handleCustomToSelect(day: Date | undefined) {
    setCustomTo(day);
    setDatePreset("custom");
    setToPopoverOpen(false);
  }

  function clearCustomDate(which: "from" | "to") {
    if (which === "from") setCustomFrom(undefined);
    else setCustomTo(undefined);
    if (
      (which === "from" && !customTo) ||
      (which === "to" && !customFrom)
    ) {
      setDatePreset("all");
    }
  }

  const dateLabel = useMemo(() => {
    if (datePreset !== "custom") return null;
    const parts: string[] = [];
    if (customFrom) parts.push(`from ${format(customFrom, "MMM d, yyyy")}`);
    if (customTo) parts.push(`to ${format(customTo, "MMM d, yyyy")}`);
    return parts.length > 0 ? parts.join(" ") : null;
  }, [datePreset, customFrom, customTo]);

  return (
    <section aria-labelledby="scan-insights-heading">
      <div className="mb-6">
        <h2
          id="scan-insights-heading"
          className="text-2xl font-serif font-medium text-foreground mb-1"
        >
          Scan insights
        </h2>
        <p className="text-sm text-muted-foreground">
          See which products are scanned most and which trigger safety warnings.
        </p>
      </div>

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
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

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  customFrom
                    ? "bg-primary/5 border-primary/30 text-foreground"
                    : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {customFrom ? format(customFrom, "MMM d, yyyy") : "From date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={handleCustomFromSelect}
                disabled={{ after: customTo || new Date() }}
                defaultMonth={customFrom || new Date()}
              />
            </PopoverContent>
          </Popover>

          {customFrom && (
            <button
              type="button"
              onClick={() => clearCustomDate("from")}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Clear from date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="text-xs text-muted-foreground">–</span>

          <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  customTo
                    ? "bg-primary/5 border-primary/30 text-foreground"
                    : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {customTo ? format(customTo, "MMM d, yyyy") : "To date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={handleCustomToSelect}
                disabled={{ before: customFrom, after: new Date() }}
                defaultMonth={customTo || customFrom || new Date()}
              />
            </PopoverContent>
          </Popover>

          {customTo && (
            <button
              type="button"
              onClick={() => clearCustomDate("to")}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Clear to date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {datePreset === "custom" && dateLabel && (
          <p className="text-xs text-muted-foreground pl-0.5">
            Showing results {dateLabel}
          </p>
        )}
      </div>

      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Total scans" value={data.summary.totalEvents} />
          <SummaryCard
            label="Safe"
            value={data.summary.safe}
            className="text-green-700 bg-green-50 border-green-200"
          />
          <SummaryCard
            label="Warning"
            value={data.summary.warning}
            className="text-amber-700 bg-amber-50 border-amber-200"
          />
          <SummaryCard
            label="High risk"
            value={data.summary.high}
            className="text-red-700 bg-red-50 border-red-200"
          />
        </div>
      )}

      <ScanTrendChart
        from={formatDateParam(dateRange.from)}
        to={formatDateParam(dateRange.to)}
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {VERDICT_TABS.map((t) => {
            const active = verdictFilter === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setVerdictFilter(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search product name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl bg-white border border-border/60 p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {data?.products.length === 0
              ? "No scan events recorded yet."
              : "No products match your search."}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>
          <ul className="space-y-2">
            {filtered.map((p) => (
              <ProductInsightRow key={p.productName} product={p} maxScans={maxScans} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        className ?? "bg-white border-border/60"
      }`}
    >
      <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function ProductInsightRow({
  product,
  maxScans,
}: {
  product: ProductRow;
  maxScans: number;
}) {
  const barWidth = Math.max(4, (product.totalScans / maxScans) * 100);

  const dominantVerdict: VerdictFilter =
    product.highCount > 0
      ? "high"
      : product.warningCount > 0
        ? "warning"
        : "safe";

  const badge = verdictBadge(dominantVerdict);
  const Icon = badge.icon;

  return (
    <li className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {product.productName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last scanned{" "}
              {new Date(product.lastScanned).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {product.totalScans}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.className}`}
            >
              <Icon className="w-3 h-3" />
              {dominantVerdict}
            </span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-muted/40 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              background:
                dominantVerdict === "high"
                  ? "#ef4444"
                  : dominantVerdict === "warning"
                    ? "#f59e0b"
                    : "#22c55e",
            }}
          />
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1 text-green-700">
            <ShieldCheck className="w-3 h-3" />
            {product.safeCount} safe
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="w-3 h-3" />
            {product.warningCount} warning
          </span>
          <span className="inline-flex items-center gap-1 text-red-700">
            <ShieldAlert className="w-3 h-3" />
            {product.highCount} high
          </span>
        </div>
      </div>
    </li>
  );
}
