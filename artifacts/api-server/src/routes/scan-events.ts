import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, scanEventsTable } from "@workspace/db";
import { sql, desc, eq, and, gte, lte } from "drizzle-orm";
import { isRequestAdmin } from "../lib/admin.js";
import { ipRateLimit } from "../lib/rateLimit.js";

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
    await db.insert(scanEventsTable).values({
      productName: normalized,
      verdict,
      scanMode,
      userId,
    });
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
    const conditions = [];
    conditions.push(sql`${scanEventsTable.productName} IS NOT NULL`);
    conditions.push(sql`${scanEventsTable.productName} != ''`);

    if (verdictFilter !== "all") {
      conditions.push(eq(scanEventsTable.verdict, verdictFilter));
    }

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(scanEventsTable.createdAt, fromDate));
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(scanEventsTable.createdAt, toDate));
      }
    }

    const rows = await db
      .select({
        productName: sql<string>`min(${scanEventsTable.productName})`.as("product_name"),
        totalScans: sql<number>`count(*)`.as("total_scans"),
        safeCount: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'safe')`.as("safe_count"),
        warningCount: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'warning')`.as("warning_count"),
        highCount: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'high')`.as("high_count"),
        lastScanned: sql<string>`max(${scanEventsTable.createdAt})`.as("last_scanned"),
      })
      .from(scanEventsTable)
      .where(and(...conditions))
      .groupBy(sql`lower(${scanEventsTable.productName})`)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const summaryConditions = [...conditions];

    const [summaryRow] = await db
      .select({
        total: sql<number>`count(*)`,
        safe: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'safe')`,
        warning: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'warning')`,
        high: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'high')`,
      })
      .from(scanEventsTable)
      .where(and(...summaryConditions));

    res.json({
      products: rows.map((r) => ({
        productName: r.productName,
        totalScans: Number(r.totalScans),
        safeCount: Number(r.safeCount),
        warningCount: Number(r.warningCount),
        highCount: Number(r.highCount),
        lastScanned: r.lastScanned,
      })),
      summary: {
        totalEvents: Number(summaryRow?.total ?? 0),
        safe: Number(summaryRow?.safe ?? 0),
        warning: Number(summaryRow?.warning ?? 0),
        high: Number(summaryRow?.high ?? 0),
      },
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
    const conditions = [];

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(scanEventsTable.createdAt, fromDate));
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(scanEventsTable.createdAt, toDate));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        date: sql<string>`to_char(${scanEventsTable.createdAt}::date, 'YYYY-MM-DD')`.as("date"),
        total: sql<number>`count(*)`.as("total"),
        safe: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'safe')`.as("safe"),
        warning: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'warning')`.as("warning"),
        high: sql<number>`count(*) FILTER (WHERE ${scanEventsTable.verdict} = 'high')`.as("high"),
      })
      .from(scanEventsTable)
      .where(whereClause)
      .groupBy(sql`${scanEventsTable.createdAt}::date`)
      .orderBy(sql`${scanEventsTable.createdAt}::date`);

    res.json({
      series: rows.map((r) => ({
        date: r.date,
        total: Number(r.total),
        safe: Number(r.safe),
        warning: Number(r.warning),
        high: Number(r.high),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load scan timeseries");
    res.status(500).json({ error: "Failed to load scan timeseries." });
  }
});

export default router;
