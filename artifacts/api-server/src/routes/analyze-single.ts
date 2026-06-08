import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCosingInfo, formatCosingContext } from "../lib/cosing.js";
import { getPubChemSafetyData } from "../lib/pubchem.js";
import {
  computeSingleHash,
  getCacheEntry,
  saveCacheEntry,
  bumpCacheUsage,
  isStale,
} from "../lib/analysis-cache.js";
import { sanitizeIngredients, SanitizationError } from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { requireAuth } from "../lib/authGate.js";
import { partitionIngredients } from "../lib/safe-ingredients.js";
import { getRisksInList, buildMandatoryFlagsBlock } from "../lib/risky-ingredients.js";
import { ProductTypeSchema, type ProductType } from "../lib/product-type.js";
import { getUserPlan } from "../lib/userPlan.js";
import {
  FREE_DAILY_SCAN_LIMIT,
  claimDailyScanSlot,
  incrementTodayScanCount,
  releaseDailyScanSlot,
} from "../lib/scanQuota.js";

const SkinProfileEnum = z.enum(["sensitive", "young", "mature", "pregnant"]).optional();

const AnalyzeSingleBody = z.object({
  ingredients: z.string().trim().min(1, "Ingredients are required").max(3000),
  skinProfile: SkinProfileEnum,
  productType: ProductTypeSchema.optional(),
  locale: z.enum(["en", "sv", "fr", "es"]).optional(),
  // SS-081: när en produkt med riktig EAN analyseras sparar vi resultatet på
  // produktraden (cached_products.analysis_result_json) så det blir DELAT — alla
  // användare som öppnar produkten får analysen utan ny AI-kostnad.
  barcode: z.string().trim().max(64).optional(),
});

const FlagCategorySchema = z.enum([
  "ENDOCRINE_DISRUPTOR",
  "FORMALDEHYDE_RELEASER",
  "FRAGRANCE",
  "HARSH_PRESERVATIVE",
  "PHOTOSENSITISER",
  "KNOWN_ALLERGEN",
  "NANOPARTICLE",
  "HEAVY_METAL",
  "CARCINOGEN",
  "CAUTION",
]);

const IngredientFlagSchema = z.object({
  ingredient: z.string(),
  category: FlagCategorySchema,
  severity: z.enum(["HIGH_RISK", "CAUTION"]),
  explanation: z.string(),
  citation: z.string(),
  citationUrl: z.string(),
});

const AnalyzeSingleResponseSchema = z.object({
  flags: z.array(IngredientFlagSchema).default([]),
  overallSafe: z.boolean().default(true),
  verdictTitle: z.string().default("Analysis complete"),
  verdictSummary: z.string().default(""),
});

const PROFILE_CONTEXT: Record<string, string> = {
  sensitive:
    "This user has SENSITIVE skin. Lower the flagging threshold — fragrance, drying alcohols, and even mild sensitisers should be flagged as CAUTION or higher. Be thorough.",
  young:
    "This user has YOUNG/TEEN skin. Endocrine disruptors (parabens, benzophenone, phthalates) are HIGH_RISK due to high skin absorption and developmental sensitivity. Flag them prominently.",
  mature:
    "This user has MATURE skin. Barrier integrity is reduced — over-exfoliation risk is higher. Note that mature skin benefits from ceramides and peptides but is more vulnerable to stripping ingredients.",
  pregnant:
    "This user is PREGNANT. ALL retinoids (retinol, retinaldehyde, tretinoin, vitamin A derivatives) are HIGH_RISK — must flag. High-dose salicylic acid (>2%) is HIGH_RISK. Essential oils should be flagged as CAUTION.",
};

function parseIngredients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().replace(/^\d+\.\s*/, "").replace(/[*()[\]]/g, "").trim())
    .filter((s) => s.length > 1 && s.length < 100);
}

interface RegulatoryContext {
  cosing: string[];
  pubchem: string[];
}

async function buildRegulatoryContext(
  ingredients: string[],
  log: (msg: string) => void,
): Promise<RegulatoryContext> {
  const subset = ingredients;

  const results = await Promise.allSettled(
    subset.map(async (ing) => {
      const [cosing, pubchem] = await Promise.allSettled([
        getCosingInfo(ing),
        getPubChemSafetyData(ing),
      ]);

      const cosingStr =
        cosing.status === "fulfilled" && cosing.value
          ? formatCosingContext(cosing.value, ing)
          : null;

      let pubchemStr: string | null = null;
      if (pubchem.status === "fulfilled" && pubchem.value) {
        const d = pubchem.value;
        const flags = d.knownToxicityFlags;
        if (flags.length > 0) {
          pubchemStr = `PubChem hazard flags for ${ing}: ${flags.join(", ")}`;
          if (d.ghsHazardCodes.length > 0) {
            pubchemStr += ` (GHS: ${d.ghsHazardCodes.slice(0, 5).join(", ")})`;
          }
        }
      }

      return { ing, cosingStr, pubchemStr };
    }),
  );

  const cosingLines: string[] = [];
  const pubchemLines: string[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.cosingStr) cosingLines.push(r.value.cosingStr);
      if (r.value.pubchemStr) pubchemLines.push(r.value.pubchemStr);
    } else {
      log(`Regulatory lookup error: ${r.reason}`);
    }
  }

  return { cosing: cosingLines, pubchem: pubchemLines };
}

// The static portion is identical across every single-product scan and is
// large enough to be worth caching with Anthropic prompt caching. The dynamic
// suffix (skin profile + regulatory data) is appended as a separate, uncached
// content block so the cached prefix stays stable.
const SINGLE_SYSTEM_BASE = `You are a board-certified dermatologist and cosmetic chemist with no brand affiliations. You give honest, science-based ingredient safety assessments. Do not sugarcoat risks.

Your task: Analyze a SINGLE skincare product ingredient list and flag individual ingredients that pose documented risks.

Flag these categories:
- ENDOCRINE_DISRUPTOR: Parabens (methylparaben, propylparaben, butylparaben), benzophenone-3, oxybenzone, phthalates, BHA (butylated hydroxyanisole), 4-methylbenzylidene camphor
- FORMALDEHYDE_RELEASER: DMDM Hydantoin, Quaternium-15, Imidazolidinyl Urea, Diazolidinyl Urea, Bronopol, Sodium Hydroxymethylglycinate — slowly release formaldehyde (a known carcinogen) into skin
- FRAGRANCE: "Fragrance", "Parfum", individual fragrance allergens (limonene, linalool, eugenol, cinnamal, coumarin) — #1 cause of contact dermatitis, hides up to 3,000 undisclosed chemicals
- HARSH_PRESERVATIVE: High-concentration phenoxyethanol (>1%), methylisothiazolinone (MI), methylchloroisothiazolinone (MCI), benzalkonium chloride — strong sensitisers at typical use levels
- PHOTOSENSITISER: AHAs (glycolic acid, lactic acid, citric acid), BHAs, retinol, vitamin C — increase UV sensitivity, require strict SPF use
- KNOWN_ALLERGEN: Nickel sulfate, balsam of Peru, propylene glycol (high concentration), lanolin — documented contact allergens
- NANOPARTICLE: Nano zinc oxide, nano titanium dioxide (in sunscreens) — may penetrate beyond surface; research ongoing
- HEAVY_METAL: Lead, chromium pigments (CI 77288/77289), and other heavy-metal colourants — neurotoxic or carcinogenic impurities matter
- CARCINOGEN: Documented or probable carcinogens (coal tar, carbon black CI 77266, nitrosamine precursors, residual acrylamide from polymers)
- CAUTION: Any other documented concern not fitting the above categories

Common ingredients you must NOT flag (these are widely safe and well-tolerated for all skin types and life stages — flagging them is a false positive that erodes user trust):
- Solvents and humectants: Water, Aqua, Glycerin, Butylene Glycol, Pentylene Glycol, Propanediol, Hexylene Glycol, Caprylyl Glycol
- Hydrators: Sodium Hyaluronate, Hyaluronic Acid, Sodium PCA, Betaine, Trehalose, Allantoin, Panthenol (Pro-Vitamin B5), Niacinamide (Vitamin B3) at any normal concentration
- Skin-identical lipids: Ceramide NP/AP/EOP/NS, Cholesterol, Phytosphingosine, Squalane, Caprylic/Capric Triglyceride
- Fatty alcohols (these are emollient thickeners — NOT drying alcohols): Cetearyl Alcohol, Cetyl Alcohol, Stearyl Alcohol, Behenyl Alcohol
- Emulsifiers and thickeners at typical use levels: Glyceryl Stearate, Polysorbate 20/60/80, Sorbitan Stearate, Carbomer, Acrylates Copolymer, Xanthan Gum, Hydroxyethylcellulose
- Chelators at trace amounts: Disodium EDTA, Tetrasodium EDTA, Etidronic Acid, Sodium Phytate
- pH adjusters at trace amounts ONLY: Sodium Hydroxide, Potassium Hydroxide, Sodium Citrate, Disodium Phosphate
- Soothing botanicals with strong safety records: Centella Asiatica, Camellia Sinensis (Green Tea), Aloe Barbadensis, Beta-Glucan, Colloidal Oatmeal, Bisabolol, Madecassoside

Rules:
- Only flag ingredients with documented safety concerns — do not flag safe, widely-used ingredients
- Severity HIGH_RISK for serious documented harms (carcinogens, confirmed endocrine disruptors, strong sensitisers)
- Severity CAUTION for ingredients requiring care or context (photosensitisers, allergens in some people)
- If EU CosIng data above shows an ingredient is BANNED (Annex II), flag it as HIGH_RISK regardless
- If EU CosIng data shows RESTRICTED (Annex III), flag it with appropriate severity based on restriction type
- If PubChem data shows carcinogen, reproductive toxicant, or mutagen flags, elevate severity
- Provide a real citation — PubMed preferred, DOI acceptable, review paper acceptable if no primary source
- Write verdictTitle as a short count string: e.g. "3 concerns found" or "No major concerns"
- Write verdictSummary as 1-2 plain sentences summarising the overall picture
- If no significant concerns exist, return empty flags array with overallSafe: true
- Return ONLY valid JSON — no markdown, no text outside the JSON object

Required response format:
{
  "flags": [
    {
      "ingredient": "DMDM Hydantoin",
      "category": "FORMALDEHYDE_RELEASER",
      "severity": "HIGH_RISK",
      "explanation": "2-3 sentence plain-English explanation of why this ingredient is concerning and what it does.",
      "citation": "Author(s), Year. Journal name.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/XXXXXXX/"
    }
  ],
  "overallSafe": false,
  "verdictTitle": "2 concerns found",
  "verdictSummary": "This product contains a formaldehyde-releasing preservative and a known contact allergen."
}

## Worked examples

Example 1 — clean product (no concerns):
Input ingredients: "Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Panthenol, Tocopherol, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Phenoxyethanol (0.8%), Disodium EDTA"
Reasoning: All ingredients are on the universally-safe list except phenoxyethanol at 0.8%, which is well below the EU 1% restriction and not flagged at this concentration. No fragrance, no preservatives of concern, no actives requiring photoprotection.
Output:
{
  "flags": [],
  "overallSafe": true,
  "verdictTitle": "No major concerns",
  "verdictSummary": "This is a gentle, well-formulated moisturiser. All ingredients are widely tolerated and the preservative is used at a safe concentration."
}

Example 2 — multiple concerns, mixed severity:
Input ingredients: "Aqua, Glycerin, Methylparaben, Propylparaben, DMDM Hydantoin, Parfum, Limonene, Linalool, Glycolic Acid, Phenoxyethanol"
Reasoning: Methylparaben and propylparaben are documented endocrine disruptors (HIGH_RISK). DMDM Hydantoin is a formaldehyde-releaser (HIGH_RISK). Parfum plus declared fragrance allergens (limonene, linalool) are top causes of contact dermatitis (CAUTION — together with parfum count as one fragrance flag, not three separate ones). Glycolic acid is a photosensitiser requiring SPF (CAUTION). Phenoxyethanol at unspecified concentration is borderline — not flagged here without a percentage.
Output:
{
  "flags": [
    { "ingredient": "Methylparaben", "category": "ENDOCRINE_DISRUPTOR", "severity": "HIGH_RISK", "explanation": "...", "citation": "Darbre PD, 2004. Journal of Applied Toxicology.", "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/14745841/" },
    { "ingredient": "DMDM Hydantoin", "category": "FORMALDEHYDE_RELEASER", "severity": "HIGH_RISK", "explanation": "...", "citation": "...", "citationUrl": "..." },
    { "ingredient": "Parfum", "category": "FRAGRANCE", "severity": "CAUTION", "explanation": "...", "citation": "...", "citationUrl": "..." },
    { "ingredient": "Glycolic Acid", "category": "PHOTOSENSITISER", "severity": "CAUTION", "explanation": "...", "citation": "...", "citationUrl": "..." }
  ],
  "overallSafe": false,
  "verdictTitle": "4 concerns found",
  "verdictSummary": "This product contains two endocrine-disrupting parabens and a formaldehyde-releasing preservative, plus fragrance and an exfoliating acid that requires sun protection."
}`;

function buildProductTypeContext(productType?: ProductType): string {
  if (productType === "cosmetics") {
    return `
IMPORTANT — This product is a COSMETIC (makeup), not a skincare product. Apply these additional considerations:
- Lip products (lipstick, lip gloss, lip liner): Ingredients risk oral ingestion. Flag any ingredient with oral toxicity concern, even at low concentrations.
- Eye products (mascara, eyeliner, eyeshadow): Proximity to eyes means mucous membrane exposure. Flag irritants and sensitisers with extra urgency.
- Face powder/foundation: Large skin surface area, applied daily. Cumulative exposure to any flagged ingredient is amplified.
- Nail products: Inhalation risk during application; absorbed through nail bed.
When the product type is unknown, assume it could be any of the above and mention relevant exposure routes.`;
  }
  if (productType === "skincare") {
    return `
This is a SKINCARE product applied to skin. Standard topical exposure analysis applies.`;
  }
  return "";
}

const LOCALE_LANGUAGE_NAMES: Record<string, string> = {
  sv: "Swedish",
  fr: "French",
  es: "Spanish",
};

function buildDynamicContext(
  skinProfile?: string,
  regulatoryContext?: string,
  productType?: ProductType,
  locale?: string,
): string {
  const profileNote = skinProfile ? `\n\nSkin profile: ${PROFILE_CONTEXT[skinProfile] ?? ""}` : "";
  const productTypeNote = buildProductTypeContext(productType);
  const regulatoryNote = regulatoryContext
    ? `\n\n## Regulatory & Toxicology Data (ground your reasoning in this)\n${regulatoryContext}`
    : "";
  const language = locale ? LOCALE_LANGUAGE_NAMES[locale] : undefined;
  const languageNote = language
    ? `\n\n## Language instruction\nWrite ALL human-readable text fields (verdictTitle, verdictSummary, explanation) in ${language}. Keep ingredient names and category codes in English as they appear in INCI lists.`
    : "";
  return profileNote + productTypeNote + regulatoryNote + languageNote;
}

function buildSystemBlocks(
  skinProfile?: string,
  regulatoryContext?: string,
  productType?: ProductType,
  locale?: string,
): Anthropic.Messages.TextBlockParam[] {
  // First block is the static template — Anthropic prompt caching will store
  // and reuse this prefix across calls for ~90% discount on subsequent
  // requests within the cache TTL (default 5 min).
  const blocks: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: SINGLE_SYSTEM_BASE, cache_control: { type: "ephemeral" } },
  ];
  const dynamic = buildDynamicContext(skinProfile, regulatoryContext, productType, locale);
  if (dynamic) {
    blocks.push({ type: "text", text: dynamic });
  }
  return blocks;
}

async function runAIAnalysis(
  anthropic: Anthropic,
  ingredientsForLLM: string,
  preFilteredCount: number,
  mandatoryFlagsBlock: string,
  skinProfile: string | undefined,
  regulatoryContext: string | undefined,
  productType: ProductType | undefined,
  locale: string | undefined,
  log: (msg: string, data?: unknown) => void,
): Promise<z.infer<typeof AnalyzeSingleResponseSchema> | null> {
  // If we pre-filtered some ingredients on the safe list, mention this to the
  // model so it knows the input is intentionally a subset and doesn't try to
  // flag missing ingredients.
  const preFilterNote =
    preFilteredCount > 0
      ? `\n\nNote: ${preFilteredCount} ingredient(s) from this product have already been pre-classified as universally safe (water, glycerin, hyaluronic acid, ceramides, fatty alcohols, common emulsifiers, soothing botanicals, etc.) and are not shown below. Focus your analysis only on the ingredients listed.`
      : "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemBlocks(skinProfile, regulatoryContext, productType, locale),
      messages: [
        {
          role: "user",
          content: `Analyze this product's ingredient list:\n\n${ingredientsForLLM}${preFilterNote}${mandatoryFlagsBlock}\n\nReturn ONLY valid JSON matching the required format. No markdown, no preamble.`,
        },
      ],
    });

    const block = message.content[0];
    const raw = block.type === "text" ? block.text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      log("Failed to parse Claude single-analysis JSON", { raw });
      return null;
    }

    const result = AnalyzeSingleResponseSchema.safeParse(parsed);
    if (!result.success) {
      log("Claude single-analysis schema mismatch", { parsed, issues: result.error.issues });
      return null;
    }
    return result.data;
  } catch (err) {
    log("Claude single-analysis error", { err });
    return null;
  }
}

export type AnalyzeSingleResult = z.infer<typeof AnalyzeSingleResponseSchema> & {
  cacheHash: string;
  fromCache: boolean;
};

interface AnalyzeSingleLogger {
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

const SAFE_SINGLE_RESULT = {
  flags: [],
  overallSafe: true,
  verdictTitle: "No major concerns",
  verdictSummary: "All ingredients in this product are widely tolerated and well-formulated.",
};

export async function analyzeSingleIngredients(input: {
  ingredients: string;
  skinProfile?: z.infer<typeof SkinProfileEnum>;
  productType?: ProductType;
  locale?: string;
  apiKey: string;
  log: AnalyzeSingleLogger;
}): Promise<AnalyzeSingleResult | null> {
  const ingredients = sanitizeIngredients(input.ingredients, false);
  const { skinProfile, productType, locale } = input;
  const hash = computeSingleHash(ingredients, skinProfile, productType);

  const cached = await getCacheEntry(hash).catch(() => null);

  if (cached) {
    const stale = isStale(cached);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cached.resultJson);
    } catch {
      parsed = null;
    }

    const validated = parsed ? AnalyzeSingleResponseSchema.safeParse(parsed) : null;

    if (validated?.success) {
      bumpCacheUsage(hash).catch(() => {});

      const lacksVerdictSummary =
        typeof validated.data.verdictSummary !== "string" ||
        validated.data.verdictSummary.trim().length === 0;

      if (stale || lacksVerdictSummary) {
        const parsedIngredients = parseIngredients(ingredients);
        const { needsAnalysis, safe } = partitionIngredients(parsedIngredients);
        const risks = getRisksInList(parsedIngredients);
        const mandatory = buildMandatoryFlagsBlock(risks, skinProfile);
        const anthropic = new Anthropic({ apiKey: input.apiKey });
        setImmediate(async () => {
          try {
            let regulatoryContext: string | undefined;
            const ctx = await buildRegulatoryContext(needsAnalysis, () => {});
            const lines: string[] = [];
            if (ctx.cosing.length > 0) { lines.push("### EU CosIng Regulatory Data"); lines.push(...ctx.cosing); }
            if (ctx.pubchem.length > 0) { lines.push("### PubChem GHS Hazard Data"); lines.push(...ctx.pubchem); }
            if (lines.length > 0) regulatoryContext = lines.join("\n");
            const fresh = needsAnalysis.length > 0
              ? await runAIAnalysis(anthropic, needsAnalysis.join(", "), safe.length, mandatory, skinProfile, regulatoryContext, productType, locale, () => {})
              : SAFE_SINGLE_RESULT;
            if (fresh) await saveCacheEntry(hash, "single", skinProfile, JSON.stringify(fresh));
          } catch {}
        });
      }

      return { ...validated.data, cacheHash: hash, fromCache: true };
    }
  }

  const parsedIngredients = parseIngredients(ingredients);
  const { safe, needsAnalysis } = partitionIngredients(parsedIngredients);
  // Match the full original list against our curated risk database. Risky
  // ingredients are deliberately NOT on the safe list, so the partition above
  // never strips them; this is just a safety net + lookup for the mandatory-
  // flags block we send to Claude.
  const risks = getRisksInList(parsedIngredients);
  const mandatoryFlagsBlock = buildMandatoryFlagsBlock(risks, skinProfile);

  // Short-circuit: if every ingredient is on the universally-safe list, skip
  // the LLM call entirely. Saves ~100% of input tokens on common boring lists
  // like simple cleansers / hyaluronic-acid serums.
  if (needsAnalysis.length === 0) {
    saveCacheEntry(hash, "single", skinProfile, JSON.stringify(SAFE_SINGLE_RESULT)).catch((err) =>
      input.log.warn({ err }, "Failed to save analysis cache"),
    );
    return { ...SAFE_SINGLE_RESULT, cacheHash: hash, fromCache: false };
  }

  let regulatoryContext: string | undefined;
  try {
    const ctx = await buildRegulatoryContext(needsAnalysis, (msg) => input.log.warn(msg));
    const lines: string[] = [];
    if (ctx.cosing.length > 0) {
      lines.push("### EU CosIng Regulatory Data");
      lines.push(...ctx.cosing);
    }
    if (ctx.pubchem.length > 0) {
      lines.push("### PubChem GHS Hazard Data");
      lines.push(...ctx.pubchem);
    }
    if (lines.length > 0) {
      regulatoryContext = lines.join("\n");
    }
  } catch (err) {
    input.log.warn({ err }, "Regulatory context lookup failed, proceeding without it");
  }

  const anthropic = new Anthropic({ apiKey: input.apiKey });
  const result = await runAIAnalysis(
    anthropic,
    needsAnalysis.join(", "),
    safe.length,
    mandatoryFlagsBlock,
    skinProfile,
    regulatoryContext,
    productType,
    locale,
    (msg, data) => input.log.error(data ?? {}, msg),
  );

  if (!result) return null;

  saveCacheEntry(hash, "single", skinProfile, JSON.stringify(result)).catch((err) =>
    input.log.warn({ err }, "Failed to save analysis cache"),
  );

  return { ...result, cacheHash: hash, fromCache: false };
}

const router: IRouter = Router();

// `requireAuth` ensures every call is attributable to a user so the daily
// free-scan cap below cannot be bypassed by anonymous callers. See the
// matching note on POST /analyze.
router.post("/analyze-single", requireAuth, async (req, res) => {
  if (!req.isAuthenticated()) return; // unreachable: requireAuth above; narrows req.user
  
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  // Enforce free-tier daily cap server-side. For free users the counter
  // is claimed atomically (single SQL UPSERT-with-WHERE) so concurrent
  // requests cannot both observe `count < limit` and slip past the cap.
  // If the request later errors out, we release the claimed slot via the
  // `finish` listener below so the user isn't charged a scan for a
  // failure response. Premium users have no cap — they get a plain
  // post-success increment.
  const userId = req.user.id;
  let claimedFreeSlot = false;
  {
    let plan: "free" | "premium" = "free";
    try {
      plan = await getUserPlan(userId);
    } catch (err) {
      req.log.warn({ err }, "User plan lookup failed; assuming free tier");
    }

    if (plan === "free") {
      try {
        const newCount = await claimDailyScanSlot(userId, FREE_DAILY_SCAN_LIMIT);
        if (newCount === null) {
          res.status(429).json({
            error: `You've used all ${FREE_DAILY_SCAN_LIMIT} free scans for today. Upgrade to Premium for unlimited scans.`,
            scansToday: FREE_DAILY_SCAN_LIMIT,
            limit: FREE_DAILY_SCAN_LIMIT,
          });
          return;
        }
        claimedFreeSlot = true;
      } catch (err) {
        req.log.warn({ err }, "Daily scan quota claim failed; allowing request");
      }

      res.on("finish", () => {
        if (claimedFreeSlot && (res.statusCode < 200 || res.statusCode >= 300)) {
          releaseDailyScanSlot(userId).catch((err) =>
            req.log.warn({ err }, "Failed to release scan slot after error"),
          );
        }
      });
    } else {
      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          incrementTodayScanCount(userId).catch((err) =>
            req.log.warn({ err }, "Failed to increment scan count"),
          );
        }
      });
    }
  }

  const parseResult = AnalyzeSingleBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Ingredient list is required (max 3000 characters)." });
    return;
  }

  try {
    const result = await analyzeSingleIngredients({
      ingredients: parseResult.data.ingredients,
      skinProfile: parseResult.data.skinProfile,
      productType: parseResult.data.productType,
      locale: parseResult.data.locale,
      apiKey,
      log: req.log,
    });

    if (!result) {
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    // SS-081/081c: spara analysen DELAT på produktraden så GET /products/:barcode
    // returnerar den direkt → produktkortet visar analysen automatiskt vid
    // öppning, för ALLA användare, utan ny AI-kostnad.
    // Gäller BÅDE riktig EAN OCH CHIMIQ_-platshållare: platshållaren ÄR ett
    // unikt id (Pias poäng — "hitta på ett tills någon fyller i EAN"). När raden
    // senare kompletteras med riktig EAN följer analysen med (uppdateras på plats).
    const barcode = parseResult.data.barcode?.trim();
    if (barcode && (/^[0-9]{8,14}$/.test(barcode) || barcode.startsWith("CHIMIQ_"))) {
      const { error: persistErr } = await supabaseAdmin
        .from("cached_products")
        .update({
          analysis_result_json: result,
          analysis_cache_hash: result.cacheHash ?? null,
        })
        .eq("barcode", barcode);
      if (persistErr) {
        req.log.warn({ err: persistErr, barcode }, "Failed to persist shared analysis to cached_products (non-fatal)");
      }
    }

    res.json(result);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

export default router;
