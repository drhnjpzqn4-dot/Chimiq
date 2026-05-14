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

/**
 * Supabase transaction pooler (PgBouncer / Supavisor) stödjer inte prepared statements.
 * Utan `pgbouncer=true` kan pg + Drizzle ge fel vid poolade anslutningar.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres#pooler-transaction-mode
 */
function withSupabasePoolerCompat(connectionString: string): string {
  if (/[?&]pgbouncer=true(?:&|$)/i.test(connectionString)) {
    return connectionString;
  }
  const lower = connectionString.toLowerCase();
  const pooled =
    lower.includes("pooler.supabase.com") || /:6543(\/|\?|$)/.test(lower);
  if (!pooled) {
    return connectionString;
  }
  return connectionString.includes("?")
    ? `${connectionString}&pgbouncer=true`
    : `${connectionString}?pgbouncer=true`;
}

const resolvedDatabaseUrl = withSupabasePoolerCompat(process.env.DATABASE_URL);

export const pool = new Pool({ connectionString: resolvedDatabaseUrl });
export const db = drizzle(pool, { schema, logger: false });

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
