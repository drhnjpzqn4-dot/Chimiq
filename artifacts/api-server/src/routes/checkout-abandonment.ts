import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, checkoutAbandonmentEventsTable } from "@workspace/db";
import { ipRateLimit } from "../lib/rateLimit.js";

const RecordBody = z.object({
  planType: z.string().max(32),
  source: z.string().max(64).optional(),
});

const router: IRouter = Router();

const limiter = ipRateLimit({ windowMs: 60_000, max: 10, key: "checkout-abandon" });

router.post("/checkout-abandonment", limiter, async (req, res) => {
  const userId = req.user?.id ?? null;
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const parsed = RecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload." });
    return;
  }

  const { planType, source } = parsed.data;

  try {
    await db.insert(checkoutAbandonmentEventsTable).values({
      userId,
      planType,
      source: source ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.warn({ err }, "Failed to record checkout abandonment event");
    res.status(500).json({ error: "Failed to record event." });
  }
});

export default router;
