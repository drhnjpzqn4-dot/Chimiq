import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const checkoutEventsTable = pgTable(
  "checkout_events",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    planType: varchar("plan_type", { length: 32 }).notNull(),
    source: varchar("source", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("checkout_events_user_id_idx").on(t.userId),
    index("checkout_events_created_at_idx").on(t.createdAt),
  ],
);

export type CheckoutEvent = typeof checkoutEventsTable.$inferSelect;
export type InsertCheckoutEvent = typeof checkoutEventsTable.$inferInsert;
