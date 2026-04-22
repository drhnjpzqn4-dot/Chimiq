import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Per-article thumbs up/down votes for the Discover hub. Both anonymous
 * (cookie/localStorage session id) and signed-in users can vote, but only
 * once per article. The voterKey encodes which: `user:<uuid>` or
 * `anon:<sessionId>`.
 */
export const discoverRatingsTable = pgTable(
  "discover_ratings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(), // "mistakes" | "worries"
    rating: varchar("rating", { length: 8 }).notNull(), // "up" | "down"
    comment: text("comment"),
    voterKey: varchar("voter_key", { length: 128 }).notNull(),
    userId: uuid("user_id"),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("discover_ratings_unique_voter").on(t.slug, t.kind, t.voterKey),
    index("discover_ratings_slug_kind_idx").on(t.slug, t.kind),
    index("discover_ratings_created_at_idx").on(t.createdAt),
  ],
);

export type DiscoverRating = typeof discoverRatingsTable.$inferSelect;
export type InsertDiscoverRating = typeof discoverRatingsTable.$inferInsert;
