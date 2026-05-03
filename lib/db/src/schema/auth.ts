import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  plan: varchar("plan").notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  acceptedContributions: integer("accepted_contributions").notNull().default(0),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  emailVerified: boolean("email_verified").notNull().default(false),
  recipesSeenAt: timestamp("recipes_seen_at", { withTimezone: true }),
  // Latest legal-terms version this user accepted, mirrored from
  // legal_consents for cheap server-side gating (#101). Null for users who
  // signed up before consent was tracked server-side.
  acceptedTermsVersion: varchar("accepted_terms_version", { length: 32 }),
  acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true }),
  // Mirror of the latest Stripe subscription status for this user (e.g.
  // "trialing", "active", "past_due", "canceled"). Populated by
  // stripeUserSync from the subscription.* webhooks; null for users who
  // have never started a subscription. Used by the admin Users dashboard
  // to render "in trial / paid / free" without hitting Stripe per row.
  subscriptionStatus: varchar("subscription_status"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
