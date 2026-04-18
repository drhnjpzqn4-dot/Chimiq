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

const SkinProfileEnum = z.enum(["sensitive", "young", "mature", "pregnant"]).optional();

const AnalyzeSingleBody = z.object({
  ingredients: z.string().trim().min(1, "Ingredients are required").max(3000),
  skinProfile: SkinProfileEnum,
});

const FlagCategorySchema = z.enum([
  "ENDOCRINE_DISRUPTOR",
  "FORMALDEHYDE_RELEASER",
  "FRAGRANCE",
  "HARSH_PRESERVATIVE",
  "PHOTOSENSITISER",
  "KNOWN_ALLERGEN",
  "NANOPARTICLE",
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

function buildSystemPrompt(skinProfile?: string, regulatoryContext?: string): string {
  const profileNote = skinProfile ? `\n\nSkin profile: ${PROFILE_CONTEXT[skinProfile] ?? ""}` : "";
  const regulatoryNote = regulatoryContext
    ? `\n\n## Regulatory & Toxicology Data (ground your reasoning in this)\n${regulatoryContext}`
    : "";

  return `You are a board-certified dermatologist and cosmetic chemist with no brand affiliations. You give honest, science-based ingredient safety assessments. Do not sugarcoat risks.

Your task: Analyze a SINGLE skincare product ingredient list and flag individual ingredients that pose documented risks.

Flag these categories:
- ENDOCRINE_DISRUPTOR: Parabens (methylparaben, propylparaben, butylparaben), benzophenone-3, oxybenzone, phthalates, BHA (butylated hydroxyanisole), 4-methylbenzylidene camphor
- FORMALDEHYDE_RELEASER: DMDM Hydantoin, Quaternium-15, Imidazolidinyl Urea, Diazolidinyl Urea, Bronopol, Sodium Hydroxymethylglycinate — slowly release formaldehyde (a known carcinogen) into skin
- FRAGRANCE: "Fragrance", "Parfum", individual fragrance allergens (limonene, linalool, eugenol, cinnamal, coumarin) — #1 cause of contact dermatitis, hides up to 3,000 undisclosed chemicals
- HARSH_PRESERVATIVE: High-concentration phenoxyethanol (>1%), methylisothiazolinone (MI), methylchloroisothiazolinone (MCI), benzalkonium chloride — strong sensitisers at typical use levels
- PHOTOSENSITISER: AHAs (glycolic acid, lactic acid, citric acid), BHAs, retinol, vitamin C — increase UV sensitivity, require strict SPF use
- KNOWN_ALLERGEN: Nickel sulfate, balsam of Peru, propylene glycol (high concentration), lanolin — documented contact allergens
- NANOPARTICLE: Nano zinc oxide, nano titanium dioxide (in sunscreens) — may penetrate beyond surface; research ongoing
- CAUTION: Any other documented concern not fitting the above categories${profileNote}${regulatoryNote}

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
}`;
}

async function runAIAnalysis(
  anthropic: Anthropic,
  ingredients: string,
  skinProfile: string | undefined,
  regulatoryContext: string | undefined,
  log: (msg: string, data?: unknown) => void,
): Promise<z.infer<typeof AnalyzeSingleResponseSchema> | null> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemPrompt(skinProfile, regulatoryContext),
      messages: [
        {
          role: "user",
          content: `Analyze this product's ingredient list:\n\n${ingredients}\n\nReturn ONLY valid JSON matching the required format. No markdown, no preamble.`,
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

const router: IRouter = Router();

router.post("/analyze-single", async (req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  const parseResult = AnalyzeSingleBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Ingredient list is required (max 3000 characters)." });
    return;
  }

  let ingredients: string;
  try {
    ingredients = sanitizeIngredients(parseResult.data.ingredients, false);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  const { skinProfile } = parseResult.data;
  const hash = computeSingleHash(ingredients, skinProfile);

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

      if (stale) {
        const parsedIngredients = parseIngredients(ingredients);
        const anthropic = new Anthropic({ apiKey, baseURL });
        setImmediate(async () => {
          try {
            let regulatoryContext: string | undefined;
            const ctx = await buildRegulatoryContext(parsedIngredients, () => {});
            const lines: string[] = [];
            if (ctx.cosing.length > 0) { lines.push("### EU CosIng Regulatory Data"); lines.push(...ctx.cosing); }
            if (ctx.pubchem.length > 0) { lines.push("### PubChem GHS Hazard Data"); lines.push(...ctx.pubchem); }
            if (lines.length > 0) regulatoryContext = lines.join("\n");
            const fresh = await runAIAnalysis(anthropic, ingredients, skinProfile, regulatoryContext, () => {});
            if (fresh) await saveCacheEntry(hash, "single", skinProfile, JSON.stringify(fresh));
          } catch {}
        });
      }

      return res.json({ ...validated.data, cacheHash: hash, fromCache: true });
    }
  }

  const parsedIngredients = parseIngredients(ingredients);

  let regulatoryContext: string | undefined;
  try {
    const ctx = await buildRegulatoryContext(parsedIngredients, (msg) => req.log.warn(msg));
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
    req.log.warn({ err }, "Regulatory context lookup failed, proceeding without it");
  }

  const anthropic = new Anthropic({ apiKey, baseURL });
  const result = await runAIAnalysis(
    anthropic,
    ingredients,
    skinProfile,
    regulatoryContext,
    (msg, data) => req.log.error(data ?? {}, msg),
  );

  if (!result) {
    res.status(500).json({ error: "Analysis failed. Please try again." });
    return;
  }

  saveCacheEntry(hash, "single", skinProfile, JSON.stringify(result)).catch((err) =>
    req.log.warn({ err }, "Failed to save analysis cache"),
  );

  res.json({ ...result, cacheHash: hash, fromCache: false });
});

export default router;
