import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";

export const RecipeIngredientSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().max(60).optional(),
  notes: z.string().max(200).optional(),
});

/**
 * Schema matches the persisted `RecipeAiVerdict` shape in lib/db/src/schema/recipes.ts.
 * `reviewedAt` and `modelVersion` are added server-side after the model returns,
 * so the model is only asked to return the analysis fields.
 */
export const RecipeAiVerdictModelSchema = z.object({
  riskLevel: z.enum(["safe", "caution", "high_risk"]),
  summary: z.string().max(600),
  flagged: z.array(
    z.object({
      ingredient: z.string().max(120),
      reason: z.string().max(400),
      severity: z.enum(["info", "warn", "danger"]),
    }),
  ),
  warnings: z.array(z.string().max(300)),
  saferSwaps: z.array(
    z.object({
      from: z.string().max(120),
      to: z.string().max(120),
      why: z.string().max(300),
    }),
  ),
});

export type RecipeAiVerdictModel = z.infer<typeof RecipeAiVerdictModelSchema>;
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeAiVerdict = RecipeAiVerdictModel & {
  reviewedAt: string;
  modelVersion: string;
};

const MODEL_VERSION = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a cosmetic safety reviewer for SkinScreen, a community DIY skincare recipe library.

Given a user-submitted DIY recipe (title, category, ingredients, optional method) you must assess safety for home use on facial/body skin.

Apply these rules:
- Flag essential oils used at >1% leave-on or >2% rinse-off (phototoxic citrus oils >0.4% leave-on).
- Flag any food-grade ingredient (lemon juice, baking soda, toothpaste, sugar scrubs on face, vinegar, raw egg) used directly on skin without proper formulation.
- Flag preservation issues: any water/aqueous recipe without a broad-spectrum preservative is HIGH_RISK due to mold/bacterial contamination.
- Flag pH-sensitive actives (AHA/BHA, vitamin C, retinoids) being mixed with incompatible ingredients.
- Flag known sensitisers (cinnamon, clove, oregano oil) at any meaningful concentration.
- Flag UV-reactive ingredients (citrus, bergamot, fig, St. John's Wort) without daytime SPF guidance.

Return ONLY valid JSON matching this exact shape (no markdown fences, no preamble):
{
  "riskLevel": "safe" | "caution" | "high_risk",
  "summary": "2-3 sentence plain-English summary of overall safety.",
  "flagged": [
    { "ingredient": "string", "reason": "string", "severity": "info" | "warn" | "danger" }
  ],
  "warnings": ["one-line warnings if any"],
  "saferSwaps": [
    { "from": "ingredient to replace", "to": "safer alternative", "why": "short reason" }
  ]
}

Use "safe" only when there are no concerns. Use "caution" for minor concerns that need user awareness. Use "high_risk" if the recipe could cause burns, infection, sensitisation, or photosensitivity.`;

export class RecipeSafetyUnavailableError extends Error {
  constructor() {
    super("Recipe safety scanner is not configured.");
    this.name = "RecipeSafetyUnavailableError";
  }
}

export async function scanRecipeSafety(input: {
  title: string;
  category: string;
  ingredients: RecipeIngredient[];
  method?: string;
  log: (msg: string, data?: unknown) => void;
}): Promise<RecipeAiVerdict | null> {
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RecipeSafetyUnavailableError();
  }

  const anthropic = new Anthropic({ apiKey });
  const ingredientLines = input.ingredients
    .map((i) => `- ${i.name}${i.amount ? ` (${i.amount})` : ""}${i.notes ? ` — ${i.notes}` : ""}`)
    .join("\n");

  const userMessage = `Recipe title: ${input.title}
Category: ${input.category}

Ingredients:
${ingredientLines}

${input.method ? `Method:\n${input.method}` : ""}

Return ONLY the JSON verdict.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content[0];
    const raw = block?.type === "text" ? block.text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      input.log("recipe-safety: failed to parse JSON", { raw });
      return null;
    }

    const result = RecipeAiVerdictModelSchema.safeParse(parsed);
    if (!result.success) {
      input.log("recipe-safety: schema mismatch", {
        parsed,
        issues: result.error.issues,
      });
      return null;
    }
    return {
      ...result.data,
      reviewedAt: new Date().toISOString(),
      modelVersion: MODEL_VERSION,
    };
  } catch (err) {
    input.log("recipe-safety: anthropic error", { err });
    return null;
  }
}
