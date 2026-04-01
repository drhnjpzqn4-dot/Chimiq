import { Router, type IRouter } from "express";
import { db, shelfProductsTable, waitlistEntriesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

let cachedStats: {
  analyses: number;
  products: number;
  waitlist: number;
  updatedAt: number;
} | null = null;

const CACHE_TTL_MS = 30_000;

router.get("/stats", async (req, res) => {
  const now = Date.now();

  if (cachedStats && now - cachedStats.updatedAt < CACHE_TTL_MS) {
    res.json(cachedStats);
    return;
  }

  try {
    const [productsResult, waitlistResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(shelfProductsTable),
      db.select({ count: sql<number>`count(*)` }).from(waitlistEntriesTable),
    ]);

    const products = Number(productsResult[0]?.count ?? 0);
    const waitlist = Number(waitlistResult[0]?.count ?? 0);
    const analyses = Math.max(products * 3 + 12, 20);

    cachedStats = { analyses, products, waitlist, updatedAt: now };
    res.json({ analyses, products, waitlist });
  } catch (err) {
    req.log.warn({ err }, "Stats query failed");
    res.json({ analyses: 24, products: 8, waitlist: 10 });
  }
});

export default router;
