import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./auth";

/**
 * Per-user 1–5 star ratings for products, keyed by barcode (the natural
 * product identifier across our data sources). Eligibility is enforced at the
 * API layer — the schema simply stores who-rated-what. UNIQUE(barcode, userId)
 * supports an idempotent upsert flow.
 */
export const productRatingsTable = pgTable(
  "product_ratings",
  {
    id: serial("id").primaryKey(),
    barcode: text("barcode").notNull(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("product_ratings_barcode_user_idx").on(t.barcode, t.userId),
    index("product_ratings_barcode_idx").on(t.barcode),
    check("product_ratings_stars_range", sql`${t.stars} BETWEEN 1 AND 5`),
  ],
);

export type ProductRating = typeof productRatingsTable.$inferSelect;
export type InsertProductRating = typeof productRatingsTable.$inferInsert;
