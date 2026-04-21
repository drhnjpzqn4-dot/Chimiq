import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, tipsTable, tipVotesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  createTipWithRateLimit,
  listTopTipsLast30Days,
} from "../lib/gamification.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";

const TIP_BODY_MAX = 280;
const TIPS_PER_DAY_LIMIT = 5;

const PostBody = z.object({
  body: z.string().min(8).max(TIP_BODY_MAX),
});

const router: IRouter = Router();

router.get("/tips", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id ?? null;
  try {
    const tips = await listTopTipsLast30Days(userId, 30);
    res.json({ tips });
  } catch (err) {
    req.log.error({ err }, "Tips list failed");
    res.json({ tips: [] });
  }
});

router.post("/tips", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to share a tip." });
    return;
  }
  const parsed = PostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Tip must be 8–280 characters." });
    return;
  }

  let safeBody: string;
  try {
    safeBody = sanitizeText(parsed.data.body, {
      fieldName: "Tip",
      maxLength: TIP_BODY_MAX,
      minLength: 8,
    });
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Atomic rate-limit + insert in a single transaction with a per-user
  // advisory lock — closes the read-then-insert race window.
  try {
    const result = await createTipWithRateLimit(
      userId,
      safeBody,
      TIPS_PER_DAY_LIMIT,
      24 * 3600 * 1000,
    );
    if (!result.ok) {
      res.status(429).json({
        error: `You can share up to ${TIPS_PER_DAY_LIMIT} tips per day. Come back tomorrow!`,
      });
      return;
    }
    res.json({ id: result.id });
  } catch (err) {
    req.log.error({ err }, "Tip create failed");
    res.status(500).json({ error: "Could not save your tip. Please try again." });
  }
});

router.post("/tips/:id/vote", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to vote." });
    return;
  }
  const { id } = req.params;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid tip ID." });
    return;
  }

  try {
    const [tip] = await db
      .select({ id: tipsTable.id, authorId: tipsTable.authorId })
      .from(tipsTable)
      .where(eq(tipsTable.id, id));
    if (!tip) {
      res.status(404).json({ error: "Tip not found." });
      return;
    }
    if (tip.authorId === userId) {
      res.status(400).json({ error: "You cannot vote for your own tip." });
      return;
    }

    await db
      .insert(tipVotesTable)
      .values({ tipId: id, voterId: userId })
      .onConflictDoNothing({
        target: [tipVotesTable.tipId, tipVotesTable.voterId],
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Tip vote failed");
    res.status(500).json({ error: "Could not record vote." });
  }
});

router.delete("/tips/:id/vote", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in to vote." });
    return;
  }
  const { id } = req.params;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid tip ID." });
    return;
  }
  try {
    await db
      .delete(tipVotesTable)
      .where(and(eq(tipVotesTable.tipId, id), eq(tipVotesTable.voterId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Tip unvote failed");
    res.status(500).json({ error: "Could not remove vote." });
  }
});

export default router;
