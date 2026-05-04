import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Line,
  LineChart,
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

interface TrendPoint {
  date: string;
  signups: number;
  scans: number;
  shelfSaves: number;
  checkouts: number;
  checkoutAbandoned: number;
  recoveryClicks: number;
  recoveryDismissals: number;
  subscriptions: number;
}

interface FunnelTrendChartProps {
  period: string;
}

const STEP_KEYS = ["signups", "scans", "shelfSaves", "checkouts", "checkoutAbandoned", "recoveryClicks", "recoveryDismissals", "subscriptions"] as const;

const chartConfig: ChartConfig = {
  signups: { label: "Sign-ups", color: "#6366f1" },
  scans: { label: "Scans", color: "#8b5cf6" },
  shelfSaves: { label: "Shelf saves", color: "#a855f7" },
  checkouts: { label: "Checkouts", color: "#d946ef" },
  checkoutAbandoned: { label: "Abandoned", color: "#ef4444" },
  recoveryClicks: { label: "Recovery clicks", color: "#f59e0b" },
  recoveryDismissals: { label: "Recovery dismissed", color: "#f97316" },
  subscriptions: { label: "Subscriptions", color: "#22c55e" },
};

export function FunnelTrendChart({ period }: FunnelTrendChartProps) {
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        const visibleCount = STEP_KEYS.length - next.size;
        if (visibleCount <= 1) return prev;
        next.add(key);
      }
      return next;
    });
  }, []);

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funnel/trend?period=${period}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to load trend data.");
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { series: TrendPoint[] };
      setSeries(body.series);
    } catch {
      setError("Network error loading trend data.");
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

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
      <div className="bg-white rounded-2xl border border-border/60 p-6 mb-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-8">
        {error}
      </div>
    );
  }

  if (series.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-border/60 p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Funnel trend over time
          </h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          {series.length === 0
            ? "No funnel data yet. The chart will appear once activity is recorded."
            : "Only one data point so far. The trend chart needs at least two time periods."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border/60 p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Funnel trend over time
        </h3>
      </div>

      <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
        <LineChart
          data={formattedSeries}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
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
          {STEP_KEYS.map((key) =>
            hiddenKeys.has(key) ? null : (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartConfig[key].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ),
          )}
        </LineChart>
      </ChartContainer>

      <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
        {STEP_KEYS.map((key) => {
          const hidden = hiddenKeys.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleKey(key)}
              className={`inline-flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-35 line-through" : "opacity-100"}`}
              title={hidden ? `Show ${chartConfig[key].label}` : `Hide ${chartConfig[key].label}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: chartConfig[key].color }}
              />
              {chartConfig[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
