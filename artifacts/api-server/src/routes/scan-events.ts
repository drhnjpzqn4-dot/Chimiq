import { Router, type IRouter } from "express";
import { z } from "zod";
import { isRequestAdmin } from "../lib/admin.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const RecordBody = z.object({
  productName: z.string().max(500).optional(),
  verdict: z.enum(["safe", "warning", "high"]),
  scanMode: z.enum(["single", "compare"]).default("single"),
});

function normalizeProductName(name: string | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
}

const router: IRouter = Router();

const scanEventLimiter = ipRateLimit({ windowMs: 60_000, max: 30, key: "scan-events" });
const PAGE_SIZE = 1000;

interface ScanEventRow {
  product_name: string | null;
  verdict: "safe" | "warning" | "high";
  created_at: string;
}

interface ScanFilters {
  verdictFilter?: "safe" | "warning" | "high";
  from?: string;
  to?: string;
  requireProductName?: boolean;
}

function applyScanFilters(query: any, filters: ScanFilters) {
  let next = query;
  if (filters.requireProductName) {
    next = next.not("product_name", "is", null).neq("product_name", "");
  }
  if (filters.verdictFilter) {
    next = next.eq("verdict", filters.verdictFilter);
  }
  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!Number.isNaN(fromDate.getTime())) {
      next = next.gte("created_at", fromDate.toISOString());
    }
  }
  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      next = next.lte("created_at", toDate.toISOString());
    }
  }
  return next;
}

async function fetchScanEvents(filters: ScanFilters): Promise<ScanEventRow[]> {
  const rows: ScanEventRow[] = [];
  let offset = 0;

  for (;;) {
    const query = applyScanFilters(
      supabaseAdmin
        .from("scan_events")
        .select("product_name,verdict,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
      filters,
    );
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as ScanEventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

router.post("/scan-events", scanEventLimiter, async (req, res) => {
  const parsed = RecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid scan event payload." });
    return;
  }

  const { productName, verdict, scanMode } = parsed.data;
  const userId = req.user?.id ?? null;
  const normalized = normalizeProductName(productName);

  try {
    const { error } = await supabaseAdmin.from("scan_events").insert({
      product_name: normalized,
      verdict,
      scan_mode: scanMode,
      user_id: userId,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.warn({ err }, "Failed to record scan event");
    res.status(500).json({ error: "Failed to record scan event." });
  }
});

const VerdictFilterEnum = z.enum(["all", "safe", "warning", "high"]).default("all");

router.get("/admin/scan-insights", async (req, res) => {
  if (!isRequestAdmin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const verdictParsed = VerdictFilterEnum.safeParse(req.query.verdict ?? "all");
  if (!verdictParsed.success) {
    res.status(400).json({ error: "Invalid verdict filter. Must be one of: all, safe, warning, high." });
    return;
  }
  const verdictFilter = verdictParsed.data;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  try {
    const rows = await fetchScanEvents({
      verdictFilter: verdictFilter === "all" ? undefined : verdictFilter,
      from,
      to,
      requireProductName: true,
    });

    const grouped = new Map<
      string,
      {
        productName: string;
        totalScans: number;
        safeCount: number;
        warningCount: number;
        highCount: number;
        lastScanned: string;
      }
    >();
    const summary = { totalEvents: 0, safe: 0, warning: 0, high: 0 };

    for (const row of rows) {
      const productName = normalizeProductName(row.product_name ?? undefined);
      if (!productName) continue;
      summary.totalEvents += 1;
      summary[row.verdict] += 1;

      const key = productName.toLowerCase();
      const item =
        grouped.get(key) ??
        {
          productName,
          totalScans: 0,
          safeCount: 0,
          warningCount: 0,
          highCount: 0,
          lastScanned: row.created_at,
        };
      item.totalScans += 1;
      if (row.verdict === "safe") item.safeCount += 1;
      if (row.verdict === "warning") item.warningCount += 1;
      if (row.verdict === "high") item.highCount += 1;
      if (new Date(row.created_at).getTime() > new Date(item.lastScanned).getTime()) {
        item.lastScanned = row.created_at;
      }
      grouped.set(key, item);
    }

    const products = Array.from(grouped.values())
      .sort((a, b) => b.totalScans - a.totalScans)
      .slice(0, limit);

    res.json({
      products,
      summary,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load scan insights");
    res.status(500).json({ error: "Failed to load scan insights." });
  }
});

router.get("/admin/scan-insights/timeseries", async (req, res) => {
  if (!isRequestAdmin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  try {
    const rows = await fetchScanEvents({ from, to });
    const byDate = new Map<string, { date: string; total: number; safe: number; warning: number; high: number }>();

    for (const row of rows) {
      const date = new Date(row.created_at).toISOString().slice(0, 10);
      const item = byDate.get(date) ?? { date, total: 0, safe: 0, warning: 0, high: 0 };
      item.total += 1;
      item[row.verdict] += 1;
      byDate.set(date, item);
    }

    res.json({
      series: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load scan timeseries");
    res.status(500).json({ error: "Failed to load scan timeseries." });
  }
});

export default router;
