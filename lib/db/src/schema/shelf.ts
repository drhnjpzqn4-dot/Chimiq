import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const routineSlotEnum = ["morning", "evening", "both", "occasional", "wishlist"] as const;
export type RoutineSlot = (typeof routineSlotEnum)[number];

export const shelfProductsTable = pgTable("shelf_products", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  ingredients: text("ingredients").notNull(),
  routineSlot: text("routine_slot").$type<RoutineSlot>().notNull().default("both"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShelfProductSchema = createInsertSchema(shelfProductsTable).omit({
  id: true,
  addedAt: true,
  userId: true,
});

export type InsertShelfProduct = z.infer<typeof insertShelfProductSchema>;
export type ShelfProduct = typeof shelfProductsTable.$inferSelect;
