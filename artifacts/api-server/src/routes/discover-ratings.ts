import { Router, type IRouter } from "express";
import { z } from "zod";
import { isRequestAdmin } from "../lib/admin.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const KIND = z.enum(["mistakes", "worries"]);
const RATING = z.enum(["up", "down"]);

const SubmitRatingBody = z.object({
  slug: z.string().min(1).max(200),
  kind: KIND,
  rating: RATING,
  comment: z.string().max(500).optional(),
  sessionId: z.string().min(8).max(64).optional(),
});

function voterKeyFor(userId: string | null, sessionId: string | undefined): string | null {
  if (userId) return `user:${userId}`;
  if (sessionId) return `anon:${sessionId}`;
  return null;
}

const router: IRouter = Router();

interface DiscoverRatingRow {
  id: string;
  slug: string;
  kind: "mistakes" | "worries";
  rating: "up" | "down";
  comment: string | null;
  created_at: string;
}

// Per-IP + per-voter rate limit (#85): blunts thumbs-up/down spam. The IP
// limiter is fixed-window in-memory; the per-voter limit is enforced inline
// using the same voterKey that owns the upsert.
const discoverRatingIpLimit = ipRateLimit({
  windowMs: 60_000,
  max: 30,
  key: "discover-ratings",
});
const voterRateHits = new Map<string, { count: number; resetAt: number }>();

/**
 * Submit (or update) a thumbs up/down vote on a Discover article.
 * Idempotent per voter: re-submitting upserts the rating + optional comment.
 */
router.post("/discover/ratings", discoverRatingIpLimit, async (req, res) => {
  const parsed = SubmitRatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid rating payload." });
    return;
  }
  const { slug, kind, rating, comment, sessionId } = parsed.data;
  const userId = (req as { user?: { id?: string } }).user?.id ?? null;
  const voterKey = voterKeyFor(userId, sessionId);
  if (!voterKey) {
    res.status(400).json({
      error: "Missing voter identity. Sign in or accept the rating cookie.",
    });
    return;
  }

  // Per-voter limit: 15 writes/min keyed off the same voter identity used for
  // the upsert, so a logged-in user can't bypass via cookie rotation.
  const now = Date.now();
  const vBucket = voterRateHits.get(voterKey);
  if (!vBucket || vBucket.resetAt <= now) {
    voterRateHits.set(voterKey, { count: 1, resetAt: now + 60_000 });
  } else {
    vBucket.count += 1;
    if (vBucket.count > 15) {
      res.setHeader("Retry-After", String(Math.ceil((vBucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "You're rating too quickly. Try again in a moment." });
      return;
    }
  }
  if (voterRateHits.size > 5000) {
    for (const [k, b] of voterRateHits) if (b.resetAt <= now) voterRateHits.delete(k);
  }

  let safeComment: string | null = null;
  if (comment && comment.trim().length > 0) {
    try {
      safeComment = sanitizeText(comment, {
        fieldName: "Comment",
        maxLength: 500,
        allowEmpty: false,
      });
    } catch (err) {
      if (err instanceof SanitizationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }

  const userAgent = (req.headers["user-agent"] ?? "").toString().slice(0, 500) || null;

  try {
    const { error } = await supabaseAdmin
      .from("discover_ratings")
      .upsert(
        {
          slug,
          kind,
          rating,
          comment: safeComment,
          voter_key: voterKey,
          user_id: userId,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug,kind,voter_key" },
      );
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "discover rating insert failed");
    res.status(500).json({ error: "Could not save your rating." });
  }
});

/**
 * Aggregate counts for a single article — used to render the "X found this
 * helpful" footer after a vote.
 */
router.get("/discover/ratings/:kind/:slug", async (req, res) => {
  const kind = String(req.params.kind ?? "");
  const slug = String(req.params.slug ?? "");
  if (!KIND.safeParse(kind).success || !slug) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }
  try {
    const [upsResult, downsResult] = await Promise.all([
      supabaseAdmin
        .from("discover_ratings")
        .select("id", { head: true, count: "exact" })
        .eq("slug", slug)
        .eq("kind", kind)
        .eq("rating", "up"),
      supabaseAdmin
        .from("discover_ratings")
        .select("id", { head: true, count: "exact" })
        .eq("slug", slug)
        .eq("kind", kind)
        .eq("rating", "down"),
    ]);
    if (upsResult.error) throw upsResult.error;
    if (downsResult.error) throw downsResult.error;
    res.json({ ups: Number(upsResult.count ?? 0), downs: Number(downsResult.count ?? 0) });
  } catch (err) {
    req.log.error({ err }, "discover ratings count failed");
    res.status(500).json({ error: "Could not load ratings." });
  }
});

/**
 * Admin overview: aggregates per article + top/bottom + recent comments.
 */
router.get("/admin/discover/ratings", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  try {
    const { data: ratingRows, error: ratingError } = await supabaseAdmin
      .from("discover_ratings")
      .select("id,slug,kind,rating,comment,created_at");
    if (ratingError) throw ratingError;

    const aggregateMap = new Map<
      string,
      { slug: string; kind: "mistakes" | "worries"; ups: number; downs: number; total: number }
    >();
    for (const row of (ratingRows ?? []) as DiscoverRatingRow[]) {
      const key = `${row.kind}:${row.slug}`;
      const aggregate =
        aggregateMap.get(key) ?? { slug: row.slug, kind: row.kind, ups: 0, downs: 0, total: 0 };
      if (row.rating === "up") aggregate.ups += 1;
      if (row.rating === "down") aggregate.downs += 1;
      aggregate.total += 1;
      aggregateMap.set(key, aggregate);
    }

    const recentComments = ((ratingRows ?? []) as DiscoverRatingRow[])
      .filter((row) => row.comment != null && row.comment.trim().length > 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        kind: row.kind,
        rating: row.rating,
        comment: row.comment,
        createdAt: new Date(row.created_at).toISOString(),
      }));

    res.json({ aggregates: Array.from(aggregateMap.values()), recentComments });
  } catch (err) {
    req.log.error({ err }, "admin discover ratings load failed");
    res.status(500).json({ error: "Could not load ratings." });
  }
});

export default router;
