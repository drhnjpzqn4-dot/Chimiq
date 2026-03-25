import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const waitlistEntriesTable = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmed: boolean("confirmed").notNull().default(false),
});

export const insertWaitlistEntrySchema = createInsertSchema(waitlistEntriesTable).omit({
  id: true,
  createdAt: true,
  confirmed: true,
});

export type InsertWaitlistEntry = z.infer<typeof insertWaitlistEntrySchema>;
export type WaitlistEntry = typeof waitlistEntriesTable.$inferSelect;
