import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, shelfProductsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const AddToShelfBodySchema = z.object({
  productName: z.string().min(1).max(200),
  ingredients: z.string().min(1).max(5000),
  routineSlot: z.enum(["morning", "evening", "both"]).optional().default("both"),
});

router.get("/shelf", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const products = await db
    .select()
    .from(shelfProductsTable)
    .where(eq(shelfProductsTable.userId, req.user.id))
    .orderBy(shelfProductsTable.addedAt);
  res.json({ products });
});

router.post("/shelf", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = AddToShelfBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { productName, ingredients, routineSlot } = parsed.data;
  const [product] = await db
    .insert(shelfProductsTable)
    .values({ userId: req.user.id, productName, ingredients, routineSlot })
    .returning();
  res.json(product);
});

router.delete("/shelf/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const deleted = await db
    .delete(shelfProductsTable)
    .where(and(eq(shelfProductsTable.id, id), eq(shelfProductsTable.userId, req.user.id)))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Product not found on shelf" });
    return;
  }
  res.json({ success: true });
});

const ConflictResultSchema = z.object({
  pair: z.string(),
  severity: z.enum(["HIGH_RISK", "CAUTION", "SAFE"]),
  explanation: z.string(),
  citation: z.string(),
  citationUrl: z.string(),
});

const AnalyzePairResponseSchema = z.object({
  conflicts: z.array(ConflictResultSchema).default([]),
  overallSafe: z.boolean().default(true),
});

const ANALYZE_ROUTINE_SYSTEM_PROMPT = `You are a board-certified dermatologist and cosmetic chemist with no brand affiliations. Be honest and direct.

Your task: Given two skincare product ingredient lists, identify clinically-relevant CROSS-PRODUCT conflict pairs (ingredients from Product 1 interacting with Product 2). 

Key conflicts to flag:
- Retinol/retinoids + AHAs/BHAs (severe irritation, barrier damage)
- Benzoyl peroxide + retinol (oxidises retinol, wastes money)
- Multiple exfoliants layered (over-exfoliation)
- Vitamin C + Niacinamide at high concentrations (may form niacin, flushing)
- Kojic acid + Vitamin C (competing pathway, sensitisation)

Rules:
- Only flag conflicts backed by real documented research
- Only include SAFE pairs when addressing a very common concern
- Sort: HIGH_RISK first, CAUTION, SAFE last
- If no meaningful conflicts exist, return empty array with overallSafe: true
- Use real citations (PubMed/DOI links preferred)
- Return ONLY valid JSON — no markdown, no extra text

Response format:
{
  "conflicts": [
    {
      "pair": "Retinol + Glycolic Acid",
      "severity": "HIGH_RISK",
      "explanation": "2-3 sentence plain-English explanation.",
      "citation": "Author(s), Year. Journal.",
      "citationUrl": "https://pubmed.ncbi.nlm.nih.gov/XXXXXXX/"
    }
  ],
  "overallSafe": false
}`;

async function analyzePair(
  anthropic: Anthropic,
  product1Name: string,
  product1Ingredients: string,
  product2Name: string,
  product2Ingredients: string,
): Promise<Array<z.infer<typeof ConflictResultSchema>>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: ANALYZE_ROUTINE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Product 1 (${product1Name}) ingredients:\n${product1Ingredients}\n\nProduct 2 (${product2Name}) ingredients:\n${product2Ingredients}\n\nReturn ONLY valid JSON.`,
      },
    ],
  });

  const block = message.content[0];
  const raw = block.type === "text" ? block.text.trim() : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

  try {
    const parsed = JSON.parse(jsonStr);
    const result = AnalyzePairResponseSchema.safeParse(parsed);
    if (!result.success) return [];
    return result.data.conflicts;
  } catch {
    return [];
  }
}

router.post("/shelf/analyze-routine", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  const products = await db
    .select()
    .from(shelfProductsTable)
    .where(eq(shelfProductsTable.userId, req.user.id))
    .orderBy(shelfProductsTable.addedAt);

  if (products.length < 2) {
    res.status(400).json({ error: "You need at least 2 products on your shelf to analyse your routine." });
    return;
  }

  const anthropic = new Anthropic({ apiKey, baseURL });

  // Generate all unique product pairs
  const pairs: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < products.length - 1; i++) {
    for (let j = i + 1; j < products.length; j++) {
      pairs.push({ i, j });
    }
  }

  try {
    // Run all pairs in parallel
    const pairResults = await Promise.all(
      pairs.map(async ({ i, j }) => {
        const p1 = products[i];
        const p2 = products[j];
        const conflicts = await analyzePair(
          anthropic,
          p1.productName,
          p1.ingredients,
          p2.productName,
          p2.ingredients,
        );
        return conflicts.map((c) => ({
          ...c,
          product1Name: p1.productName,
          product2Name: p2.productName,
        }));
      }),
    );

    // Flatten, deduplicate by pair name, sort by severity
    const severityOrder = { HIGH_RISK: 0, CAUTION: 1, SAFE: 2 };
    const seen = new Set<string>();
    const allConflicts = pairResults
      .flat()
      .filter((c) => {
        const key = `${c.product1Name}|${c.product2Name}|${c.pair}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return c.severity !== "SAFE"; // Only show real issues
      })
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const highRiskCount = allConflicts.filter((c) => c.severity === "HIGH_RISK").length;
    const cautionCount = allConflicts.filter((c) => c.severity === "CAUTION").length;

    res.json({
      conflicts: allConflicts,
      overallSafe: allConflicts.length === 0,
      highRiskCount,
      cautionCount,
    });
  } catch (err) {
    req.log.error({ err }, "Routine analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
