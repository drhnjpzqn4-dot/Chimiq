import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { recipesTable } from "./recipes";

export const recipeEditEventsTable = pgTable(
  "recipe_edit_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    submitterId: varchar("submitter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipeId: varchar("recipe_id")
      .notNull()
      .references(() => recipesTable.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_recipe_edit_events_submitter_created").on(
      t.submitterId,
      t.createdAt,
    ),
  ],
);

export type RecipeEditEvent = typeof recipeEditEventsTable.$inferSelect;
export type NewRecipeEditEvent = typeof recipeEditEventsTable.$inferInsert;
