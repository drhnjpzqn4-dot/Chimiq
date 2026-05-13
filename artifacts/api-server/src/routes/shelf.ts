import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, shelfProductsTable, getUserPlan } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import {
  sanitizeProductName,
  sanitizeIngredients,
  SanitizationError,
} from "../lib/sanitize.js";

const router: IRouter = Router();

const routineSlotSchema = z.enum(["morning", "evening", "both", "occasional", "wishlist"]);

const AddToShelfBodySchema = z.object({
  productName: z.string().min(1).max(200),
  ingredients: z.string().min(1).max(5000),
  routineSlot: routineSlotSchema.optional().default("both"),
});

const PatchShelfBodySchema = z.object({
  routineSlot: routineSlotSchema,
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

  const plan = await getUserPlan(req.user.id);
  if (plan === "free") {
    const [{ total }] = await db
      .select({ total: count() })
      .from(shelfProductsTable)
      .where(eq(shelfProductsTable.userId, req.user.id));
    if (total >= 2) {
      res.status(402).json({ error: "upgrade_required" });
      return;
    }
  }

  const parsed = AddToShelfBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  let safeName: string;
  let safeIngredients: string;
  try {
    safeName = sanitizeProductName(parsed.data.productName);
    safeIngredients = sanitizeIngredients(parsed.data.ingredients);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const [product] = await db
    .insert(shelfProductsTable)
    .values({
      userId: req.user.id,
      productName: safeName,
      ingredients: safeIngredients,
      routineSlot: parsed.data.routineSlot,
    })
    .returning();
  res.json(product);
});

router.patch("/shelf/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = PatchShelfBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(shelfProductsTable)
    .set({ routineSlot: parsed.data.routineSlot })
    .where(and(eq(shelfProductsTable.id, id), eq(shelfProductsTable.userId, req.user.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Product not found on shelf" });
    return;
  }
  res.json(updated);
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

// Why no premium gate: this endpoint runs N×(N-1)/2 Sonnet calls across the
// user's shelf, but the shelf itself is already plan-bounded — free users
// are capped at 2 products by the POST /shelf gate above (max 1 LLM pair),
// premium users are capped at MAX_PRODUCTS=10 (max 45 pairs) and CONCURRENCY
// is held at 3. So spend is bounded per user even without a price-tier
// check, and we want free users to see the value of routine analysis on
// their two products before upgrading.
router.post("/shelf/analyze-routine", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    req.log.error("Anthropic integration env vars not configured");
    res.status(500).json({ error: "Analysis service is not available. Please try again later." });
    return;
  }

  const products = await db
    .select()
    .from(shelfProductsTable)
    .where(eq(shelfProductsTable.userId, req.user.id))
    .orderBy(shelfProductsTable.addedAt);

  const MAX_PRODUCTS = 10;
  const CONCURRENCY = 3;

  // Cap to most recently-added products to limit LLM cost
  const cappedProducts = products.slice(-MAX_PRODUCTS);
  // Wishlist items are not part of routine conflict analysis (SS-023).
  const forAnalysis = cappedProducts.filter((p) => p.routineSlot !== "wishlist");

  if (forAnalysis.length < 2) {
    res.status(400).json({ error: "You need at least 2 products on your shelf to analyse your routine." });
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  // Generate all unique product pairs
  const pairs: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < forAnalysis.length - 1; i++) {
    for (let j = i + 1; j < forAnalysis.length; j++) {
      pairs.push({ i, j });
    }
  }

  // Concurrency-limited executor
  async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];
    let idx = 0;
    async function worker() {
      while (idx < tasks.length) {
        const current = idx++;
        results[current] = await tasks[current]();
      }
    }
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
    await Promise.all(workers);
    return results;
  }

  try {
    const tasks = pairs.map(({ i, j }) => async () => {
      const p1 = forAnalysis[i];
      const p2 = forAnalysis[j];
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
    });

    const pairResults = await runWithConcurrency(tasks, CONCURRENCY);

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
