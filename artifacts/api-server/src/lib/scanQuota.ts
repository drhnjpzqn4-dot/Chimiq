import { db, dailyScanCountsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

/**
 * Free-tier daily scan cap. Mirrored on the client (`Scan.tsx`'s
 * `FREE_DAILY_LIMIT`) for display, but the server is the source of truth.
 */
export const FREE_DAILY_SCAN_LIMIT = 12;

/** UTC YYYY-MM-DD for today. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ScanCountSnapshot {
  count: number;
  limit: number;
  remaining: number;
  date: string;
}

/** Read today's count for a user without mutating it. */
export async function getTodayScanCount(userId: string): Promise<ScanCountSnapshot> {
  const date = todayUtc();
  const [row] = await db
    .select({ count: dailyScanCountsTable.count })
    .from(dailyScanCountsTable)
    .where(
      and(
        eq(dailyScanCountsTable.userId, userId),
        eq(dailyScanCountsTable.scanDate, date),
      ),
    );
  const count = row?.count ?? 0;
  return {
    count,
    limit: FREE_DAILY_SCAN_LIMIT,
    remaining: Math.max(0, FREE_DAILY_SCAN_LIMIT - count),
    date,
  };
}

/**
 * Atomically increment today's counter and return the new value. Uses an
 * UPSERT so concurrent scans can't lose increments. No cap is enforced —
 * use `claimDailyScanSlot` for free-tier users.
 */
export async function incrementTodayScanCount(userId: string): Promise<number> {
  const date = todayUtc();
  const [row] = await db
    .insert(dailyScanCountsTable)
    .values({ userId, scanDate: date, count: 1 })
    .onConflictDoUpdate({
      target: [dailyScanCountsTable.userId, dailyScanCountsTable.scanDate],
      set: {
        count: sql`${dailyScanCountsTable.count} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ count: dailyScanCountsTable.count });
  return row?.count ?? 0;
}

/**
 * Atomically claim a scan slot under a daily cap. Returns the new count on
 * success, or `null` if the user is already at or above `limit`.
 *
 * The claim is a single SQL statement — the cap check and the increment
 * happen together, so concurrent requests cannot both observe `count <
 * limit` and then both increment past `limit`.
 */
export async function claimDailyScanSlot(
  userId: string,
  limit: number = FREE_DAILY_SCAN_LIMIT,
): Promise<number | null> {
  const date = todayUtc();
  // The INSERT branch only fires if no row exists for (user, date) — i.e.
  // the user has zero scans today, which is always under the cap, so the
  // implicit "count = 1" is safe.
  // The UPDATE branch fires on conflict, gated by `count < limit` so it
  // is a no-op (and returns no row) if the user has already hit the cap.
  const [row] = await db
    .insert(dailyScanCountsTable)
    .values({ userId, scanDate: date, count: 1 })
    .onConflictDoUpdate({
      target: [dailyScanCountsTable.userId, dailyScanCountsTable.scanDate],
      set: {
        count: sql`${dailyScanCountsTable.count} + 1`,
        updatedAt: new Date(),
      },
      setWhere: sql`${dailyScanCountsTable.count} < ${limit}`,
    })
    .returning({ count: dailyScanCountsTable.count });
  return row?.count ?? null;
}

/**
 * Roll back a previously-claimed slot. Used when the analyze handler
 * claimed a slot up-front but the request ultimately failed, so the user
 * isn't charged a scan for an error response. Floors at 0.
 */
export async function releaseDailyScanSlot(userId: string): Promise<void> {
  const date = todayUtc();
  await db
    .update(dailyScanCountsTable)
    .set({
      count: sql`GREATEST(${dailyScanCountsTable.count} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dailyScanCountsTable.userId, userId),
        eq(dailyScanCountsTable.scanDate, date),
      ),
    );
}
