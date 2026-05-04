import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const checkoutRecoveryEventsTable = pgTable(
  "checkout_recovery_events",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("checkout_recovery_events_user_id_idx").on(t.userId),
    index("checkout_recovery_events_action_idx").on(t.action),
    index("checkout_recovery_events_created_at_idx").on(t.createdAt),
  ],
);

export type CheckoutRecoveryEvent = typeof checkoutRecoveryEventsTable.$inferSelect;
export type InsertCheckoutRecoveryEvent = typeof checkoutRecoveryEventsTable.$inferInsert;
