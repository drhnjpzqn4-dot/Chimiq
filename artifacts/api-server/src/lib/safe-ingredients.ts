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
  // ─── Plant oils (well-tolerated emollients) ─────────────────────────────
  "simmondsia chinensis seed oil",
  "argania spinosa kernel oil",
  "rosa canina fruit oil",
  "rosa moschata seed oil",
  "prunus amygdalus dulcis oil",
  "persea gratissima oil",
  "olea europaea fruit oil",
  "cocos nucifera oil",
  "vitis vinifera seed oil",
  "helianthus annuus seed oil",
  "carthamus tinctorius seed oil",
  "limnanthes alba seed oil",
  "sclerocarya birrea seed oil",
  "calophyllum inophyllum seed oil",
  "cannabis sativa seed oil",
  "oenothera biennis oil",
  "macadamia ternifolia seed oil",
  "macadamia integrifolia seed oil",
  "corylus avellana seed oil",
  "plukenetia volubilis seed oil",
  "prunus armeniaca kernel oil",
  "camellia oleifera seed oil",
  "moringa oleifera seed oil",
  "echium plantagineum seed oil",
  "punica granatum seed oil",
  // ─── Synthetic emollients (inert, low-irritation) ───────────────────────
  "dicaprylyl carbonate",
  "isoamyl laurate",
  "coco caprylate",
  "coco caprylate caprate",
  "isopropyl myristate",
  "isopropyl palmitate",
  "cetyl ethylhexanoate",
  "ethylhexyl palmitate",
  "diisopropyl sebacate",
  "hydrogenated polyisobutene",
  // ─── Linear / cross-polymer silicones (non-cyclic, non-volatile) ────────
  // NOTE: cyclopentasiloxane (D5) and cyclotetrasiloxane (D4) are intentionally
  // EXCLUDED — they are listed as risky cyclic silicones in risky-ingredients.ts.
  "dimethicone",
  "dimethiconol",
  "dimethicone crosspolymer",
  "trimethylsiloxysilicate",
  "phenyl trimethicone",
  // ─── Plant butters ──────────────────────────────────────────────────────
  "butyrospermum parkii butter",
  "theobroma cacao seed butter",
  "mangifera indica seed butter",
  "garcinia indica seed butter",
  "astrocaryum murumuru seed butter",
  "theobroma grandiflorum seed butter",
  // ─── Soothing botanicals (non-allergenic profile) ───────────────────────
  "cucumis sativus fruit extract",
  "bambusa vulgaris leaf extract",
  "cucurbita pepo seed extract",
  "ginkgo biloba leaf extract",
  "polygonum cuspidatum root extract",
  "resveratrol",
  "spirulina platensis extract",
  "chlorella vulgaris extract",
  "fucus vesiculosus extract",
  "laminaria saccharina extract",
  "portulaca oleracea extract",
  // ─── Polyols / NMF humectants ───────────────────────────────────────────
  "methylpropanediol",
  "isopentyldiol",
  "sorbitol",
  "xylitol",
  "erythritol",
  "mannitol",
  "sodium lactate",
  "inulin",
  "maltodextrin",
  // ─── Free amino acids (NMF components) ──────────────────────────────────
  "arginine",
  "glycine",
  "serine",
  "proline",
  "histidine",
  "glutamic acid",
  "lysine",
  "threonine",
  "alanine",
  "aspartic acid",
  "taurine",
  "creatine",
  // ─── Skin-identical fatty acids ─────────────────────────────────────────
  "linoleic acid",
  "linolenic acid",
  "oleic acid",
  "stearic acid",
  "palmitic acid",
  "myristic acid",
  "lauric acid",
  // ─── Polymers / film-formers ────────────────────────────────────────────
  "sodium polyacrylate",
  "polyacrylate crosspolymer 6",
  "ammonium acryloyldimethyltaurate vp copolymer",
  "vp eicosene copolymer",
  "styrene acrylates copolymer",
  "acrylates c10 30 alkyl acrylate crosspolymer",
  "pvp",
  // ─── Natural gums (rheology modifiers) ──────────────────────────────────
  "guar gum",
  "locust bean gum",
  "agar",
  "pectin",
  // ─── Mild glucoside / amino-acid surfactants ────────────────────────────
  "coco glucoside",
  "decyl glucoside",
  "lauryl glucoside",
  "caprylyl capryl glucoside",
  "sodium cocoyl glutamate",
  "disodium cocoyl glutamate",
  "sodium lauroyl sarcosinate",
  "sodium cocoyl isethionate",
  "sodium methyl cocoyl taurate",
  // ─── Co-emulsifiers ─────────────────────────────────────────────────────
  "cetearyl glucoside",
  "arachidyl glucoside",
  "arachidyl alcohol",
  "sucrose stearate",
  "sucrose laurate",
  "polyglyceryl 3 polyricinoleate",
  "polyglyceryl 4 caprate",
  // ─── Inert texturisers / fillers ────────────────────────────────────────
  "silica",
  "silica dimethyl silylate",
  "mica",
  "nylon 12",
  "starch",
  "tapioca starch",
  "corn starch",
  "hydrogenated starch hydrolysate",
  // ─── Mineral SPF actives (non-nano forms) ───────────────────────────────
  // NOTE: The "nano" qualified versions are flagged as NANOPARTICLE in
  // risky-ingredients.ts. These bare entries match the non-nano form which
  // SCCS considers safe for topical use.
  "titanium dioxide",
  "zinc oxide",
  // ─── Glyceryl barrier helpers / multifunctional emollient-preservatives ─
  "caprylhydroxamic acid",
  "glyceryl caprylate",
  "glyceryl undecylenate",
  "sodium stearoyl glutamate",
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
