import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, checkoutRecoveryEventsTable } from "@workspace/db";
import { ipRateLimit } from "../lib/rateLimit.js";

const RecordBody = z.object({
  action: z.enum(["click", "dismissed"]),
});

const router: IRouter = Router();

const limiter = ipRateLimit({ windowMs: 60_000, max: 10, key: "checkout-recovery" });

router.post("/checkout-recovery", limiter, async (req, res) => {
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

  const { action } = parsed.data;

  try {
    await db.insert(checkoutRecoveryEventsTable).values({
      userId,
      action,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.warn({ err }, "Failed to record checkout recovery event");
    res.status(500).json({ error: "Failed to record event." });
  }
});

export default router;
