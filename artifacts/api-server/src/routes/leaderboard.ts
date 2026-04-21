import { Router, type IRouter } from "express";
import {
  getAllTimeLeaderboard,
  getMonthlyLeaderboard,
  getUserBadges,
  resolveBestTipOfWeek,
} from "../lib/gamification.js";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res) => {
  try {
    const [allTime, monthly, bestTip] = await Promise.all([
      getAllTimeLeaderboard(25),
      getMonthlyLeaderboard(25),
      resolveBestTipOfWeek(),
    ]);
    res.json({
      allTime,
      monthly,
      bestTipOfWeek: bestTip.winner,
      bestTipWeekKey: bestTip.weekKey,
    });
  } catch (err) {
    req.log.error({ err }, "Leaderboard query failed");
    res.status(500).json({ error: "Failed to load leaderboard." });
  }
});

router.get("/badges/me", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.json({ badges: [] });
    return;
  }
  try {
    const badges = await getUserBadges(userId);
    res.json({ badges });
  } catch (err) {
    req.log.error({ err }, "Badges query failed");
    res.json({ badges: [] });
  }
});

export default router;
