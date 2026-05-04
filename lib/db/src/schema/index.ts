// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

export * from "./auth";
export * from "./shelf";
export * from "./cache";
export * from "./cosing";
export * from "./pubchem-cache";
export * from "./user-submitted-products";
export * from "./analysis-cache";
export * from "./recipes";
export * from "./recipe-edit-events";
export * from "./gamification";
export * from "./discover-ratings";
export * from "./product-ratings";
export * from "./daily-scan-counts";
export * from "./legal-consents";
export * from "./payment-test-charges";
export * from "./feedback-submissions";
export * from "./tester-promo-changes";
export * from "./scan-events";