import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  db,
  usersTable,
  scanEventsTable,
  shelfProductsTable,
  checkoutEventsTable,
  checkoutAbandonmentEventsTable,
  checkoutRecoveryEventsTable,
  subscriptionEventsTable,
} from "@workspace/db";
import { sql, and, gte, eq, count, countDistinct } from "drizzle-orm";
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
    const [signups, scans, shelfSaves, checkouts, checkoutAbandoned, recoveryClicks, recoveryDismissals, subscriptions] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(usersTable)
          .where(since ? gte(usersTable.createdAt, since) : sql`true`),

        db
          .select({ count: countDistinct(scanEventsTable.userId) })
          .from(scanEventsTable)
          .where(
            and(
              sql`${scanEventsTable.userId} IS NOT NULL`,
              since ? gte(scanEventsTable.createdAt, since) : sql`true`,
            ),
          ),

        db
          .select({ count: countDistinct(shelfProductsTable.userId) })
          .from(shelfProductsTable)
          .where(since ? gte(shelfProductsTable.addedAt, since) : sql`true`),

        db
          .select({ count: countDistinct(checkoutEventsTable.userId) })
          .from(checkoutEventsTable)
          .where(
            since ? gte(checkoutEventsTable.createdAt, since) : sql`true`,
          ),

        db
          .select({ count: countDistinct(checkoutAbandonmentEventsTable.userId) })
          .from(checkoutAbandonmentEventsTable)
          .where(
            since ? gte(checkoutAbandonmentEventsTable.createdAt, since) : sql`true`,
          ),

        db
          .select({ count: countDistinct(checkoutRecoveryEventsTable.userId) })
          .from(checkoutRecoveryEventsTable)
          .where(
            and(
              eq(checkoutRecoveryEventsTable.action, "click"),
              since ? gte(checkoutRecoveryEventsTable.createdAt, since) : sql`true`,
            ),
          ),

        db
          .select({ count: countDistinct(checkoutRecoveryEventsTable.userId) })
          .from(checkoutRecoveryEventsTable)
          .where(
            and(
              eq(checkoutRecoveryEventsTable.action, "dismissed"),
              since ? gte(checkoutRecoveryEventsTable.createdAt, since) : sql`true`,
            ),
          ),

        db
          .select({ count: countDistinct(subscriptionEventsTable.userId) })
          .from(subscriptionEventsTable)
          .where(
            and(
              sql`${subscriptionEventsTable.status} IN ('active', 'trialing')`,
              since
                ? gte(subscriptionEventsTable.createdAt, since)
                : sql`true`,
            ),
          ),
      ]);

    const steps = [
      { key: "signups", label: "Sign-ups", count: Number(signups[0]?.count ?? 0) },
      { key: "scans", label: "Scans", count: Number(scans[0]?.count ?? 0) },
      { key: "shelfSaves", label: "Shelf saves", count: Number(shelfSaves[0]?.count ?? 0) },
      { key: "checkouts", label: "Checkout starts", count: Number(checkouts[0]?.count ?? 0) },
      { key: "checkoutAbandoned", label: "Checkout abandoned", count: Number(checkoutAbandoned[0]?.count ?? 0) },
      { key: "recoveryClicks", label: "Recovery clicks", count: Number(recoveryClicks[0]?.count ?? 0) },
      { key: "recoveryDismissals", label: "Recovery dismissed", count: Number(recoveryDismissals[0]?.count ?? 0) },
      {
        key: "subscriptions",
        label: "Subscriptions",
        count: Number(subscriptions[0]?.count ?? 0),
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
    const truncLiteral = sql.raw(`'${granularity}'`);
    const bucket = (col: Parameters<typeof gte>[0]) =>
      sql<string>`to_char(date_trunc(${truncLiteral}, ${col}), 'YYYY-MM-DD')`;
    const bucketGroup = (col: Parameters<typeof gte>[0]) =>
      sql`date_trunc(${truncLiteral}, ${col})`;
    const sinceFilter = (col: Parameters<typeof gte>[0]) =>
      since ? gte(col, since) : sql`true`;

    const [signupRows, scanRows, shelfRows, checkoutRows, abandonedRows, recoveryClickRows, recoveryDismissalRows, subRows] =
      await Promise.all([
        db
          .select({
            date: bucket(usersTable.createdAt).as("date"),
            count: count(),
          })
          .from(usersTable)
          .where(sinceFilter(usersTable.createdAt))
          .groupBy(bucketGroup(usersTable.createdAt))
          .orderBy(bucketGroup(usersTable.createdAt)),

        db
          .select({
            date: bucket(scanEventsTable.createdAt).as("date"),
            count: countDistinct(scanEventsTable.userId),
          })
          .from(scanEventsTable)
          .where(
            and(
              sql`${scanEventsTable.userId} IS NOT NULL`,
              sinceFilter(scanEventsTable.createdAt),
            ),
          )
          .groupBy(bucketGroup(scanEventsTable.createdAt))
          .orderBy(bucketGroup(scanEventsTable.createdAt)),

        db
          .select({
            date: bucket(shelfProductsTable.addedAt).as("date"),
            count: countDistinct(shelfProductsTable.userId),
          })
          .from(shelfProductsTable)
          .where(sinceFilter(shelfProductsTable.addedAt))
          .groupBy(bucketGroup(shelfProductsTable.addedAt))
          .orderBy(bucketGroup(shelfProductsTable.addedAt)),

        db
          .select({
            date: bucket(checkoutEventsTable.createdAt).as("date"),
            count: countDistinct(checkoutEventsTable.userId),
          })
          .from(checkoutEventsTable)
          .where(sinceFilter(checkoutEventsTable.createdAt))
          .groupBy(bucketGroup(checkoutEventsTable.createdAt))
          .orderBy(bucketGroup(checkoutEventsTable.createdAt)),

        db
          .select({
            date: bucket(checkoutAbandonmentEventsTable.createdAt).as("date"),
            count: countDistinct(checkoutAbandonmentEventsTable.userId),
          })
          .from(checkoutAbandonmentEventsTable)
          .where(sinceFilter(checkoutAbandonmentEventsTable.createdAt))
          .groupBy(bucketGroup(checkoutAbandonmentEventsTable.createdAt))
          .orderBy(bucketGroup(checkoutAbandonmentEventsTable.createdAt)),

        db
          .select({
            date: bucket(checkoutRecoveryEventsTable.createdAt).as("date"),
            count: countDistinct(checkoutRecoveryEventsTable.userId),
          })
          .from(checkoutRecoveryEventsTable)
          .where(
            and(
              eq(checkoutRecoveryEventsTable.action, "click"),
              sinceFilter(checkoutRecoveryEventsTable.createdAt),
            ),
          )
          .groupBy(bucketGroup(checkoutRecoveryEventsTable.createdAt))
          .orderBy(bucketGroup(checkoutRecoveryEventsTable.createdAt)),

        db
          .select({
            date: bucket(checkoutRecoveryEventsTable.createdAt).as("date"),
            count: countDistinct(checkoutRecoveryEventsTable.userId),
          })
          .from(checkoutRecoveryEventsTable)
          .where(
            and(
              eq(checkoutRecoveryEventsTable.action, "dismissed"),
              sinceFilter(checkoutRecoveryEventsTable.createdAt),
            ),
          )
          .groupBy(bucketGroup(checkoutRecoveryEventsTable.createdAt))
          .orderBy(bucketGroup(checkoutRecoveryEventsTable.createdAt)),

        db
          .select({
            date: bucket(subscriptionEventsTable.createdAt).as("date"),
            count: countDistinct(subscriptionEventsTable.userId),
          })
          .from(subscriptionEventsTable)
          .where(
            and(
              sql`${subscriptionEventsTable.status} IN ('active', 'trialing')`,
              sinceFilter(subscriptionEventsTable.createdAt),
            ),
          )
          .groupBy(bucketGroup(subscriptionEventsTable.createdAt))
          .orderBy(bucketGroup(subscriptionEventsTable.createdAt)),
      ]);

    type BucketCounts = { signups: number; scans: number; shelfSaves: number; checkouts: number; checkoutAbandoned: number; recoveryClicks: number; recoveryDismissals: number; subscriptions: number };
    const emptyBucket = (): BucketCounts => ({ signups: 0, scans: 0, shelfSaves: 0, checkouts: 0, checkoutAbandoned: 0, recoveryClicks: 0, recoveryDismissals: 0, subscriptions: 0 });

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
