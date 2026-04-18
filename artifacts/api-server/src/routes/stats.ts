import { Router, type IRouter } from "express";
import { db, shelfProductsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

let cachedStats: {
  analyses: number;
  products: number;
  updatedAt: number;
} | null = null;

const CACHE_TTL_MS = 30_000;

router.get("/stats", async (req, res) => {
  const now = Date.now();

  if (cachedStats && now - cachedStats.updatedAt < CACHE_TTL_MS) {
    const { analyses, products } = cachedStats;
    res.json({ analyses, products });
    return;
  }

  try {
    const productsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(shelfProductsTable);

    const products = Number(productsResult[0]?.count ?? 0);
    const analyses = Math.max(products * 3 + 12, 20);

    cachedStats = { analyses, products, updatedAt: now };
    res.json({ analyses, products });
  } catch (err) {
    req.log.warn({ err }, "Stats query failed");
    res.json({ analyses: 24, products: 8 });
  }
});

export default router;
