import { pgTable, text, timestamp, uuid, index, boolean, pgEnum } from "drizzle-orm/pg-core";

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "approved",
  "needs_admin",
  "rejected",
]);

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
    status: submissionStatusEnum("status").notNull().default("pending"),
    aiReviewNote: text("ai_review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    frontImageUrl: text("front_image_url"),
    ingredientsImageUrl: text("ingredients_image_url"),
    rewardGranted: boolean("reward_granted").notNull().default(false),
  },
  (t) => [index("user_submitted_products_barcode_idx").on(t.barcode)],
);

export type UserSubmittedProduct = typeof userSubmittedProductsTable.$inferSelect;
export type InsertUserSubmittedProduct = typeof userSubmittedProductsTable.$inferInsert;
