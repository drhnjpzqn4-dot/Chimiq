import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const scanEventsTable = pgTable(
  "scan_events",
  {
    id: serial("id").primaryKey(),
    productName: varchar("product_name", { length: 500 }),
    verdict: varchar("verdict", { length: 16 }).notNull(),
    scanMode: varchar("scan_mode", { length: 16 }).notNull().default("single"),
    userId: varchar("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scan_events_product_name_idx").on(t.productName),
    index("scan_events_verdict_idx").on(t.verdict),
    index("scan_events_created_at_idx").on(t.createdAt),
  ],
);

export type ScanEvent = typeof scanEventsTable.$inferSelect;
export type InsertScanEvent = typeof scanEventsTable.$inferInsert;
