import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { isRequestAdmin } from "../lib/admin.js";

const router: IRouter = Router();

const PeriodSchema = z.enum(["7d", "30d", "90d", "all"]).default("30d");

function periodToDate(period: string): Date | null {
  if (period === "all") return null;
  const days = parseInt(period, 10);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/admin/funnel", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const parsed = PeriodSchema.safeParse(req.query.period ?? "30d");
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid period. Use 7d, 30d, 90d, or all." });
    return;
  }
  const period = parsed.data;
  const since = periodToDate(period);

  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase.rpc("admin_funnel_counts", {
      p_since: since?.toISOString() ?? null,
    });
    if (error) throw error;
    const counts = data as Record<string, number> | null;
    const c = counts ?? {};

    const steps = [
      { key: "signups", label: "Sign-ups", count: Number(c.signups ?? 0) },
      { key: "scans", label: "Scans", count: Number(c.scans ?? 0) },
      { key: "shelfSaves", label: "Shelf saves", count: Number(c.shelfSaves ?? 0) },
      { key: "checkouts", label: "Checkout starts", count: Number(c.checkouts ?? 0) },
      { key: "checkoutAbandoned", label: "Checkout abandoned", count: Number(c.checkoutAbandoned ?? 0) },
      { key: "recoveryClicks", label: "Recovery clicks", count: Number(c.recoveryClicks ?? 0) },
      { key: "recoveryDismissals", label: "Recovery dismissed", count: Number(c.recoveryDismissals ?? 0) },
      {
        key: "subscriptions",
        label: "Subscriptions",
        count: Number(c.subscriptions ?? 0),
      },
    ];

    const checkoutsIdx = steps.findIndex((s) => s.key === "checkouts");
    const abandonedIdx = steps.findIndex((s) => s.key === "checkoutAbandoned");

    const branchFromCheckouts = new Set(["checkoutAbandoned", "recoveryClicks", "recoveryDismissals", "subscriptions"]);

    const funnel = steps.map((step, i) => {
      let prevStep: typeof step;
      if (step.key === "recoveryClicks" || step.key === "recoveryDismissals") {
        prevStep = abandonedIdx >= 0 ? steps[abandonedIdx] : (checkoutsIdx >= 0 ? steps[checkoutsIdx] : steps[i - 1]);
      } else if (branchFromCheckouts.has(step.key)) {
        prevStep = checkoutsIdx >= 0 ? steps[checkoutsIdx] : steps[i - 1];
      } else {
        prevStep = i === 0 ? step : steps[i - 1];
      }
      const prev = prevStep.count;
      const rate = prev > 0 ? step.count / prev : 0;
      const overallRate = steps[0].count > 0 ? step.count / steps[0].count : 0;
      return {
        ...step,
        conversionFromPrev: Math.round(rate * 10000) / 100,
        conversionFromTop: Math.round(overallRate * 10000) / 100,
      };
    });

    res.json({ period, since: since?.toISOString() ?? null, funnel });
  } catch (err) {
    req.log.error({ err }, "Failed to load funnel data");
    res.status(500).json({ error: "Failed to load funnel data." });
  }
});

type SeriesRow = { date: string; count: number };

function parseSeries(raw: unknown): SeriesRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    return { date: String(o.date ?? ""), count: Number(o.count ?? 0) };
  });
}

router.get("/admin/funnel/trend", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const parsed = PeriodSchema.safeParse(req.query.period ?? "30d");
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid period. Use 7d, 30d, 90d, or all." });
    return;
  }
  const period = parsed.data;
  const since = periodToDate(period);
  const granularity = period === "7d" || period === "30d" ? "day" : "week";

  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase.rpc("admin_funnel_series", {
      p_since: since?.toISOString() ?? null,
      p_granularity: granularity,
    });
    if (error) throw error;
    const bundle = data as Record<string, unknown> | null;
    if (!bundle) {
      res.json({ period, granularity, series: [] });
      return;
    }

    const signupRows = parseSeries(bundle.signups);
    const scanRows = parseSeries(bundle.scans);
    const shelfRows = parseSeries(bundle.shelfSaves);
    const checkoutRows = parseSeries(bundle.checkouts);
    const abandonedRows = parseSeries(bundle.checkoutAbandoned);
    const recoveryClickRows = parseSeries(bundle.recoveryClicks);
    const recoveryDismissalRows = parseSeries(bundle.recoveryDismissals);
    const subRows = parseSeries(bundle.subscriptions);

    type BucketCounts = {
      signups: number;
      scans: number;
      shelfSaves: number;
      checkouts: number;
      checkoutAbandoned: number;
      recoveryClicks: number;
      recoveryDismissals: number;
      subscriptions: number;
    };
    const emptyBucket = (): BucketCounts => ({
      signups: 0,
      scans: 0,
      shelfSaves: 0,
      checkouts: 0,
      checkoutAbandoned: 0,
      recoveryClicks: 0,
      recoveryDismissals: 0,
      subscriptions: 0,
    });

    const dateMap = new Map<string, BucketCounts>();

    const ensureDate = (date: string) => {
      if (!dateMap.has(date)) {
        dateMap.set(date, emptyBucket());
      }
      return dateMap.get(date)!;
    };

    for (const row of signupRows) ensureDate(String(row.date)).signups = Number(row.count);
    for (const row of scanRows) ensureDate(String(row.date)).scans = Number(row.count);
    for (const row of shelfRows) ensureDate(String(row.date)).shelfSaves = Number(row.count);
    for (const row of checkoutRows) ensureDate(String(row.date)).checkouts = Number(row.count);
    for (const row of abandonedRows) ensureDate(String(row.date)).checkoutAbandoned = Number(row.count);
    for (const row of recoveryClickRows) ensureDate(String(row.date)).recoveryClicks = Number(row.count);
    for (const row of recoveryDismissalRows) ensureDate(String(row.date)).recoveryDismissals = Number(row.count);
    for (const row of subRows) ensureDate(String(row.date)).subscriptions = Number(row.count);

    const observedDates = Array.from(dateMap.keys()).sort();
    const startDate = since
      ?? (observedDates.length > 0 ? new Date(observedDates[0]) : new Date());
    const now = new Date();
    const stepMs = granularity === "day" ? 86_400_000 : 7 * 86_400_000;
    const cursor = new Date(startDate);
    if (granularity === "week") {
      const day = cursor.getUTCDay();
      cursor.setUTCDate(cursor.getUTCDate() - ((day + 6) % 7));
    }
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 10);
      if (!dateMap.has(key)) dateMap.set(key, emptyBucket());
      cursor.setTime(cursor.getTime() + stepMs);
    }

    const series = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    res.json({ period, granularity, series });
  } catch (err) {
    req.log.error({ err }, "Failed to load funnel trend data");
    res.status(500).json({ error: "Failed to load funnel trend data." });
  }
});

export default router;
