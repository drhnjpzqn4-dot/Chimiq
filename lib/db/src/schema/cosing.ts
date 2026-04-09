import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const cosingRestrictionEnum = pgEnum("cosing_restriction_status", [
  "banned",
  "restricted",
  "permitted",
  "preservative",
  "colorant",
  "uv_filter",
  "other",
]);

export const cosingIngredientsTable = pgTable("cosing_ingredients", {
  inciName: text("inci_name").primaryKey(),
  casNumber: text("cas_number"),
  ecNumber: text("ec_number"),
  functions: text("functions"),
  restrictionStatus: cosingRestrictionEnum("restriction_status").notNull().default("other"),
  annexReference: text("annex_reference"),
  restrictionDescription: text("restriction_description"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CosingIngredient = typeof cosingIngredientsTable.$inferSelect;
export type InsertCosingIngredient = typeof cosingIngredientsTable.$inferInsert;
