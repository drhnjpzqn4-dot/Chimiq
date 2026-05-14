import { BADGE_CATALOG_SEED, type BadgeCatalogId } from "@workspace/db/schema";
import { supabaseAdmin } from "./supabase-admin.js";

const PREMIUM_DURATION_DAYS = 30;
const PAGE_SIZE = 1000;

/**
 * Idempotently insert the badge catalog rows. Safe to call on every boot.
 */
let seeded = false;
export async function seedBadgeCatalog(): Promise<void> {
  if (seeded) return;
  try {
    const supabase = supabaseAdmin;
    const rows = BADGE_CATALOG_SEED.map((badge: (typeof BADGE_CATALOG_SEED)[number]) => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      emoji: badge.emoji,
      sort_order: badge.sortOrder,
    }));
    const { error } = await supabase
      .from("badges")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
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
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("user_badges")
      .upsert(
        {
          user_id: userId,
          badge_id: badgeId,
          week_key: weekKey ?? null,
        },
        {
          onConflict: "user_id,badge_id",
          ignoreDuplicates: true,
        },
      )
      .select("id");
    if (error) throw error;
    return (data?.length ?? 0) > 0;
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
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("users")
    .select("id,first_name,email,accepted_contributions")
    .gt("accepted_contributions", 0)
    .order("accepted_contributions", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    first_name: string | null;
    email: string | null;
    accepted_contributions: number;
  }>;

  return rows.map((r, i) => ({
    userId: r.id,
    displayName: formatDisplayName(r.first_name, r.email),
    contributions: Number(r.accepted_contributions),
    rank: i + 1,
  }));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function aggregateApprovedContributionsSince(
  startIso: string,
  endExclusiveIso?: string,
): Promise<Map<string, number>> {
  const supabase = supabaseAdmin;
  const contributions = new Map<string, number>();
  let offset = 0;

  for (;;) {
    let query = supabase
      .from("user_submitted_products")
      .select("submitted_by,submitted_at")
      .eq("status", "approved")
      .eq("reward_granted", true)
      .gte("submitted_at", startIso)
      .order("submitted_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (endExclusiveIso) {
      query = query.lt("submitted_at", endExclusiveIso);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{ submitted_by: string | null }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!row.submitted_by) continue;
      contributions.set(row.submitted_by, (contributions.get(row.submitted_by) ?? 0) + 1);
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return contributions;
}

async function getUsersByIds(
  userIds: string[],
): Promise<Map<string, { first_name: string | null; email: string | null }>> {
  if (userIds.length === 0) return new Map();
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("users")
    .select("id,first_name,email")
    .in("id", userIds);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; first_name: string | null; email: string | null }>;
  return new Map(
    rows.map((row) => [row.id, { first_name: row.first_name, email: row.email }] as const),
  );
}

function selectBestTipByVotes(
  tips: Array<{ id: string; author_id: string; body: string; created_at: string }>,
  voteCounts: Map<string, number>,
): { id: string; author_id: string; body: string; vote_count: number } | null {
  let best: { id: string; author_id: string; body: string; vote_count: number } | null = null;
  let bestCreatedAtMs = Number.POSITIVE_INFINITY;

  for (const tip of tips) {
    const votes = voteCounts.get(tip.id) ?? 0;
    if (votes <= 0) continue;
    const createdAtMs = new Date(tip.created_at).getTime();
    if (!best || votes > best.vote_count || (votes === best.vote_count && createdAtMs < bestCreatedAtMs)) {
      best = {
        id: tip.id,
        author_id: tip.author_id,
        body: tip.body,
        vote_count: votes,
      };
      bestCreatedAtMs = createdAtMs;
    }
  }
  return best;
}

async function listTipsCreatedBetween(
  startIso: string,
  endIso: string,
): Promise<Array<{ id: string; author_id: string; body: string; created_at: string }>> {
  const supabase = supabaseAdmin;
  const tips: Array<{ id: string; author_id: string; body: string; created_at: string }> = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("tips")
      .select("id,author_id,body,created_at")
      .eq("hidden", 0)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      author_id: string;
      body: string;
      created_at: string;
    }>;
    if (rows.length === 0) break;
    tips.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return tips;
}

async function countVotesForTipIdsUntil(
  tipIds: string[],
  endIso: string,
): Promise<Map<string, number>> {
  const supabase = supabaseAdmin;
  const voteCounts = new Map<string, number>();
  if (tipIds.length === 0) return voteCounts;

  for (const tipIdChunk of chunkArray(tipIds, 200)) {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("tip_votes")
        .select("tip_id")
        .in("tip_id", tipIdChunk)
        .lt("created_at", endIso)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ tip_id: string }>;
      if (rows.length === 0) break;
      for (const row of rows) {
        voteCounts.set(row.tip_id, (voteCounts.get(row.tip_id) ?? 0) + 1);
      }
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return voteCounts;
}

async function computeTipStats(
  tipIds: string[],
  viewerId: string | null,
): Promise<{ voteCounts: Map<string, number>; viewerVoted: Set<string> }> {
  const supabase = supabaseAdmin;
  const voteCounts = new Map<string, number>();
  const viewerVoted = new Set<string>();
  if (tipIds.length === 0) return { voteCounts, viewerVoted };

  for (const tipIdChunk of chunkArray(tipIds, 200)) {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("tip_votes")
        .select("tip_id,voter_id")
        .in("tip_id", tipIdChunk)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ tip_id: string; voter_id: string }>;
      if (rows.length === 0) break;
      for (const row of rows) {
        voteCounts.set(row.tip_id, (voteCounts.get(row.tip_id) ?? 0) + 1);
        if (viewerId && row.voter_id === viewerId) {
          viewerVoted.add(row.tip_id);
        }
      }
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return { voteCounts, viewerVoted };
}

async function listTipsSince(sinceIso: string): Promise<
  Array<{ id: string; body: string; created_at: string; author_id: string }>
> {
  const supabase = supabaseAdmin;
  const tips: Array<{ id: string; body: string; created_at: string; author_id: string }> = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("tips")
      .select("id,body,created_at,author_id")
      .eq("hidden", 0)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      body: string;
      created_at: string;
      author_id: string;
    }>;
    if (rows.length === 0) break;
    tips.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return tips;
}

type CreateTipRateLimitRpcResult =
  | { ok: true; id: string }
  | { ok: false; reason: "rate_limited"; recent: number };

function parseCreateTipRateLimitRpcResult(value: unknown): CreateTipRateLimitRpcResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("create_tip_with_rate_limit RPC returned invalid payload");
  }

  const record = value as Record<string, unknown>;
  if (record.ok === true && typeof record.id === "string") {
    return { ok: true, id: record.id };
  }
  if (record.ok === false && record.reason === "rate_limited") {
    const recent = typeof record.recent === "number" ? record.recent : Number(record.recent ?? 0);
    return { ok: false, reason: "rate_limited", recent: Number.isFinite(recent) ? recent : 0 };
  }

  throw new Error("create_tip_with_rate_limit RPC returned unexpected shape");
}

export async function getMonthlyLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const contributionMap = await aggregateApprovedContributionsSince(startOfMonth.toISOString());
  const ranked = Array.from(contributionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const users = await getUsersByIds(ranked.map(([userId]) => userId));

  return ranked.map(([userId, contributions], i) => ({
    userId,
    displayName: formatDisplayName(
      users.get(userId)?.first_name ?? null,
      users.get(userId)?.email ?? null,
    ),
    contributions,
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
  const supabase = supabaseAdmin;

  const { data: existing, error: existingError } = await supabase
    .from("tip_winners")
    .select("week_key,tip_id,winner_user_id,vote_count")
    .eq("week_key", lastWeekKey)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const summary = await loadTipWinnerSummary(
      existing.tip_id,
      existing.week_key,
      Number(existing.vote_count),
    );
    return { weekKey: lastWeekKey, winner: summary, newlyResolved: false };
  }

  const tips = await listTipsCreatedBetween(startLastWeek.toISOString(), endLastWeek.toISOString());
  const voteCounts = await countVotesForTipIdsUntil(
    tips.map((tip) => tip.id),
    endLastWeek.toISOString(),
  );
  const top = selectBestTipByVotes(tips, voteCounts);
  if (!top) {
    return { weekKey: lastWeekKey, winner: null, newlyResolved: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("tip_winners")
    .upsert(
      {
        week_key: lastWeekKey,
        tip_id: top.id,
        winner_user_id: top.author_id,
        vote_count: Number(top.vote_count),
      },
      {
        onConflict: "week_key",
        ignoreDuplicates: true,
      },
    )
    .select("week_key");
  if (insertError) throw insertError;

  if ((inserted?.length ?? 0) === 0) {
    const { data: persisted, error: persistedError } = await supabase
      .from("tip_winners")
      .select("tip_id,vote_count")
      .eq("week_key", lastWeekKey)
      .maybeSingle();
    if (persistedError) throw persistedError;
    if (!persisted) return { weekKey: lastWeekKey, winner: null, newlyResolved: false };
    const summary = await loadTipWinnerSummary(
      persisted.tip_id,
      lastWeekKey,
      Number(persisted.vote_count),
    );
    return { weekKey: lastWeekKey, winner: summary, newlyResolved: false };
  }

  const grantUntil = new Date();
  grantUntil.setUTCDate(grantUntil.getUTCDate() + PREMIUM_DURATION_DAYS);

  const { data: winnerUser, error: userReadError } = await supabase
    .from("users")
    .select("premium_until")
    .eq("id", top.author_id)
    .maybeSingle();
  if (userReadError) throw userReadError;
  const existingPremium = winnerUser?.premium_until
    ? new Date(winnerUser.premium_until as string)
    : null;
  const premiumUntil =
    existingPremium && existingPremium.getTime() > grantUntil.getTime()
      ? existingPremium
      : grantUntil;
  const { error: userUpdateError } = await supabase
    .from("users")
    .update({ premium_until: premiumUntil.toISOString() })
    .eq("id", top.author_id);
  if (userUpdateError) throw userUpdateError;

  await awardBadgeOnce(top.author_id, "verified_tipster", lastWeekKey);

  const { error: grantFlagError } = await supabase
    .from("tip_winners")
    .update({ premium_granted: 1 })
    .eq("week_key", lastWeekKey);
  if (grantFlagError) throw grantFlagError;

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
  const supabase = supabaseAdmin;
  const { data: tip, error: tipError } = await supabase
    .from("tips")
    .select("id,body,author_id")
    .eq("id", tipId)
    .maybeSingle();
  if (tipError) throw tipError;
  if (!tip) return null;
  const { data: author, error: authorError } = await supabase
    .from("users")
    .select("first_name,email")
    .eq("id", tip.author_id)
    .maybeSingle();
  if (authorError) throw authorError;
  return {
    weekKey,
    tipId: tip.id,
    body: tip.body,
    voteCount,
    authorDisplayName: formatDisplayName(author?.first_name ?? null, author?.email ?? null),
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
  const tips = await listTipsSince(since.toISOString());
  if (tips.length === 0) return [];

  const { voteCounts, viewerVoted } = await computeTipStats(
    tips.map((tip) => tip.id),
    viewerId,
  );
  const ranked = tips
    .map((tip) => ({
      ...tip,
      vote_count: voteCounts.get(tip.id) ?? 0,
      viewer_voted: viewerVoted.has(tip.id),
    }))
    .sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  const users = await getUsersByIds(Array.from(new Set(ranked.map((tip) => tip.author_id))));

  return ranked.map((tip) => {
    const author = users.get(tip.author_id);
    return {
      id: tip.id,
      body: tip.body,
      createdAt: new Date(tip.created_at).toISOString(),
      authorId: tip.author_id,
      authorDisplayName: formatDisplayName(
        author?.first_name ?? null,
        author?.email ?? null,
      ),
      voteCount: Number(tip.vote_count),
      viewerHasVoted: tip.viewer_voted,
    };
  });
}

export async function countTipsByAuthorSince(
  authorId: string,
  since: Date,
): Promise<number> {
  const supabase = supabaseAdmin;
  const { count, error } = await supabase
    .from("tips")
    .select("id", { head: true, count: "exact" })
    .eq("author_id", authorId)
    .gte("created_at", since.toISOString());
  if (error) throw error;
  return count ?? 0;
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
  const supabase = supabaseAdmin;
  const { data, error } = await supabase.rpc("create_tip_with_rate_limit", {
    p_author_id: authorId,
    p_body: body,
    p_limit: limit,
    p_window_ms: Math.trunc(windowMs),
  });
  if (error) throw error;
  return parseCreateTipRateLimitRpcResult(data);
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

  const supabase = supabaseAdmin;
  const { data: claimed, error: claimedError } = await supabase
    .from("monthly_top_ten_resolutions")
    .upsert(
      {
        month_key: monthKey,
        award_count: 0,
      },
      {
        onConflict: "month_key",
        ignoreDuplicates: true,
      },
    )
    .select("month_key");
  if (claimedError) throw claimedError;
  if ((claimed?.length ?? 0) === 0) return null;

  const contributionMap = await aggregateApprovedContributionsSince(
    startLastMonth.toISOString(),
    endLastMonth.toISOString(),
  );
  const winners = Array.from(contributionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let awarded = 0;
  for (const [winnerUserId] of winners) {
    const won = await awardBadgeOnce(winnerUserId, "top_ten_month", monthKey);
    if (won) awarded += 1;
  }

  const { error: updateError } = await supabase
    .from("monthly_top_ten_resolutions")
    .update({ award_count: awarded })
    .eq("month_key", monthKey);
  if (updateError) throw updateError;

  return monthKey;
}

// ===== User badges =====

export async function getUserBadges(userId: string): Promise<
  Array<{ id: string; title: string; description: string; emoji: string; awardedAt: string }>
> {
  const supabase = supabaseAdmin;
  const { data: awardedRows, error: awardedError } = await supabase
    .from("user_badges")
    .select("badge_id,awarded_at")
    .eq("user_id", userId);
  if (awardedError) throw awardedError;
  const awards = (awardedRows ?? []) as Array<{ badge_id: string; awarded_at: string }>;
  if (awards.length === 0) return [];

  const badgeIds = Array.from(new Set(awards.map((row) => row.badge_id)));
  const { data: badgeRows, error: badgesError } = await supabase
    .from("badges")
    .select("id,title,description,emoji,sort_order")
    .in("id", badgeIds);
  if (badgesError) throw badgesError;
  const badges = (badgeRows ?? []) as Array<{
    id: string;
    title: string;
    description: string;
    emoji: string;
    sort_order: number;
  }>;
  const badgeMap = new Map(
    badges.map((row) => [
      row.id,
      {
        title: row.title,
        description: row.description,
        emoji: row.emoji,
        sortOrder: row.sort_order,
      },
    ]),
  );

  return awards
    .map((award) => {
      const badge = badgeMap.get(award.badge_id);
      if (!badge) return null;
      return {
        id: award.badge_id,
        title: badge.title,
        description: badge.description,
        emoji: badge.emoji,
        awardedAt: new Date(award.awarded_at).toISOString(),
        sortOrder: badge.sortOrder,
      };
    })
    .filter((row): row is { id: string; title: string; description: string; emoji: string; awardedAt: string; sortOrder: number } => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      emoji: r.emoji,
      awardedAt: r.awardedAt,
    }));
}
