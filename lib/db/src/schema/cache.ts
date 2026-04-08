import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cachedProductsTable = pgTable("cached_products", {
  barcode: text("barcode").primaryKey(),
  productName: text("product_name").notNull(),
  brand: text("brand").notNull().default(""),
  ingredients: text("ingredients").notNull(),
  imageUrl: text("image_url"),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedProduct = typeof cachedProductsTable.$inferSelect;
export type InsertCachedProduct = typeof cachedProductsTable.$inferInsert;
