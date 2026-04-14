import crypto from "crypto";
import { db, analysisCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { AnalysisCache } from "@workspace/db";

const STALE_DAYS = 180;

function normalizeIngredients(raw: string): string {
  return raw
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((s) => s.trim().replace(/[^a-z0-9 -]/g, "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function computeSingleHash(ingredients: string, skinProfile?: string): string {
  const normalized = normalizeIngredients(ingredients);
  const key = `${normalized}|||${skinProfile ?? ""}|||single`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function computeCompareHash(product1: string, product2: string, skinProfile?: string): string {
  const n1 = normalizeIngredients(product1);
  const n2 = normalizeIngredients(product2);
  const [a, b] = [n1, n2].sort();
  const key = `${a}|||${b}|||${skinProfile ?? ""}|||compare`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function isStale(entry: AnalysisCache): boolean {
  if (entry.flaggedOutdated) return true;
  const ageMs = Date.now() - entry.createdAt.getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export async function getCacheEntry(hash: string): Promise<AnalysisCache | null> {
  const rows = await db
    .select()
    .from(analysisCacheTable)
    .where(eq(analysisCacheTable.hash, hash))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveCacheEntry(
  hash: string,
  scanType: string,
  skinProfile: string | undefined,
  resultJson: string,
): Promise<void> {
  await db
    .insert(analysisCacheTable)
    .values({
      hash,
      scanType,
      skinProfile: skinProfile ?? null,
      resultJson,
      useCount: 1,
      flaggedOutdated: false,
    })
    .onConflictDoUpdate({
      target: analysisCacheTable.hash,
      set: {
        resultJson,
        lastUsedAt: new Date(),
        useCount: sql`${analysisCacheTable.useCount} + 1`,
        flaggedOutdated: false,
        createdAt: new Date(),
      },
    });
}

export async function bumpCacheUsage(hash: string): Promise<void> {
  await db
    .update(analysisCacheTable)
    .set({
      lastUsedAt: new Date(),
      useCount: sql`${analysisCacheTable.useCount} + 1`,
    })
    .where(eq(analysisCacheTable.hash, hash));
}

export async function flagCacheEntry(hash: string): Promise<boolean> {
  const result = await db
    .update(analysisCacheTable)
    .set({ flaggedOutdated: true })
    .where(eq(analysisCacheTable.hash, hash));
  return (result.rowCount ?? 0) > 0;
}
