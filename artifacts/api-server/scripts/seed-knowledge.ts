/**
 * Seedar Chimiqs company knowledge till Supabase.
 *
 * Flyttar den kurerade kunskapen ur koden och in i databasen så att skanningen,
 * kundagenten och crawlern kan läsa samma källa (ADR 2026-09-14):
 *   src/lib/risky-ingredients.ts  ->  public.ingredient_risks
 *   src/lib/conflict-pairs.ts     ->  public.ingredient_conflicts
 *
 * Körs om varje gång TS-filerna ändrats — den är idempotent (upsert på nyckel).
 *
 * Kör från repo-roten:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm tsx artifacts/api-server/scripts/seed-knowledge.ts
 */
import { createClient } from "@supabase/supabase-js";
import { getRiskEntries } from "../src/lib/risky-ingredients.js";
import { __INTERNAL } from "../src/lib/conflict-pairs.js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY i miljön.\n" +
      "Hämta dem i Supabase → Project Settings → API.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const now = new Date().toISOString();

const risks = getRiskEntries().map((e) => ({
  key: e.key,
  display: e.display,
  slug: e.slug,
  category: e.category,
  severity: e.severity,
  profile_overrides: e.profileOverrides ?? {},
  hint: e.hint,
  hint_se: e.hint_se ?? null,
  citation: e.citation ?? null,
  citation_url: e.citationUrl ?? null,
  concentration_dependent: e.concentrationDependent ?? false,
  concentration_note: e.concentrationNote ?? null,
  aliases: e.aliases ?? [],
  description: e.description ?? null,
  description_se: e.description_se ?? null,
  common_in: e.commonIn ?? [],
  common_in_se: e.commonIn_se ?? [],
  medically_reviewed: e.medicallyReviewed ?? false,
  source: "curated",
  updated_at: now,
}));

const conflicts = __INTERNAL.NORMALIZED_CONFLICTS.map(({ pair, sideA, sideB }) => ({
  id: pair.id,
  display: pair.display,
  severity: pair.severity,
  profile_overrides: pair.profileOverrides ?? {},
  hint: pair.hint,
  hint_se: pair.hint_se ?? null,
  citation: pair.citation ?? null,
  citation_url: pair.citationUrl ?? null,
  side_a: [...sideA],
  side_b: [...sideB],
  apply_within_product: pair.applyWithinProduct ?? false,
  source: "curated",
  updated_at: now,
}));

/** Fångar dubbletter innan databasen gör det — felet blir begripligt. */
function assertUnique<T>(rows: T[], field: keyof T, label: string): void {
  const seen = new Map<unknown, number>();
  for (const row of rows) {
    const v = row[field];
    seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([v]) => v);
  if (dupes.length) {
    console.error(`Dubbletter i ${label}.${String(field)}:`, dupes);
    process.exit(1);
  }
}

assertUnique(risks, "key", "ingredient_risks");
assertUnique(risks, "slug", "ingredient_risks");
assertUnique(conflicts, "id", "ingredient_conflicts");

async function upsertAll(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await db.from(table).upsert(chunk, { onConflict });
    if (error) {
      console.error(`Fel vid skrivning till ${table} (post ${i}–${i + chunk.length}):`, error);
      process.exit(1);
    }
    console.log(`  ${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
}

async function main(): Promise<void> {
  console.log(`Seedar ${risks.length} ingrediensrisker och ${conflicts.length} konflikter...`);
  await upsertAll("ingredient_risks", risks, "key");
  await upsertAll("ingredient_conflicts", conflicts, "id");

  const [{ count: riskCount }, { count: conflictCount }] = await Promise.all([
    db.from("ingredient_risks").select("*", { count: "exact", head: true }),
    db.from("ingredient_conflicts").select("*", { count: "exact", head: true }),
  ]);
  console.log(`Klart. I databasen nu: ${riskCount} risker, ${conflictCount} konflikter.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
