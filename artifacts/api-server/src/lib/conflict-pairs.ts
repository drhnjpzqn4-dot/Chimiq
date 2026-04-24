import { normalizeIngredientName } from "./analysis-cache.js";

/**
 * Curated database of clinically-documented ingredient combinations that are
 * problematic when used together. Symmetric to safe-ingredients.ts (always
 * fine) and risky-ingredients.ts (concerning on their own) — this module
 * covers the case where TWO ingredients become risky in combination even when
 * either is fine on its own.
 *
 * Used by /api/analyze to inject a "MANDATORY CONFLICTS" block into the user
 * message so Claude has a deterministic baseline of conflicts it must surface.
 * Claude is still free to add additional documented conflicts it identifies.
 */

export type ConflictSeverity = "HIGH_RISK" | "CAUTION";
export type SkinProfile = "sensitive" | "young" | "mature" | "pregnant";

export interface ConflictPair {
  /** Stable id for logging/tests, e.g. "retinoid-aha". */
  id: string;
  /** Human-readable pair name, e.g. "Retinoid + AHA". */
  display: string;
  /** Default severity when both sides are present. */
  severity: ConflictSeverity;
  /** Per-skin-profile severity overrides. */
  profileOverrides?: Partial<Record<SkinProfile, ConflictSeverity>>;
  /** 1-2 sentence hint the model uses as a starting point for its explanation. */
  hint: string;
  /** Suggested citation. */
  citation: string;
  citationUrl: string;
  /**
   * Members of side A. Each entry will be normalised via
   * `normalizeIngredientName` at module load.
   */
  sideA: string[];
  /** Members of side B. */
  sideB: string[];
  /**
   * If true, also detect this conflict when both sides appear in the SAME
   * product (over-formulation). Default false (cross-product only).
   */
  applyWithinProduct?: boolean;
}

/**
 * Raw curated conflict database. Each entry's `sideA` / `sideB` lists are
 * normalised at module load and stored in `NORMALIZED_CONFLICTS`.
 */
const RAW_CONFLICTS: ConflictPair[] = [
  // ─── Retinoid + AHA ─────────────────────────────────────────────────────
  {
    id: "retinoid-aha",
    display: "Retinoid + AHA",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Layering an alpha-hydroxy acid with a retinoid causes acute barrier disruption: the AHA strips the stratum corneum at low pH while the retinoid drives accelerated turnover, producing erythema, peeling, and prolonged sensitivity. Use on alternating nights at most, or move one to morning use with strict SPF.",
    citation: "Mukherjee S et al., 2006. Clinical Interventions in Aging.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18046911/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "adapalene", "trifarotene", "isotretinoin"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid", "tartaric acid", "malic acid"],
  },
  // ─── Retinoid + BHA (salicylic) ─────────────────────────────────────────
  {
    id: "retinoid-bha",
    display: "Retinoid + BHA (Salicylic Acid)",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Combining a retinoid with salicylic acid in the same routine compounds exfoliation: salicylic acid penetrates the sebaceous follicle while the retinoid accelerates cell turnover, producing flaking, redness, and barrier breakdown. Pregnancy adds an additional retinoid contraindication.",
    citation: "Kornhauser A et al., 2010. Clinical, Cosmetic and Investigational Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/21437068/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "adapalene", "trifarotene", "isotretinoin"],
    sideB: ["salicylic acid"],
  },
  // ─── Retinoid + Benzoyl Peroxide ────────────────────────────────────────
  {
    id: "retinoid-bpo",
    display: "Retinoid + Benzoyl Peroxide",
    severity: "HIGH_RISK",
    hint: "Benzoyl peroxide oxidises tretinoin and retinol when applied together, deactivating up to 50%+ of the retinoid and producing extra free-radical irritation. The exception is fixed-combination prescription products (e.g. adapalene+BPO Epiduo) which are formulated for stability — but mixing two separate over-the-counter products is not the same.",
    citation: "Martin B et al., 1998. British Journal of Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/9602853/",
    sideA: ["retinol", "retinaldehyde", "retinyl palmitate", "retinyl acetate", "tretinoin", "isotretinoin"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Vitamin C + Copper Peptides ────────────────────────────────────────
  {
    id: "vitc-copper-peptide",
    display: "Vitamin C + Copper Peptides",
    severity: "CAUTION",
    hint: "Ascorbic acid reduces copper from Cu2+ to Cu+ and chelates the peptide, deactivating both ingredients. You waste two of the most expensive actives in your routine. Alternate them (one AM, one PM) or use on different days.",
    citation: "Pickart L et al., 2015. Biomed Res Int.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/26106608/",
    sideA: ["ascorbic acid", "l ascorbic acid", "sodium ascorbyl phosphate", "magnesium ascorbyl phosphate", "ascorbyl glucoside", "tetrahexyldecyl ascorbate", "3 o ethyl ascorbic acid", "ascorbyl palmitate"],
    sideB: ["copper tripeptide 1", "copper peptide", "copper peptides", "ghk cu", "copper pca"],
  },
  // ─── AHA/BHA + Copper Peptides ──────────────────────────────────────────
  {
    id: "exfoliant-copper-peptide",
    display: "Exfoliant Acid + Copper Peptides",
    severity: "CAUTION",
    hint: "Copper peptides require near-neutral pH (5-7) to remain stable. AHA and BHA exfoliants formulate at pH 3-4, which disassembles the peptide-copper complex and destroys efficacy. Apply at separate times of day if you want to use both.",
    citation: "Pickart L, 2008. Journal of Biomaterials Science, Polymer Edition.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/18534063/",
    sideA: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid", "tartaric acid", "malic acid"],
    sideB: ["copper tripeptide 1", "copper peptide", "copper peptides", "ghk cu", "copper pca"],
  },
  // ─── L-Ascorbic Acid + AHA/BHA ──────────────────────────────────────────
  {
    id: "vitc-acid-stack",
    display: "Vitamin C (L-AA) + Exfoliant Acid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK" },
    hint: "Pure L-ascorbic acid is already formulated at pH ~3.5. Stacking it with a separate AHA or BHA product compounds the low-pH irritation and can cause stinging, redness, and barrier disruption — especially on sensitive skin. Use them at opposite ends of the day.",
    citation: "Pinnell SR et al., 2001. Dermatologic Surgery.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/11231246/",
    sideA: ["ascorbic acid", "l ascorbic acid"],
    sideB: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid", "tartaric acid", "malic acid"],
  },
  // ─── Hydroquinone + Benzoyl Peroxide ────────────────────────────────────
  {
    id: "hydroquinone-bpo",
    display: "Hydroquinone + Benzoyl Peroxide",
    severity: "HIGH_RISK",
    hint: "When applied together, benzoyl peroxide oxidises hydroquinone and forms a temporary brown-black stain on the skin (and on clothing/towels). The combination also dramatically increases irritation. Use them at separate times if both are clinically indicated.",
    citation: "Briganti S et al., 2003. Pigment Cell Research.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/12950732/",
    sideA: ["hydroquinone"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Hydroquinone + Retinoid (over-aggressive) ──────────────────────────
  {
    id: "hydroquinone-retinoid",
    display: "Hydroquinone + Retinoid",
    severity: "CAUTION",
    profileOverrides: { sensitive: "HIGH_RISK", mature: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "This pairing IS used therapeutically (Kligman formula) for melasma — but only short-term and under dermatological supervision. Outside that context, daily use causes severe irritation, paradoxical post-inflammatory hyperpigmentation, and ochronosis risk with prolonged hydroquinone exposure. Pregnancy contraindicates retinoids absolutely.",
    citation: "Kligman AM, Willis I, 1975. Archives of Dermatology.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/1138562/",
    sideA: ["hydroquinone"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene", "isotretinoin"],
  },
  // ─── Formaldehyde Releaser + Ethanolamine (nitrosamine formation) ───────
  {
    id: "formaldehyde-ethanolamine",
    display: "Formaldehyde Releaser + Ethanolamine",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", young: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Formaldehyde donors (DMDM hydantoin, diazolidinyl/imidazolidinyl urea, quaternium-15, bronopol) react with secondary amines (DEA, TEA, MEA, cocamide DEA, lauramide DEA) to form nitrosamines — including N-nitrosodiethanolamine (NDELA), an IARC Group 2B probable carcinogen that absorbs through skin. This combination should be avoided.",
    citation: "FDA, 2024. Guidance: Nitrosamines in Cosmetics.",
    citationUrl: "https://www.fda.gov/cosmetics/cosmetic-ingredients/nitrosamines-cosmetics",
    sideA: ["dmdm hydantoin", "diazolidinyl urea", "imidazolidinyl urea", "quaternium 15", "bronopol", "2 bromo 2 nitropropane 1 3 diol"],
    sideB: ["triethanolamine", "diethanolamine", "monoethanolamine", "cocamide dea", "lauramide dea", "linoleamide dea", "oleamide dea", "tea"],
    applyWithinProduct: true,
  },
  // ─── Avobenzone + Benzoyl Peroxide ──────────────────────────────────────
  {
    id: "avobenzone-bpo",
    display: "Avobenzone + Benzoyl Peroxide",
    severity: "CAUTION",
    hint: "Benzoyl peroxide rapidly degrades avobenzone, dropping UVA protection within minutes of co-application. If you need both, use a sunscreen that uses photo-stabilised filters (e.g. Tinosorb, mineral-only) or apply BPO at night and sunscreen in the morning — never on the same skin at the same time.",
    citation: "Hanson KM et al., 2006. Free Radical Biology and Medicine.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/16386645/",
    sideA: ["butyl methoxydibenzoylmethane", "avobenzone"],
    sideB: ["benzoyl peroxide"],
  },
  // ─── Iron Oxides + Vitamin C ────────────────────────────────────────────
  {
    id: "iron-vitc",
    display: "Iron Oxide Pigments + Vitamin C",
    severity: "CAUTION",
    hint: "Iron ions catalyse the oxidation of L-ascorbic acid: the Vitamin C browns to dehydroascorbic acid and the iron-pigmented makeup darkens. Cosmetic effect is visible within hours. Use Vitamin C in the AM serum step, then let it absorb fully before applying iron-pigmented foundation — or switch to a stable Vitamin C ester.",
    citation: "Caritá AC et al., 2020. Free Radical Biology and Medicine.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31740339/",
    sideA: ["iron oxides", "ci 77491", "ci 77492", "ci 77499"],
    sideB: ["ascorbic acid", "l ascorbic acid"],
  },
  // ─── Salicylic Acid + Retinoid (within product over-formulation) ────────
  {
    id: "salicylic-retinoid-intra",
    display: "Salicylic Acid + Retinoid (same product)",
    severity: "HIGH_RISK",
    profileOverrides: { sensitive: "HIGH_RISK", pregnant: "HIGH_RISK" },
    hint: "Some 'anti-acne' products combine salicylic acid with adapalene or retinol in the same formula. While clinically possible under supervision, this stack delivers two strong exfoliants in one application and frequently triggers irritant contact dermatitis in real-world use.",
    citation: "Latter G et al., 2019. Pharmaceutics.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov/31652645/",
    sideA: ["salicylic acid"],
    sideB: ["retinol", "retinaldehyde", "tretinoin", "adapalene"],
    applyWithinProduct: true,
  },
];

interface NormalizedConflict {
  pair: ConflictPair;
  sideA: Set<string>;
  sideB: Set<string>;
}

/** Normalised conflict database built once at module load. */
const NORMALIZED_CONFLICTS: NormalizedConflict[] = RAW_CONFLICTS.map((pair) => {
  const sideA = new Set<string>();
  for (const name of pair.sideA) {
    const n = normalizeIngredientName(name);
    if (n) sideA.add(n);
  }
  const sideB = new Set<string>();
  for (const name of pair.sideB) {
    const n = normalizeIngredientName(name);
    if (n) sideB.add(n);
  }
  return { pair, sideA, sideB };
});

export interface MatchedConflict {
  pair: ConflictPair;
  /** Original (un-normalised) ingredient names from side A that were found. */
  matchedA: string[];
  /** Original (un-normalised) ingredient names from side B that were found. */
  matchedB: string[];
  /** Where the conflict occurs. */
  location: "cross" | "product1" | "product2";
}

interface IndexedList {
  /** Map of normalised name → first original spelling we saw. */
  byNormalized: Map<string, string>;
}

function indexList(rawList: string[]): IndexedList {
  const byNormalized = new Map<string, string>();
  for (const raw of rawList) {
    const n = normalizeIngredientName(raw);
    if (!n) continue;
    if (!byNormalized.has(n)) byNormalized.set(n, raw);
  }
  return { byNormalized };
}

function intersect(side: Set<string>, list: IndexedList): string[] {
  const hits: string[] = [];
  for (const norm of side) {
    const original = list.byNormalized.get(norm);
    if (original) hits.push(original);
  }
  return hits;
}

/**
 * Find every documented conflict that's triggered by this scan.
 *
 * For each curated pair, looks for sideA members in product 1 + sideB members
 * in product 2 (and the symmetric direction). When `applyWithinProduct` is
 * true, also checks for both sides appearing inside the same product.
 *
 * Returns an empty array if `product2` is not provided (single-product scan)
 * unless the pair is `applyWithinProduct: true`.
 */
export function getConflicts(product1: string[], product2?: string[]): MatchedConflict[] {
  const list1 = indexList(product1);
  const list2 = product2 ? indexList(product2) : null;

  const matches: MatchedConflict[] = [];
  const seen = new Set<string>();

  for (const { pair, sideA, sideB } of NORMALIZED_CONFLICTS) {
    if (list2) {
      // Cross-product: A in product 1, B in product 2
      const a1 = intersect(sideA, list1);
      const b2 = intersect(sideB, list2);
      if (a1.length > 0 && b2.length > 0) {
        const key = `${pair.id}:cross:1->2`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ pair, matchedA: a1, matchedB: b2, location: "cross" });
        }
      }

      // Cross-product: A in product 2, B in product 1 (symmetric)
      const a2 = intersect(sideA, list2);
      const b1 = intersect(sideB, list1);
      if (a2.length > 0 && b1.length > 0) {
        const key = `${pair.id}:cross:2->1`;
        if (!seen.has(key)) {
          seen.add(key);
          // Keep matchedA / matchedB labelled by side (not by product) so the
          // prompt block reads naturally: "side A members: ..., side B members: ..."
          matches.push({ pair, matchedA: a2, matchedB: b1, location: "cross" });
        }
      }
    }

    if (pair.applyWithinProduct) {
      // Within product 1
      const a1Within = intersect(sideA, list1);
      const b1Within = intersect(sideB, list1);
      if (a1Within.length > 0 && b1Within.length > 0) {
        // Avoid flagging "X conflicts with X" — only count when at least one
        // matched name on each side is actually different.
        const distinct = a1Within.some((a) => !b1Within.includes(a));
        if (distinct) {
          const key = `${pair.id}:within:1`;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({ pair, matchedA: a1Within, matchedB: b1Within, location: "product1" });
          }
        }
      }

      // Within product 2 (only if scanning two products)
      if (list2) {
        const a2Within = intersect(sideA, list2);
        const b2Within = intersect(sideB, list2);
        if (a2Within.length > 0 && b2Within.length > 0) {
          const distinct = a2Within.some((a) => !b2Within.includes(a));
          if (distinct) {
            const key = `${pair.id}:within:2`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({ pair, matchedA: a2Within, matchedB: b2Within, location: "product2" });
            }
          }
        }
      }
    }
  }

  return matches;
}

function severityFor(pair: ConflictPair, skinProfile?: string): ConflictSeverity {
  if (skinProfile && pair.profileOverrides) {
    const override = pair.profileOverrides[skinProfile as SkinProfile];
    if (override) return override;
  }
  return pair.severity;
}

/**
 * Build the user-message addendum that tells Claude which conflicts MUST be
 * surfaced in its `conflicts` array. Returns "" when there are no matches.
 */
export function buildMandatoryConflictsBlock(
  matches: MatchedConflict[],
  skinProfile?: string,
): string {
  if (matches.length === 0) return "";

  const lines = matches.map((m) => {
    const sev = severityFor(m.pair, skinProfile);
    const where =
      m.location === "cross"
        ? "(cross-product)"
        : m.location === "product1"
          ? "(both ingredients in Product 1)"
          : "(both ingredients in Product 2)";
    return [
      `- Pair: ${m.pair.display} ${where}`,
      `  matched side A: ${m.matchedA.join(", ")}`,
      `  matched side B: ${m.matchedB.join(", ")}`,
      `  severity: ${sev}`,
      `  hint: ${m.pair.hint}`,
      `  suggested citation: ${m.pair.citation}`,
      `  suggested citation URL: ${m.pair.citationUrl}`,
    ].join("\n");
  });

  return [
    "",
    "MANDATORY CONFLICTS — the following ingredient combinations in this scan are documented in our curated conflict database:",
    ...lines,
    "",
    "For each pair above you MUST include an entry in your \"conflicts\" array. Use the exact severity and a `pair` field shaped like \"<matched A name> + <matched B name>\". Write your own 2-3 sentence explanation that incorporates the hint and adapts the tone to the user's skin profile. Use the suggested citation unless you know a stronger primary source. You may add additional conflicts you identify outside this list.",
  ].join("\n");
}

/** Exposed for tests / admin tooling. */
export const __INTERNAL = { NORMALIZED_CONFLICTS };
