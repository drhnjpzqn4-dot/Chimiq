import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

export async function getUserPlan(userId: string): Promise<"free" | "premium"> {
  const [user] = await db
    .select({ plan: schema.usersTable.plan, premiumUntil: schema.usersTable.premiumUntil })
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, userId));
  if (!user) return "free";
  if (user.plan === "premium") return "premium";
  if (user.premiumUntil && user.premiumUntil > new Date()) return "premium";
  return "free";
}
