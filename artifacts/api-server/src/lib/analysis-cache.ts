import crypto from "crypto";
import { db, analysisCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { AnalysisCache } from "@workspace/db";

const STALE_DAYS = 180;

// Synonym map: collapses common INCI / colloquial spellings to a single canonical
// form so cache lookups hit regardless of how the user labelled an ingredient.
// Keep the keys lowercase and pre-normalised (no parens / digits / punctuation).
const INGREDIENT_SYNONYMS: Record<string, string> = {
  "aqua": "water",
  "eau": "water",
  "parfum": "fragrance",
  "perfume": "fragrance",
  "vitamin a": "retinol",
  "vitamin b3": "niacinamide",
  "vitamin b5": "panthenol",
  "pro vitamin b5": "panthenol",
  "provitamin b5": "panthenol",
  "vitamin c": "ascorbic acid",
  "l ascorbic acid": "ascorbic acid",
  "vitamin e": "tocopherol",
  "vitamin f": "linoleic acid",
  "shea butter": "butyrospermum parkii butter",
  "aloe vera": "aloe barbadensis leaf juice",
};

export function normalizeIngredientName(raw: string): string | null {
  // Strip percentages first ("5%", "10 %", "0.5%") so they don't survive into
  // the token stream. We keep all other digits because CI colour-index numbers
  // ("CI 77491") and PEG/Polysorbate grades ("PEG-100", "Polysorbate 80") are
  // semantically meaningful and must remain distinct in the cache key.
  let s = raw.replace(/\d+(?:[.,]\d+)?\s*%/g, " ");
  // Drop anything in parentheses ("Niacinamide (5%)" → "Niacinamide ").
  s = s.replace(/\([^)]*\)/g, " ");
  // Lowercase + strip punctuation other than spaces / hyphens.
  s = s.toLowerCase().replace(/[^a-z0-9 -]/g, " ");
  // Collapse hyphens to spaces so "l-ascorbic" matches "l ascorbic".
  s = s.replace(/-/g, " ");
  // Collapse whitespace.
  s = s.split(/\s+/).filter(Boolean).join(" ").trim();
  if (!s) return null;
  if (s.length < 2) return null;
  return INGREDIENT_SYNONYMS[s] ?? s;
}

function normalizeIngredients(raw: string): string {
  return raw
    .split(/[,;\n]+/)
    .map(normalizeIngredientName)
    .filter((s): s is string => Boolean(s))
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
