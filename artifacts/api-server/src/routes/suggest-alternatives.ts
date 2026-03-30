import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const SuggestAlternativesBody = z.object({
  ingredients: z.string().trim().min(1).max(3000),
  flaggedIngredients: z.array(z.string()).min(1).max(20),
  productType: z.string().trim().min(1).max(100).optional(),
});

const AlternativeSuggestionSchema = z.object({
  name: z.string(),
  brand: z.string(),
  whySafer: z.string(),
  keyImprovement: z.string(),
});

const SuggestAlternativesResponseSchema = z.object({
  alternatives: z.array(AlternativeSuggestionSchema).min(2).max(3),
  inferredProductType: z.string(),
});

function buildAlternativesPrompt(
  ingredients: string,
  flaggedIngredients: string[],
  productType?: string,
): string {
  const productTypeHint = productType
    ? `The product is a ${productType}.`
    : "Infer the product type from the ingredient list (e.g. moisturiser, cleanser, SPF sunscreen, serum, toner, eye cream).";

  return `You are a cosmetic chemist and clean beauty expert with no brand affiliations. A user's skincare product has been flagged with safety concerns. Your job: suggest 2-3 real, widely-available products that serve the same function but are formulated without the flagged ingredients.

${productTypeHint}

Flagged ingredients found in the scanned product:
${flaggedIngredients.map((i) => `- ${i}`).join("\n")}

Full ingredient list of the scanned product:
${ingredients}

Rules:
- Suggest 2-3 REAL, currently available products (not fictional brands)
- Prioritise products sold in Sephora, Ulta, Boots, Cult Beauty, or major pharmacies
- The suggested product must be formulated WITHOUT the flagged ingredients above
- whySafer: 1 concise sentence explaining why this product is a safer choice (mention the specific avoided ingredient)
- keyImprovement: a short phrase citing the specific ingredient improvement (e.g. "No fragrance allergens", "Paraben-free", "No formaldehyde releasers")
- inferredProductType: what type of product this is (short, e.g. "moisturiser", "cleanser", "SPF 50 sunscreen")
- Be direct and editorial — not promotional language
- Return ONLY valid JSON — no markdown, no text outside the JSON object

Required response format:
{
  "inferredProductType": "moisturiser",
  "alternatives": [
    {
      "name": "Ultra Repair Cream",
      "brand": "First Aid Beauty",
      "whySafer": "Contains no parabens or formaldehyde releasers — relies on colloidal oatmeal and shea butter for barrier repair.",
      "keyImprovement": "No parabens, no DMDM Hydantoin"
    },
    {
      "name": "Moisturising Lotion SPF 15",
      "brand": "CeraVe",
      "whySafer": "Fragrance-free formula with ceramides and hyaluronic acid — none of the flagged sensitisers.",
      "keyImprovement": "Fragrance-free, no harsh preservatives"
    }
  ]
}`;
}

const router: IRouter = Router();

router.post("/suggest-alternatives", async (req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Suggestions service is not available. Please try again later." });
    return;
  }

  const parseResult = SuggestAlternativesBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "ingredients and at least one flaggedIngredient are required." });
    return;
  }

  const { ingredients, flaggedIngredients, productType } = parseResult.data;

  const anthropic = new Anthropic({ apiKey, baseURL });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildAlternativesPrompt(ingredients, flaggedIngredients, productType),
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
      req.log.error({ raw }, "Failed to parse Claude alternatives JSON");
      res.status(500).json({ error: "Could not generate suggestions. Please try again." });
      return;
    }

    const result = SuggestAlternativesResponseSchema.safeParse(parsed);

    if (!result.success) {
      req.log.error({ parsed, issues: result.error.issues }, "Claude alternatives schema mismatch");
      res.status(500).json({ error: "Could not generate suggestions. Please try again." });
      return;
    }

    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "Claude alternatives error");
    res.status(500).json({ error: "Could not generate suggestions. Please try again." });
  }
});

export default router;
