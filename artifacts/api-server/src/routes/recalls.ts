import { Router, type IRouter, type Request, type Response } from "express";
import { listRecentRecalls, pollSafetyGate } from "../lib/safetyGatePoller.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import { isRequestAdmin } from "../lib/admin.js";

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

/**
 * POST /api/recalls/poll — admin-only manual trigger of the Safety Gate poller.
 * SS-083: lets us verify a feed (and any SAFETY_GATE_FEED_URL override) ingests
 * rows on demand without waiting for the 24h interval or redeploying. Returns the
 * poll result {ok, feedUrl, reason?, itemBlocks, matched, inserted}.
 */
router.post("/recalls/poll", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  try {
    const result = await pollSafetyGate();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Poll failed.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
