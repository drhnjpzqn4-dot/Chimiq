import {
  db,
  badgesTable,
  userBadgesTable,
  usersTable,
  tipWinnersTable,
  tipsTable,
  tipVotesTable,
  monthlyTopTenResolutionsTable,
  BADGE_CATALOG_SEED,
  type BadgeCatalogId,
} from "@workspace/db";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

const PREMIUM_DURATION_DAYS = 30;

/**
 * Idempotently insert the badge catalog rows. Safe to call on every boot.
 */
let seeded = false;
export async function seedBadgeCatalog(): Promise<void> {
  if (seeded) return;
  try {
    await db
      .insert(badgesTable)
      .values(BADGE_CATALOG_SEED.map((b: (typeof BADGE_CATALOG_SEED)[number]) => ({ ...b })))
      .onConflictDoNothing({ target: badgesTable.id });
    seeded = true;
  } catch {
    // best-effort; don't crash boot
  }
}

async function awardBadgeOnce(
  userId: string,
  badgeId: BadgeCatalogId,
  weekKey?: string,
): Promise<boolean> {
  try {
    const inserted = await db
      .insert(userBadgesTable)
      .values({ userId, badgeId, weekKey: weekKey ?? null })
      .onConflictDoNothing({
        target: [userBadgesTable.userId, userBadgesTable.badgeId],
      })
      .returning({ id: userBadgesTable.id });
    return inserted.length > 0;
  } catch {
    return false;
  }
}

/**
 * Evaluate count-based contribution badges for a user. Idempotent — uses
 * the unique (user_id, badge_id) constraint so duplicate calls are no-ops.
 * Returns the list of badge IDs newly awarded in THIS call.
 */
export async function evaluateContributionBadges(
  userId: string,
  newCount: number,
): Promise<BadgeCatalogId[]> {
  await seedBadgeCatalog();
  const newlyAwarded: BadgeCatalogId[] = [];
  const checks: Array<{ threshold: number; id: BadgeCatalogId }> = [
    { threshold: 1, id: "first_scan" },
    { threshold: 10, id: "ten_products" },
    { threshold: 30, id: "thirty_products" },
    { threshold: 100, id: "hundred_products" },
  ];
  for (const { threshold, id } of checks) {
    if (newCount >= threshold) {
      const won = await awardBadgeOnce(userId, id);
      if (won) newlyAwarded.push(id);
    }
  }
  return newlyAwarded;
}

// ===== Leaderboard =====

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  contributions: number;
  rank: number;
}

export async function getAllTimeLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      userId: usersTable.id,
      firstName: usersTable.firstName,
      email: usersTable.email,
      contributions: usersTable.acceptedContributions,
    })
    .from(usersTable)
    .where(sql`${usersTable.acceptedContributions} > 0`)
    .orderBy(desc(usersTable.acceptedContributions))
    .limit(limit);

  return rows.map((r, i) => ({
    userId: r.userId,
    displayName: formatDisplayName(r.firstName, r.email),
    contributions: r.contributions,
    rank: i + 1,
  }));
}

export async function getMonthlyLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  // Computed from approved submissions in the current calendar month.
  // Cheap: indexed scan on user_submitted_products by status, filtered in
  // memory by month — table is small (<10k expected) at this stage.
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const rows = await db.execute(sql`
    SELECT
      u.id          AS user_id,
      u.first_name  AS first_name,
      u.email       AS email,
      COUNT(*)::int AS contributions
    FROM user_submitted_products p
    JOIN users u ON u.id = p.submitted_by
    WHERE p.status = 'approved'
      AND p.reward_granted = true
      AND p.submitted_at >= ${startOfMonth.toISOString()}
    GROUP BY u.id, u.first_name, u.email
    ORDER BY contributions DESC
    LIMIT ${limit}
  `);

  return (rows.rows as Array<{
    user_id: string;
    first_name: string | null;
    email: string | null;
    contributions: number;
  }>).map((r, i) => ({
    userId: r.user_id,
    displayName: formatDisplayName(r.first_name, r.email),
    contributions: Number(r.contributions),
    rank: i + 1,
  }));
}

function formatDisplayName(firstName: string | null, email: string | null): string {
  if (firstName && firstName.trim().length > 0) return firstName.trim();
  if (email && email.includes("@")) {
    const handle = email.split("@")[0];
    if (handle.length <= 2) return `${handle}***`;
    return `${handle.slice(0, 2)}${"*".repeat(Math.min(6, handle.length - 2))}`;
  }
  return "Anonymous";
}

// ===== Best Tip of the Week =====

/**
 * Return ISO week key for a date, e.g. "2026-W17". Used to lock-in winners.
 */
export function isoWeekKey(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function startOfIsoWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - dayNum);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Resolve and (if needed) finalize Best Tip of the Week for the PREVIOUS
 * ISO week. Idempotent — uses tip_winners primary key as the lock. If a
 * winner is locked in for the first time, grants 30-day Premium and the
 * "verified_tipster" badge. Computed on read; no cron required.
 */
export async function resolveBestTipOfWeek(now: Date = new Date()): Promise<{
  weekKey: string | null;
  winner: TipWinnerSummary | null;
  newlyResolved: boolean;
}> {
  await seedBadgeCatalog();

  const startThisWeek = startOfIsoWeek(now);
  const endLastWeek = startThisWeek;
  const startLastWeek = new Date(endLastWeek.getTime() - 7 * 24 * 3600 * 1000);
  const lastWeekKey = isoWeekKey(new Date(startLastWeek.getTime() + 24 * 3600 * 1000));

  // Already resolved?
  const [existing] = await db
    .select({
      weekKey: tipWinnersTable.weekKey,
      tipId: tipWinnersTable.tipId,
      winnerUserId: tipWinnersTable.winnerUserId,
      voteCount: tipWinnersTable.voteCount,
    })
    .from(tipWinnersTable)
    .where(eq(tipWinnersTable.weekKey, lastWeekKey));

  if (existing) {
    const summary = await loadTipWinnerSummary(existing.tipId, existing.weekKey, existing.voteCount);
    return { weekKey: lastWeekKey, winner: summary, newlyResolved: false };
  }

  // Find top tip from last week (most votes, ties broken by oldest).
  // CRITICAL: only count votes cast WITHIN the target week so late votes
  // never change a finalized previous-week winner. Computed-on-read
  // semantics demand vote_count be deterministic at any future read time.
  const candidates = await db.execute(sql`
    SELECT t.id, t.author_id, t.body, COUNT(v.id)::int AS vote_count
    FROM tips t
    LEFT JOIN tip_votes v
      ON v.tip_id = t.id
     AND v.created_at <  ${endLastWeek.toISOString()}
    WHERE t.created_at >= ${startLastWeek.toISOString()}
      AND t.created_at <  ${endLastWeek.toISOString()}
      AND t.hidden = 0
    GROUP BY t.id, t.author_id, t.body
    HAVING COUNT(v.id) > 0
    ORDER BY vote_count DESC, t.created_at ASC
    LIMIT 1
  `);

  const top = candidates.rows[0] as
    | { id: string; author_id: string; body: string; vote_count: number }
    | undefined;
  if (!top) {
    return { weekKey: lastWeekKey, winner: null, newlyResolved: false };
  }

  // Insert winner with weekKey as PK lock; if another worker raced us, abort.
  const inserted = await db
    .insert(tipWinnersTable)
    .values({
      weekKey: lastWeekKey,
      tipId: top.id,
      winnerUserId: top.author_id,
      voteCount: Number(top.vote_count),
    })
    .onConflictDoNothing({ target: tipWinnersTable.weekKey })
    .returning({ weekKey: tipWinnersTable.weekKey });

  if (inserted.length === 0) {
    // Another worker won the race. Re-read the persisted winner row so we
    // never return a locally-computed (and possibly stale) `top` instead.
    const [persisted] = await db
      .select({
        tipId: tipWinnersTable.tipId,
        voteCount: tipWinnersTable.voteCount,
      })
      .from(tipWinnersTable)
      .where(eq(tipWinnersTable.weekKey, lastWeekKey));
    if (!persisted) return { weekKey: lastWeekKey, winner: null, newlyResolved: false };
    const summary = await loadTipWinnerSummary(persisted.tipId, lastWeekKey, persisted.voteCount);
    return { weekKey: lastWeekKey, winner: summary, newlyResolved: false };
  }

  // Grant rewards. Premium grant uses MAX(existing, +30d) to never shrink it.
  const grantUntil = new Date();
  grantUntil.setUTCDate(grantUntil.getUTCDate() + PREMIUM_DURATION_DAYS);
  await db
    .update(usersTable)
    .set({
      premiumUntil: sql`GREATEST(COALESCE(${usersTable.premiumUntil}, NOW()), ${grantUntil.toISOString()}::timestamptz)`,
    })
    .where(eq(usersTable.id, top.author_id));

  await awardBadgeOnce(top.author_id, "verified_tipster", lastWeekKey);

  await db
    .update(tipWinnersTable)
    .set({ premiumGranted: 1 })
    .where(eq(tipWinnersTable.weekKey, lastWeekKey));

  const summary = await loadTipWinnerSummary(top.id, lastWeekKey, Number(top.vote_count));
  return { weekKey: lastWeekKey, winner: summary, newlyResolved: true };
}

export interface TipWinnerSummary {
  weekKey: string;
  tipId: string;
  body: string;
  voteCount: number;
  authorDisplayName: string;
}

async function loadTipWinnerSummary(
  tipId: string,
  weekKey: string,
  voteCount: number,
): Promise<TipWinnerSummary | null> {
  const [tip] = await db
    .select({
      id: tipsTable.id,
      body: tipsTable.body,
      authorId: tipsTable.authorId,
    })
    .from(tipsTable)
    .where(eq(tipsTable.id, tipId));
  if (!tip) return null;
  const [author] = await db
    .select({ firstName: usersTable.firstName, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, tip.authorId));
  return {
    weekKey,
    tipId: tip.id,
    body: tip.body,
    voteCount,
    authorDisplayName: formatDisplayName(author?.firstName ?? null, author?.email ?? null),
  };
}

// ===== Tips Feed =====

export interface TipFeedItem {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorDisplayName: string;
  voteCount: number;
  viewerHasVoted: boolean;
}

export async function listTopTipsLast30Days(
  viewerId: string | null,
  limit = 30,
): Promise<TipFeedItem[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const rows = await db.execute(sql`
    SELECT
      t.id, t.body, t.created_at, t.author_id,
      COUNT(v.id)::int AS vote_count,
      ${viewerId ? sql`bool_or(v.voter_id = ${viewerId})` : sql`false`} AS viewer_voted
    FROM tips t
    LEFT JOIN tip_votes v ON v.tip_id = t.id
    WHERE t.created_at >= ${since.toISOString()}
      AND t.hidden = 0
    GROUP BY t.id
    ORDER BY vote_count DESC, t.created_at DESC
    LIMIT ${limit}
  `);

  const items = rows.rows as Array<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    vote_count: number;
    viewer_voted: boolean | null;
  }>;
  if (items.length === 0) return [];

  const authorIds = Array.from(new Set(items.map((r) => r.author_id)));
  const authors = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(inArray(usersTable.id, authorIds));
  const authorMap = new Map(authors.map((a) => [a.id, a] as const));

  return items.map((r) => {
    const author = authorMap.get(r.author_id);
    return {
      id: r.id,
      body: r.body,
      createdAt: new Date(r.created_at).toISOString(),
      authorId: r.author_id,
      authorDisplayName: formatDisplayName(
        author?.firstName ?? null,
        author?.email ?? null,
      ),
      voteCount: Number(r.vote_count),
      viewerHasVoted: !!r.viewer_voted,
    };
  });
}

export async function countTipsByAuthorSince(
  authorId: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tipsTable)
    .where(and(eq(tipsTable.authorId, authorId), gte(tipsTable.createdAt, since)));
  return Number(row?.c ?? 0);
}

/**
 * Atomically post a tip respecting a per-user 24h rate limit. Uses a
 * Postgres advisory lock keyed on the author so concurrent posts from
 * the same user are serialized (no read-then-insert race window). The
 * lock auto-releases at transaction end.
 *
 * Returns:
 *  - { ok: true, id }  on success
 *  - { ok: false, reason: "rate_limited", recent } when the cap is hit
 */
export async function createTipWithRateLimit(
  authorId: string,
  body: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true; id: string } | { ok: false; reason: "rate_limited"; recent: number }> {
  const since = new Date(Date.now() - windowMs);
  // Stable 64-bit key derived from the author id; pg_advisory_xact_lock
  // accepts a bigint (or two ints). hashtextextended ensures uniform
  // distribution and no cross-user lock collisions for typical UUIDs.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"tips_rl:" + authorId}, 0))`);
    const [row] = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(tipsTable)
      .where(and(eq(tipsTable.authorId, authorId), gte(tipsTable.createdAt, since)));
    const recent = Number(row?.c ?? 0);
    if (recent >= limit) {
      return { ok: false as const, reason: "rate_limited" as const, recent };
    }
    const [created] = await tx
      .insert(tipsTable)
      .values({ authorId, body })
      .returning({ id: tipsTable.id });
    return { ok: true as const, id: created!.id };
  });
}

// ===== Monthly Top 10 badge =====

/**
 * Idempotently award the `top_ten_month` badge to the top-10 contributors
 * of the PREVIOUS calendar month. Computed-on-read with a row-level lock
 * via `monthly_top_ten_resolutions.month_key`. Safe to call on every
 * leaderboard read — the lock makes subsequent calls no-ops.
 *
 * Returns the month key that was just resolved (or null if already resolved
 * by an earlier call).
 */
export async function resolveTopTenMonth(now: Date = new Date()): Promise<string | null> {
  await seedBadgeCatalog();

  const startThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endLastMonth = startThisMonth;
  const startLastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const monthKey = `${startLastMonth.getUTCFullYear()}-${String(
    startLastMonth.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  // Try to claim the lock. If another worker already resolved this month,
  // the insert is a no-op and we return null.
  const claimed = await db
    .insert(monthlyTopTenResolutionsTable)
    .values({ monthKey, awardCount: 0 })
    .onConflictDoNothing({ target: monthlyTopTenResolutionsTable.monthKey })
    .returning({ monthKey: monthlyTopTenResolutionsTable.monthKey });

  if (claimed.length === 0) return null;

  // Compute top 10 contributors for the previous calendar month.
  const winners = await db.execute(sql`
    SELECT u.id AS user_id, COUNT(*)::int AS contributions
    FROM user_submitted_products p
    JOIN users u ON u.id = p.submitted_by
    WHERE p.status = 'approved'
      AND p.reward_granted = true
      AND p.submitted_at >= ${startLastMonth.toISOString()}
      AND p.submitted_at <  ${endLastMonth.toISOString()}
    GROUP BY u.id
    ORDER BY contributions DESC
    LIMIT 10
  `);

  let awarded = 0;
  for (const row of winners.rows as Array<{ user_id: string; contributions: number }>) {
    const won = await awardBadgeOnce(row.user_id, "top_ten_month", monthKey);
    if (won) awarded += 1;
  }

  await db
    .update(monthlyTopTenResolutionsTable)
    .set({ awardCount: awarded })
    .where(eq(monthlyTopTenResolutionsTable.monthKey, monthKey));

  return monthKey;
}

// ===== User badges =====

export async function getUserBadges(userId: string): Promise<
  Array<{ id: string; title: string; description: string; emoji: string; awardedAt: string }>
> {
  const rows = await db
    .select({
      id: badgesTable.id,
      title: badgesTable.title,
      description: badgesTable.description,
      emoji: badgesTable.emoji,
      awardedAt: userBadgesTable.awardedAt,
      sortOrder: badgesTable.sortOrder,
    })
    .from(userBadgesTable)
    .innerJoin(badgesTable, eq(badgesTable.id, userBadgesTable.badgeId))
    .where(eq(userBadgesTable.userId, userId));
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      emoji: r.emoji,
      awardedAt: r.awardedAt.toISOString(),
    }));
}
