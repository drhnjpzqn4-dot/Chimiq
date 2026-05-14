import { Router, type IRouter } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase-admin.js";
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
    const supabase = supabaseAdmin;
    const { error } = await supabase.from("checkout_abandonment_events").insert({
      user_id: userId,
      plan_type: planType,
      source: source ?? null,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.warn({ err }, "Failed to record checkout abandonment event");
    res.status(500).json({ error: "Failed to record event." });
  }
});

export default router;
