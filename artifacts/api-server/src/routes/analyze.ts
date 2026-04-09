import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCosingInfo, formatCosingContext } from "../lib/cosing.js";
import { getPubChemSafetyData } from "../lib/pubchem.js";

const SkinProfileEnum = z.enum(["sensitive", "young", "mature", "pregnant"]).optional();

const AnalyzeBody = z.object({
  product1: z.string().trim().min(1, "Product 1 ingredients are required").max(3000),
  product2: z.string().trim().min(1, "Product 2 ingredients are required").max(3000),
  skinProfile: SkinProfileEnum,
});

const ConflictResultSchema = z.object({
  pair: z.string(),
  severity: z.enum(["HIGH_RISK", "CAUTION", "SAFE"]),
  explanation: z.string(),
  citation: z.string(),
  citationUrl: z.string(),
});

const AnalyzeResponseSchema = z.object({
  conflicts: z.array(ConflictResultSchema).default([]),
  overallSafe: z.boolean().default(true),
});

const PROFILE_CONTEXT: Record<string, string> = {
  sensitive:
    "This user has SENSITIVE skin. Lower your threshold for flagging irritants — even CAUTION-level irritants should be flagged. Note any fragrance, drying alcohols, or sensitising preservatives.",
  young:
    "This user has YOUNG/TEEN skin. Flag endocrine disruptors (parabens, benzophenone, phthalates) with extra urgency as HIGH_RISK. Young skin has higher absorption rates and long-term hormonal disruption is especially concerning.",
  mature:
    "This user has MATURE skin. Note barrier function considerations — mature skin is more vulnerable to over-exfoliation and barrier damage. Flag high-strength exfoliant combinations with extra caution.",
  pregnant:
    "This user is PREGNANT. Flag ALL retinoids (retinol, tretinoin, retinaldehyde) and high-dose salicylic acid (>2%) as HIGH_RISK regardless of other context. Also flag essential oils and vitamin A derivatives.",
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

  return `You are a board-certified dermatologist and cosmetic chemist. You are completely independent — no brand affiliations, no sponsored opinions. Be honest. Do not sugarcoat risks.

Your task: Analyze two skincare product ingredient lists and identify clinically-relevant conflict pairs between ingredients from the two different products.

Red flags to prioritise:
- Retinol/retinoids + AHAs/BHAs at the same time (barrier destruction, severe irritation)
- Benzoyl peroxide + retinol (oxidises and deactivates retinol — wastes money, damages skin)
- Vitamin C (L-ascorbic acid) + Niacinamide at high concentrations (can form niacin, cause flushing)
- Multiple exfoliants used together (AHA + BHA + physical = over-exfoliation spiral)
- Retinoids without SPF use (dramatically increases UV damage risk)
- Kojic acid + Vitamin C (compete for same pathway, reduce efficacy, increase sensitisation)${profileNote}${regulatoryNote}

Rules:
- ONLY flag conflicts with real, documented research backing
- Focus on cross-product conflicts (ingredients from Product 1 interacting with ingredients from Product 2)
- Sort results: HIGH_RISK first, then CAUTION, then SAFE
- Only include SAFE pairs if they address a very common concern (e.g. retinol + niacinamide — many people worry unnecessarily)
- If no meaningful conflicts exist, return an empty conflicts array with overallSafe: true
- Provide real citation author/year/journal — use PubMed or DOI links when known. If no specific paper, use a relevant dermatology journal or textbook reference.
- Return ONLY valid JSON — no markdown, no text outside the JSON object

Required response format:
{
  "conflicts": [
    {
      "pair": "Ingredient A + Ingredient B",
      "severity": "HIGH_RISK",
      "explanation": "2-3 sentence plain-English explanation of the interaction and its effects on skin.",
      "citation": "Author(s), Year. Journal name.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/XXXXXXX/"
    }
  ],
  "overallSafe": false
}`;
}

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  const parseResult = AnalyzeBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Both ingredient lists are required (max 3000 characters each).",
    });
    return;
  }

  const { product1, product2, skinProfile } = parseResult.data;

  const ingredients1 = parseIngredients(product1);
  const ingredients2 = parseIngredients(product2);
  const allIngredients = [...new Set([...ingredients1, ...ingredients2])];

  let regulatoryContext: string | undefined;
  try {
    const ctx = await buildRegulatoryContext(allIngredients, (msg) => req.log.warn(msg));
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemPrompt(skinProfile, regulatoryContext),
      messages: [
        {
          role: "user",
          content: `Product 1 ingredients:\n${product1}\n\nProduct 2 ingredients:\n${product2}\n\nReturn ONLY valid JSON matching the required format. No markdown, no preamble.`,
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
      req.log.error({ raw }, "Failed to parse Claude JSON response");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    const result = AnalyzeResponseSchema.safeParse(parsed);

    if (!result.success) {
      req.log.error({ parsed, issues: result.error.issues }, "Claude response schema mismatch");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "Claude analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
