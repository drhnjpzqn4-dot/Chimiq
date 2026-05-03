import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const RECIPE_STATUSES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const RECIPE_RISK_LEVELS = ["safe", "caution", "high_risk"] as const;
export type RecipeRiskLevel = (typeof RECIPE_RISK_LEVELS)[number];

export type RecipeIngredient = {
  name: string;
  amount?: string;
  percentage?: number;
  notes?: string;
};

export type RecipeAiVerdict = {
  riskLevel: "safe" | "caution" | "high_risk";
  summary: string;
  flagged: Array<{
    ingredient: string;
    reason: string;
    severity: "info" | "warn" | "danger";
  }>;
  warnings: string[];
  saferSwaps: Array<{ from: string; to: string; why: string }>;
  reviewedAt: string;
  modelVersion: string;
};

export const recipesTable = pgTable(
  "recipes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    submitterId: varchar("submitter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    skinTypes: jsonb("skin_types").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    ingredients: jsonb("ingredients").$type<RecipeIngredient[]>().notNull(),
    method: text("method").notNull(),
    photoUrl: varchar("photo_url"),
    aiVerdict: jsonb("ai_verdict").$type<RecipeAiVerdict | null>(),
    riskLevel: varchar("risk_level", { length: 16 }),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    adminNote: text("admin_note"),
    reviewedById: varchar("reviewed_by_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Per-recipe acknowledgment for the contributor notification banner
    // (#70). A reviewed recipe is "unseen" iff reviewSeenAt is NULL or
    // strictly older than reviewedAt. Tapping the notification entry
    // (which deep-links to RecipeDetail or the edit form) sets this to
    // now() for that single recipe — so we never silently clear unread
    // feedback for recipes the user never looked at.
    reviewSeenAt: timestamp("review_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("idx_recipes_status").on(t.status),
    index("idx_recipes_category").on(t.category),
    index("idx_recipes_submitter").on(t.submitterId),
    check(
      "recipes_status_valid",
      sql`${t.status} IN ('pending','approved','changes_requested','rejected')`,
    ),
    check(
      "recipes_risk_level_valid",
      sql`${t.riskLevel} IS NULL OR ${t.riskLevel} IN ('safe','caution','high_risk')`,
    ),
  ],
);

export type Recipe = typeof recipesTable.$inferSelect;
export type NewRecipe = typeof recipesTable.$inferInsert;
