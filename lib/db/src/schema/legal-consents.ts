import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * Audit-trail of every Terms / Privacy / Medical-Disclaimer acceptance (#101).
 * One row is inserted each time a user accepts a (possibly new) terms version,
 * so we always have a defensible history per user — not just "did they accept
 * the latest". The user's most-recently accepted version is also mirrored on
 * `usersTable.acceptedTermsVersion` for fast gating.
 */
export const legalConsentsTable = pgTable(
  "legal_consents",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    termsVersion: varchar("terms_version", { length: 32 }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("legal_consents_user_idx").on(t.userId),
    index("legal_consents_user_version_idx").on(t.userId, t.termsVersion),
  ],
);

export type LegalConsent = typeof legalConsentsTable.$inferSelect;
export type InsertLegalConsent = typeof legalConsentsTable.$inferInsert;
