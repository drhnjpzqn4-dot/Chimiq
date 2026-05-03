import {
  pgTable,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * Audit row for the admin "Test live charge" go-live verification button
 * (#107). One row is inserted per click *before* the refund fires; when the
 * resulting `charge.refunded` webhook arrives, the handler matches it back
 * to this row by payment_intent / charge_id, marks `webhookReceivedAt`, and
 * skips the normal full-refund downgrade. The UI polls this row to confirm
 * end-to-end webhook delivery, not just endpoint configuration.
 */
export const paymentTestChargesTable = pgTable(
  "payment_test_charges",
  {
    paymentIntentId: varchar("payment_intent_id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id").notNull(),
    chargeId: varchar("charge_id"),
    refundId: varchar("refund_id"),
    livemode: varchar("livemode", { length: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    webhookReceivedAt: timestamp("webhook_received_at", { withTimezone: true }),
    webhookEventId: varchar("webhook_event_id"),
  },
  (t) => [
    index("payment_test_charges_charge_idx").on(t.chargeId),
    index("payment_test_charges_user_idx").on(t.userId),
  ],
);

export type PaymentTestCharge = typeof paymentTestChargesTable.$inferSelect;
export type InsertPaymentTestCharge =
  typeof paymentTestChargesTable.$inferInsert;
