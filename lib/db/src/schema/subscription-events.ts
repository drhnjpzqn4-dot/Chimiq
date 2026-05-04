import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const subscriptionEventsTable = pgTable(
  "subscription_events",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    stripeCustomerId: varchar("stripe_customer_id").notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscription_events_user_id_idx").on(t.userId),
    index("subscription_events_created_at_idx").on(t.createdAt),
    index("subscription_events_status_idx").on(t.status),
  ],
);

export type SubscriptionEvent = typeof subscriptionEventsTable.$inferSelect;
export type InsertSubscriptionEvent = typeof subscriptionEventsTable.$inferInsert;
