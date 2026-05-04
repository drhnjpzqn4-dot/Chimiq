import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

type VerdictFilter = "all" | "safe" | "warning" | "high";

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ verdict: verdictFilter, limit: "100" });
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
  }, [verdictFilter]);

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

  return (
    <section aria-labelledby="scan-insights-heading">
      <div className="mb-6">
        <h2
          id="scan-insights-heading"
          className="text-2xl font-serif font-semibold text-foreground mb-1"
        >
          Scan insights
        </h2>
        <p className="text-sm text-muted-foreground">
          See which products are scanned most and which trigger safety warnings.
        </p>
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
