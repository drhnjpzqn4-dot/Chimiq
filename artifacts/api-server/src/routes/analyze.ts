import { Router, type IRouter } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const AnalyzeBody = z.object({
  product1: z.string().min(1, "Product 1 ingredients are required").max(3000),
  product2: z.string().min(1, "Product 2 ingredients are required").max(3000),
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

const SYSTEM_PROMPT = `You are a cosmetic dermatology expert with deep knowledge of skincare ingredient interactions and clinical research.

Your task: Analyze two product ingredient lists and identify clinically-relevant conflict pairs between ingredients from the two different products.

Rules:
- ONLY flag conflicts with real, documented research backing
- Focus on cross-product conflicts (ingredients from Product 1 interacting with ingredients from Product 2)
- Sort results: HIGH_RISK first, then CAUTION, then SAFE
- Only include SAFE pairs if they address a very common concern (e.g. retinol + niacinamide)
- If no meaningful conflicts exist, return an empty conflicts array with overallSafe: true
- Provide real citation author/year/journal info — use PubMed or DOI links when known
- Return ONLY valid JSON, no markdown formatting, no text outside the JSON object

Required response format:
{
  "conflicts": [
    {
      "pair": "Ingredient A + Ingredient B",
      "severity": "HIGH_RISK",
      "explanation": "2-3 sentence plain-English explanation of the interaction and its effects on skin.",
      "citation": "Author(s), Year. Journal name. PMID: XXXXXX or DOI reference.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/XXXXXXX/ or https://doi.org/..."
    }
  ],
  "overallSafe": false
}`;

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const parseResult = AnalyzeBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Both ingredient lists are required (max 3000 characters each).",
    });
    return;
  }

  const { product1, product2 } = parseResult.data;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Product 1 ingredients:\n${product1}\n\nProduct 2 ingredients:\n${product2}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    const result = AnalyzeResponseSchema.safeParse(parsed);

    if (!result.success) {
      req.log.error({ parsed, issues: result.error.issues }, "OpenAI response schema mismatch");
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    res.json(result.data);
  } catch (err) {
    req.log.error({ err }, "OpenAI analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
