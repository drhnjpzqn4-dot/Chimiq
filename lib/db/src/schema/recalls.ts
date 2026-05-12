import { index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const recallsTable = pgTable(
  "recalls",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    productName: text("product_name"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Stable dedupe key (RSS link or guid-based urn). */
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("recalls_published_at_idx").on(t.publishedAt),
    uniqueIndex("recalls_source_url_unique").on(t.sourceUrl),
  ],
);

export type Recall = typeof recallsTable.$inferSelect;
export type InsertRecall = typeof recallsTable.$inferInsert;
