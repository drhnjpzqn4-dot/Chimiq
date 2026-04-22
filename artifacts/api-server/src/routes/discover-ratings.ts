import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, discoverRatingsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { isRequestAdmin } from "../lib/admin.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";

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

/**
 * Submit (or update) a thumbs up/down vote on a Discover article.
 * Idempotent per voter: re-submitting upserts the rating + optional comment.
 */
router.post("/discover/ratings", async (req, res) => {
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
    await db
      .insert(discoverRatingsTable)
      .values({
        slug,
        kind,
        rating,
        comment: safeComment,
        voterKey,
        userId,
        userAgent,
      })
      .onConflictDoUpdate({
        target: [
          discoverRatingsTable.slug,
          discoverRatingsTable.kind,
          discoverRatingsTable.voterKey,
        ],
        set: {
          rating,
          comment: safeComment,
          updatedAt: new Date(),
        },
      });
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
    const [row] = await db
      .select({
        ups: sql<number>`count(*) FILTER (WHERE rating = 'up')::int`,
        downs: sql<number>`count(*) FILTER (WHERE rating = 'down')::int`,
      })
      .from(discoverRatingsTable)
      .where(and(eq(discoverRatingsTable.slug, slug), eq(discoverRatingsTable.kind, kind)));
    res.json({ ups: Number(row?.ups ?? 0), downs: Number(row?.downs ?? 0) });
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
    const aggregates = await db
      .select({
        slug: discoverRatingsTable.slug,
        kind: discoverRatingsTable.kind,
        ups: sql<number>`count(*) FILTER (WHERE rating = 'up')::int`,
        downs: sql<number>`count(*) FILTER (WHERE rating = 'down')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(discoverRatingsTable)
      .groupBy(discoverRatingsTable.slug, discoverRatingsTable.kind);

    const recentComments = await db
      .select({
        id: discoverRatingsTable.id,
        slug: discoverRatingsTable.slug,
        kind: discoverRatingsTable.kind,
        rating: discoverRatingsTable.rating,
        comment: discoverRatingsTable.comment,
        createdAt: discoverRatingsTable.createdAt,
      })
      .from(discoverRatingsTable)
      .where(sql`${discoverRatingsTable.comment} IS NOT NULL AND length(${discoverRatingsTable.comment}) > 0`)
      .orderBy(desc(discoverRatingsTable.createdAt))
      .limit(50);

    res.json({ aggregates, recentComments });
  } catch (err) {
    req.log.error({ err }, "admin discover ratings load failed");
    res.status(500).json({ error: "Could not load ratings." });
  }
});

export default router;
