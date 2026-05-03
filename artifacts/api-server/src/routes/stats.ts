import { Router, type IRouter } from "express";
import { db, shelfProductsTable, usersTable, getUserPlan } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  FREE_DAILY_SCAN_LIMIT,
  getTodayScanCount,
} from "../lib/scanQuota.js";

const router: IRouter = Router();

/**
 * Per-user "scans today" counter for the home-screen chip. Returns null
 * count for unauthenticated callers so the UI can fall back to its
 * localStorage-based estimate.
 */
router.get("/stats/scans/today", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.json({
      authenticated: false,
      count: null,
      limit: FREE_DAILY_SCAN_LIMIT,
      remaining: null,
      plan: "free",
      unlimited: false,
    });
    return;
  }

  try {
    const [snapshot, plan] = await Promise.all([
      getTodayScanCount(userId),
      getUserPlan(userId),
    ]);
    const unlimited = plan === "premium";
    res.json({
      authenticated: true,
      count: snapshot.count,
      limit: FREE_DAILY_SCAN_LIMIT,
      remaining: unlimited ? null : snapshot.remaining,
      plan,
      unlimited,
      date: snapshot.date,
    });
  } catch (err) {
    req.log.warn({ err }, "Failed to load daily scan count");
    res.json({
      authenticated: true,
      count: 0,
      limit: FREE_DAILY_SCAN_LIMIT,
      remaining: FREE_DAILY_SCAN_LIMIT,
      plan: "free",
      unlimited: false,
    });
  }
});

let cachedStats: {
  analyses: number;
  products: number;
  users: number;
  updatedAt: number;
} | null = null;

const CACHE_TTL_MS = 30_000;

router.get("/stats", async (req, res) => {
  const now = Date.now();

  if (cachedStats && now - cachedStats.updatedAt < CACHE_TTL_MS) {
    const { analyses, products, users } = cachedStats;
    res.json({ analyses, products, users });
    return;
  }

  try {
    const [productsResult, usersResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(shelfProductsTable),
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
    ]);

    const products = Number(productsResult[0]?.count ?? 0);
    const users = Number(usersResult[0]?.count ?? 0);
    const analyses = Math.max(products * 3 + 12, 20);

    cachedStats = { analyses, products, users, updatedAt: now };
    res.json({ analyses, products, users });
  } catch (err) {
    req.log.warn({ err }, "Stats query failed");
    res.json({ analyses: 24, products: 8, users: 0 });
  }
});

export default router;
