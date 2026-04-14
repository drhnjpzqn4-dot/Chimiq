import { Router, type IRouter } from "express";
import { z } from "zod";
import { flagCacheEntry } from "../lib/analysis-cache.js";

const FlagBody = z.object({
  hash: z.string().regex(/^[0-9a-f]{64}$/, "Invalid cache hash format"),
});

const router: IRouter = Router();

router.post("/analysis-cache/flag", async (req, res) => {
  const parsed = FlagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid cache hash is required." });
    return;
  }

  const { hash } = parsed.data;

  try {
    const found = await flagCacheEntry(hash);
    if (!found) {
      res.status(404).json({ error: "Cache entry not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to flag cache entry");
    res.status(500).json({ error: "Could not flag entry. Please try again." });
  }
});

export default router;
