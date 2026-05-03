import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Audit log of admin-driven tester promo mutations made through the
 * `TesterPromoAdmin` widget (#139). Each "raise cap" or "mint new code"
 * action swaps the active Stripe promotion code on the TESTER6M coupon,
 * which is otherwise invisible after the fact — Stripe doesn't track
 * who made the change, and old promotion codes can also be edited or
 * deleted in the dashboard. Persisting our own row per change gives Pia
 * a durable trail to look back on (growth decisions, debugging "why did
 * testers stop being able to redeem?") without depending on Stripe
 * metadata sticking around.
 *
 * Action is a free-form short string ("raise_cap" | "mint") — a varchar
 * keeps us flexible if we add more admin actions later without an enum
 * migration dance, mirroring `feedback_submissions.status`.
 */
export const testerPromoChangesTable = pgTable(
  "tester_promo_changes",
  {
    id: serial("id").primaryKey(),
    action: varchar("action", { length: 16 }).notNull(),
    adminEmail: varchar("admin_email", { length: 320 }).notNull(),
    // "Old" columns are nullable because the very first recorded mint
    // may have no prior active promo to capture (e.g. the resolver
    // failed). We still want the row.
    oldCode: varchar("old_code", { length: 64 }),
    oldMaxRedemptions: integer("old_max_redemptions"),
    oldPromotionCodeId: varchar("old_promotion_code_id", { length: 64 }),
    newCode: varchar("new_code", { length: 64 }).notNull(),
    newMaxRedemptions: integer("new_max_redemptions"),
    newPromotionCodeId: varchar("new_promotion_code_id", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tester_promo_changes_created_idx").on(t.createdAt)],
);

export type TesterPromoChange = typeof testerPromoChangesTable.$inferSelect;
export type InsertTesterPromoChange =
  typeof testerPromoChangesTable.$inferInsert;
