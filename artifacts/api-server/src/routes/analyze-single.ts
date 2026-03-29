import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

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

function buildSystemPrompt(skinProfile?: string): string {
  const profileNote = skinProfile ? `\n\nSkin profile: ${PROFILE_CONTEXT[skinProfile] ?? ""}` : "";

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
- CAUTION: Any other documented concern not fitting the above categories${profileNote}

Rules:
- Only flag ingredients with documented safety concerns — do not flag safe, widely-used ingredients
- Severity HIGH_RISK for serious documented harms (carcinogens, confirmed endocrine disruptors, strong sensitisers)
- Severity CAUTION for ingredients requiring care or context (photosensitisers, allergens in some people)
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

  const { ingredients, skinProfile } = parseResult.data;

  const anthropic = new Anthropic({ apiKey, baseURL });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemPrompt(skinProfile),
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
      req.log.error({ raw }, "Failed to parse Claude single-analysis JSON");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    const result = AnalyzeSingleResponseSchema.safeParse(parsed);

    if (!result.success) {
      req.log.error({ parsed, issues: result.error.issues }, "Claude single-analysis schema mismatch");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "Claude single-analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
