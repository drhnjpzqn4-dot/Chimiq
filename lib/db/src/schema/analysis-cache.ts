import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const analysisCacheTable = pgTable("analysis_cache", {
  hash: text("hash").primaryKey(),
  scanType: text("scan_type").notNull(),
  skinProfile: text("skin_profile"),
  resultJson: text("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  useCount: integer("use_count").notNull().default(1),
  flaggedOutdated: boolean("flagged_outdated").notNull().default(false),
});

export type AnalysisCache = typeof analysisCacheTable.$inferSelect;
export type InsertAnalysisCache = typeof analysisCacheTable.$inferInsert;
