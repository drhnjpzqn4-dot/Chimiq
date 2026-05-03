import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * In-product feedback submitted via the FeedbackPrompt popup (#112).
 * Replaces the previous mailto: handoff so every response is captured for
 * the team to triage. Anonymous submissions are allowed (userId null) — the
 * popup is shown to logged-out engaged users too.
 */
export const feedbackSubmissionsTable = pgTable(
  "feedback_submissions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id"),
    email: varchar("email", { length: 320 }),
    message: text("message").notNull(),
    locale: varchar("locale", { length: 16 }),
    pageUrl: text("page_url"),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    // Triage state for the admin Feedback view (#124). New rows land as
    // "new"; admins flip to "read" when they've looked, "archived" once
    // resolved or out-of-scope. Stored as a free-form varchar to stay
    // flexible without a Postgres enum migration dance.
    status: varchar("status", { length: 16 }).notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("feedback_submissions_created_idx").on(t.createdAt),
    index("feedback_submissions_user_idx").on(t.userId),
    index("feedback_submissions_status_idx").on(t.status),
  ],
);

export type FeedbackSubmission = typeof feedbackSubmissionsTable.$inferSelect;
export type InsertFeedbackSubmission =
  typeof feedbackSubmissionsTable.$inferInsert;
