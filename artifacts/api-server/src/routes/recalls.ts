import { Router, type IRouter } from "express";
import { listRecentRecalls } from "../lib/safetyGatePoller";
import { ipRateLimit } from "../lib/rateLimit";

const router: IRouter = Router();

const readLimit = ipRateLimit({
  windowMs: 60_000,
  max: 120,
  key: "recalls-recent",
});

/**
 * GET /api/recalls/recent — last five recalls (cosmetics / Safety Gate cache).
 */
router.get("/recalls/recent", readLimit, async (_req, res) => {
  try {
    const recalls = await listRecentRecalls(5);
    res.json({ recalls });
  } catch (_err) {
    res.status(500).json({ error: "Could not load recalls." });
  }
});

export default router;
