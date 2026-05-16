import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  createTipWithRateLimit,
  listTopTipsLast30Days,
} from "../lib/gamification.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

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
    const { data: tip, error: tipError } = await supabaseAdmin
      .from("tips")
      .select("id, author_id")
      .eq("id", id)
      .maybeSingle<{ id: string; author_id: string }>();
    if (tipError) throw tipError;
    if (!tip) {
      res.status(404).json({ error: "Tip not found." });
      return;
    }
    if (tip.author_id === userId) {
      res.status(400).json({ error: "You cannot vote for your own tip." });
      return;
    }

    const { error: voteError } = await supabaseAdmin
      .from("tip_votes")
      .upsert(
        { tip_id: id, voter_id: userId },
        { onConflict: "tip_id,voter_id", ignoreDuplicates: true },
      );
    if (voteError) throw voteError;

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
    const { error } = await supabaseAdmin
      .from("tip_votes")
      .delete()
      .eq("tip_id", id)
      .eq("voter_id", userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Tip unvote failed");
    res.status(500).json({ error: "Could not remove vote." });
  }
});

export default router;
