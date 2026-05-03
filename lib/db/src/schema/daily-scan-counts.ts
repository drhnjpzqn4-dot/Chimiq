import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Per-user, per-day scan counter. One row per (user, UTC scan_date).
 *
 * Used for two things:
 *  1. Showing "X scans today" on the Scan home screen so free users feel
 *     value and have a frame of reference for the daily cap.
 *  2. Server-side enforcement of the free-tier daily limit (replacing the
 *     IP-only rate limit when a user is authenticated).
 *
 * The day boundary is UTC. We accept the small UX quirk of late-night users
 * seeing the counter reset before their local midnight in exchange for a
 * dramatically simpler implementation (no per-user timezone storage).
 */
export const dailyScanCountsTable = pgTable(
  "daily_scan_counts",
  {
    userId: varchar("user_id").notNull(),
    scanDate: date("scan_date").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.scanDate] }),
    index("daily_scan_counts_user_idx").on(t.userId),
  ],
);

export type DailyScanCount = typeof dailyScanCountsTable.$inferSelect;
export type InsertDailyScanCount = typeof dailyScanCountsTable.$inferInsert;
