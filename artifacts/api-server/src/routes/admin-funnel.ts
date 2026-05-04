import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  db,
  usersTable,
  scanEventsTable,
  shelfProductsTable,
  checkoutEventsTable,
  subscriptionEventsTable,
} from "@workspace/db";
import { sql, and, gte, count, countDistinct } from "drizzle-orm";
import { isRequestAdmin } from "../lib/admin";

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
    const [signups, scans, shelfSaves, checkouts, subscriptions] =
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
      {
        key: "subscriptions",
        label: "Subscriptions",
        count: Number(subscriptions[0]?.count ?? 0),
      },
    ];

    const funnel = steps.map((step, i) => {
      const prev = i === 0 ? step.count : steps[i - 1].count;
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

export default router;
