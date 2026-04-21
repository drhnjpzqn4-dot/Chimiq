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
import { usersTable } from "./auth";

export const badgesTable = pgTable("badges", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🏅"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadgesTable = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    badgeId: varchar("badge_id")
      .notNull()
      .references(() => badgesTable.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    weekKey: varchar("week_key"),
  },
  (t) => [
    uniqueIndex("user_badges_unique_idx").on(t.userId, t.badgeId),
    index("user_badges_user_idx").on(t.userId),
  ],
);

export const tipsTable = pgTable(
  "tips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: varchar("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    hidden: integer("hidden").notNull().default(0),
  },
  (t) => [
    index("tips_created_at_idx").on(t.createdAt),
    index("tips_author_idx").on(t.authorId),
  ],
);

export const tipVotesTable = pgTable(
  "tip_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipId: uuid("tip_id")
      .notNull()
      .references(() => tipsTable.id, { onDelete: "cascade" }),
    voterId: varchar("voter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tip_votes_unique_idx").on(t.tipId, t.voterId),
    index("tip_votes_tip_idx").on(t.tipId),
  ],
);

export const tipWinnersTable = pgTable("tip_winners", {
  weekKey: varchar("week_key").primaryKey(),
  tipId: uuid("tip_id")
    .notNull()
    .references(() => tipsTable.id, { onDelete: "cascade" }),
  winnerUserId: varchar("winner_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  voteCount: integer("vote_count").notNull(),
  premiumGranted: integer("premium_granted").notNull().default(0),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Badge = typeof badgesTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
export type Tip = typeof tipsTable.$inferSelect;
export type TipVote = typeof tipVotesTable.$inferSelect;
export type TipWinner = typeof tipWinnersTable.$inferSelect;

// Single source of truth for badge catalog. Keep in sync with the
// evaluator in `artifacts/api-server/src/lib/gamification.ts` and the
// "How rewards work" UI explainer. Re-exported via `BADGE_CATALOG_SEED`
// so the post-merge setup script can seed it idempotently.
export const BADGE_CATALOG_SEED = [
  {
    id: "first_scan",
    title: "First Scan",
    description: "Submitted your first accepted contribution.",
    emoji: "🌱",
    sortOrder: 10,
  },
  {
    id: "ten_products",
    title: "10 Products",
    description: "10 accepted contributions and counting.",
    emoji: "🔟",
    sortOrder: 20,
  },
  {
    id: "thirty_products",
    title: "30 Products",
    description: "30 accepted contributions — earned a free month of Premium.",
    emoji: "⭐",
    sortOrder: 30,
  },
  {
    id: "hundred_products",
    title: "100 Products",
    description: "100 accepted contributions. You are a database hero.",
    emoji: "💎",
    sortOrder: 40,
  },
  {
    id: "top_ten_month",
    title: "Top 10 This Month",
    description: "Finished a calendar month inside the top 10 contributors.",
    emoji: "🏆",
    sortOrder: 50,
  },
  {
    id: "verified_tipster",
    title: "Verified Tipster",
    description: "Your tip won Best Tip of the Week — earned a free month of Premium.",
    emoji: "✨",
    sortOrder: 60,
  },
] as const;

export type BadgeCatalogId = (typeof BADGE_CATALOG_SEED)[number]["id"];
