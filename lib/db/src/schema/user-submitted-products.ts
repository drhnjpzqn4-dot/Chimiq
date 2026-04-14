import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const userSubmittedProductsTable = pgTable(
  "user_submitted_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barcode: text("barcode").notNull(),
    productName: text("product_name"),
    brand: text("brand"),
    ingredients: text("ingredients"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    obfContributed: text("obf_contributed").default("pending"),
    submittedBy: text("submitted_by"),
    status: text("status").notNull().default("pending"),
    aiReviewNote: text("ai_review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("user_submitted_products_barcode_idx").on(t.barcode)],
);

export type UserSubmittedProduct = typeof userSubmittedProductsTable.$inferSelect;
export type InsertUserSubmittedProduct = typeof userSubmittedProductsTable.$inferInsert;
