import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { apiFetch } from "@/lib/api";

interface TimeseriesPoint {
  date: string;
  total: number;
  safe: number;
  warning: number;
  high: number;
}

interface ScanTrendChartProps {
  from: string | undefined;
  to: string | undefined;
}

const totalConfig: ChartConfig = {
  total: {
    label: "Total scans",
    color: "#7BAF7A",
  },
};

const verdictConfig: ChartConfig = {
  safe: {
    label: "Safe",
    color: "#22c55e",
  },
  warning: {
    label: "Warning",
    color: "#f59e0b",
  },
  high: {
    label: "High risk",
    color: "#ef4444",
  },
};

export function ScanTrendChart({ from, to }: ScanTrendChartProps) {
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChartMode>("total");

  const fetchTimeseries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await apiFetch(
        `/api/admin/scan-insights/timeseries?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load trend data.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { series: TimeseriesPoint[] };
      setSeries(body.series);
    } catch {
      setError("Network error loading trend data.");
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchTimeseries();
  }, [fetchTimeseries]);

  const chartConfig = mode === "total" ? totalConfig : verdictConfig;

  const formattedSeries = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        label: format(parseISO(p.date), "MMM d"),
      })),
    [series],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">
        {error}
      </div>
    );
  }

  if (series.length < 2) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Scan volume over time
          </h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          {series.length === 0
            ? "No scan data yet. The chart will appear once scans are recorded."
            : "Only one day of data so far. The trend chart will appear after a second day of scans."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Scan volume over time
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setMode("total")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mode === "total"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => setMode("verdict")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mode === "verdict"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By verdict
          </button>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
        <AreaChart
          data={formattedSeries}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            {mode === "total" ? (
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7BAF7A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7BAF7A" stopOpacity={0.02} />
              </linearGradient>
            ) : (
              <>
                <linearGradient id="fillSafe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillWarning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </>
            )}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            allowDecimals={false}
            width={36}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.date) {
                    return format(
                      parseISO(payload[0].payload.date),
                      "MMM d, yyyy",
                    );
                  }
                  return "";
                }}
              />
            }
          />
          {mode === "total" ? (
            <Area
              type="monotone"
              dataKey="total"
              stroke="#7BAF7A"
              strokeWidth={2}
              fill="url(#fillTotal)"
            />
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="safe"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#fillSafe)"
                stackId="verdict"
              />
              <Area
                type="monotone"
                dataKey="warning"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#fillWarning)"
                stackId="verdict"
              />
              <Area
                type="monotone"
                dataKey="high"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#fillHigh)"
                stackId="verdict"
              />
            </>
          )}
        </AreaChart>
      </ChartContainer>

      {mode === "verdict" && (
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Safe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Warning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            High risk
          </span>
        </div>
      )}
    </div>
  );
}
