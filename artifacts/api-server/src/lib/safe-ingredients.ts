import { normalizeIngredientName } from "./analysis-cache.js";

// Curated list of ingredients that are universally well-tolerated for ALL skin
// profiles (sensitive, young, mature, pregnant included). The bar is high:
// - Decades of safe leave-on use at typical cosmetic concentrations.
// - No documented endocrine, allergen, or irritation concern in the general
//   population (rare individual reactions excluded).
// - Safe across pregnancy and on developing skin.
//
// Keep entries in their post-normalisation form (lowercase, hyphens replaced
// with spaces, no parentheses, no percentages, synonyms collapsed via the
// shared INGREDIENT_SYNONYMS map in analysis-cache.ts — e.g. write "water"
// not "aqua", "tocopherol" not "vitamin e").
//
// Pre-filtering these ingredients before the LLM call cuts input tokens and
// lets the model focus its reasoning on the genuinely interesting ingredients.
const UNIVERSALLY_SAFE_INGREDIENTS = new Set<string>([
  // Solvents / humectants
  "water",
  "glycerin",
  "butylene glycol",
  "pentylene glycol",
  "hexylene glycol",
  "propanediol",
  "1 2 hexanediol",
  "caprylyl glycol",
  // Salts / pH adjusters at trace
  "sodium chloride",
  "potassium chloride",
  "calcium chloride",
  "magnesium chloride",
  "sodium citrate",
  "trisodium citrate",
  "potassium citrate",
  "sodium phosphate",
  "disodium phosphate",
  "sodium hydroxide",
  "potassium hydroxide",
  // NOTE: triethanolamine is intentionally NOT included — it can form
  // nitrosamines in the presence of nitrosating preservatives and is
  // restricted under EU Annex III.
  // Hydrators / NMF
  "sodium hyaluronate",
  "hyaluronic acid",
  "sodium pca",
  "betaine",
  "trehalose",
  "sucrose",
  "glucose",
  "fructose",
  // NOTE: urea is intentionally NOT included — it acts as a keratolytic
  // exfoliant at high concentrations (>10%), so it must always be analysed.
  "allantoin",
  "panthenol",
  "niacinamide",
  // Skin-identical lipids
  "ceramide np",
  "ceramide ap",
  "ceramide eop",
  "ceramide ns",
  "cholesterol",
  "phytosphingosine",
  "sphingolipids",
  "squalane",
  "caprylic capric triglyceride",
  // Fatty alcohols (NOT drying — emollient thickeners)
  "cetearyl alcohol",
  "cetyl alcohol",
  "stearyl alcohol",
  "behenyl alcohol",
  "myristyl alcohol",
  // Emulsifiers / thickeners (inert at typical use levels)
  "glyceryl stearate",
  "glyceryl stearate se",
  "polysorbate 20",
  "polysorbate 60",
  "polysorbate 80",
  "sorbitan stearate",
  "sorbitan oleate",
  "carbomer",
  "acrylates copolymer",
  "xanthan gum",
  "sclerotium gum",
  "hydroxyethylcellulose",
  "cellulose gum",
  "tara gum",
  // Chelators at trace
  "disodium edta",
  "tetrasodium edta",
  "etidronic acid",
  "sodium phytate",
  // Common low-risk preservative booster (paired with phenoxyethanol)
  "ethylhexylglycerin",
  // NOTE: citric acid is intentionally NOT included — at trace amounts it's
  // a pH adjuster but at active concentrations it's an AHA photosensitiser.
  // Always send to the LLM so it can decide based on context.
  // Soothing botanicals (well-studied, gentle)
  "centella asiatica extract",
  "centella asiatica leaf extract",
  "camellia sinensis leaf extract",
  "aloe barbadensis leaf juice",
  "beta glucan",
  "oat kernel extract",
  "avena sativa kernel extract",
  "colloidal oatmeal",
  "bisabolol",
  "madecassoside",
  "asiaticoside",
  "calendula officinalis flower extract",
  "chamomilla recutita flower extract",
]);

export function isUniversallySafe(ingredientName: string): boolean {
  const normalized = normalizeIngredientName(ingredientName);
  if (!normalized) return false;
  return UNIVERSALLY_SAFE_INGREDIENTS.has(normalized);
}

export interface PartitionResult {
  safe: string[];
  needsAnalysis: string[];
}

/**
 * Splits a parsed ingredient list into two buckets:
 *   - `safe`: ingredients on the universally-safe list (no LLM call needed).
 *   - `needsAnalysis`: everything else (must be analysed by the LLM).
 *
 * The original ingredient strings are preserved so they can be displayed back
 * to the user with original casing / punctuation.
 */
export function partitionIngredients(parsed: string[]): PartitionResult {
  const safe: string[] = [];
  const needsAnalysis: string[] = [];
  for (const ing of parsed) {
    if (isUniversallySafe(ing)) {
      safe.push(ing);
    } else {
      needsAnalysis.push(ing);
    }
  }
  return { safe, needsAnalysis };
}
