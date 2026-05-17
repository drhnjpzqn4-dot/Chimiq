import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import type { ShelfProduct } from "@workspace/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { getUserPlan } from "../lib/userPlan.js";
import {
  sanitizeProductName,
  sanitizeIngredients,
  SanitizationError,
} from "../lib/sanitize.js";

const router: IRouter = Router();

type ShelfProductResponse = ShelfProduct & { imageUrl: string | null };

function mapShelfRow(row: Record<string, unknown>): ShelfProductResponse {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    productName: row.product_name as string,
    ingredients: row.ingredients as string,
    imageUrl: (row.image_url as string | null | undefined) ?? null,
    routineSlot: row.routine_slot as ShelfProduct["routineSlot"],
    addedAt: new Date(row.added_at as string),
  };
}

const routineSlotSchema = z.enum(["morning", "evening", "both", "occasional", "wishlist"]);

const AddToShelfBodySchema = z.object({
  productName: z.string().min(1).max(200),
  ingredients: z.string().min(1).max(5000),
  image_url: z.string().url().nullable().optional(),
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
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("shelf_products")
    .select("*")
    .eq("user_id", req.user.id)
    .order("added_at", { ascending: true });
  if (error) {
    req.log?.error?.({ err: error }, "shelf list failed");
    res.status(500).json({ error: "Failed to load shelf" });
    return;
  }
  res.json({ products: (data ?? []).map((r) => mapShelfRow(r as Record<string, unknown>)) });
});

router.post("/shelf", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const plan = await getUserPlan(req.user.id);
  if (plan === "free") {
    const supabase = supabaseAdmin;
    const { count, error } = await supabase
      .from("shelf_products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id);
    if (error) {
      req.log?.warn?.({ err: error }, "shelf count failed");
    } else if ((count ?? 0) >= 2) {
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

  const supabase = supabaseAdmin;
  const { data: product, error } = await supabase
    .from("shelf_products")
    .insert({
      user_id: req.user.id,
      product_name: safeName,
      ingredients: safeIngredients,
      image_url: parsed.data.image_url ?? null,
      routine_slot: parsed.data.routineSlot,
    })
    .select()
    .single();
  if (error || !product) {
    req.log?.error?.({ err: error }, "shelf insert failed");
    res.status(500).json({ error: "Failed to add product" });
    return;
  }
  res.json(mapShelfRow(product as Record<string, unknown>));
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
  const supabase = supabaseAdmin;
  const { data: updated, error } = await supabase
    .from("shelf_products")
    .update({ routine_slot: parsed.data.routineSlot })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .maybeSingle();
  if (error) {
    req.log?.error?.({ err: error }, "shelf patch failed");
    res.status(500).json({ error: "Failed to update" });
    return;
  }
  if (!updated) {
    res.status(404).json({ error: "Product not found on shelf" });
    return;
  }
  res.json(mapShelfRow(updated as Record<string, unknown>));
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
  const supabase = supabaseAdmin;
  const { data: deleted, error } = await supabase
    .from("shelf_products")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select("id");
  if (error) {
    req.log?.error?.({ err: error }, "shelf delete failed");
    res.status(500).json({ error: "Failed to delete" });
    return;
  }
  if (!deleted?.length) {
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

router.get("/shelf/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ hasConflicts: false, hasRecall: false });
    return;
  }
  try {
    const supabase = supabaseAdmin;
    const { data: rows, error } = await supabase
      .from("shelf_products")
      .select("*")
      .eq("user_id", req.user.id);
    if (error) throw error;
    const products = (rows ?? []).map((r) => mapShelfRow(r as Record<string, unknown>));
    const hasConflicts = products.some(
      (p: ShelfProduct) => (p as Record<string, unknown>).routineConflict === true,
    );
    const hasRecall = products.some(
      (p: ShelfProduct) => (p as Record<string, unknown>).recallActive === true,
    );
    res.json({ hasConflicts, hasRecall });
  } catch {
    res.status(500).json({ hasConflicts: false, hasRecall: false });
  }
});

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

  const supabase = supabaseAdmin;
  const { data: rows, error } = await supabase
    .from("shelf_products")
    .select("*")
    .eq("user_id", req.user.id)
    .order("added_at", { ascending: true });
  if (error) {
    req.log.error({ err: error }, "shelf analyze load failed");
    res.status(500).json({ error: "Failed to load shelf." });
    return;
  }
  const products = (rows ?? []).map((r) => mapShelfRow(r as Record<string, unknown>));

  const MAX_PRODUCTS = 10;
  const CONCURRENCY = 3;

  const cappedProducts = products.slice(-MAX_PRODUCTS);
  const forAnalysis = cappedProducts.filter((p) => p.routineSlot !== "wishlist");

  if (forAnalysis.length < 2) {
    res.status(400).json({ error: "You need at least 2 products on your shelf to analyse your routine." });
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  const pairs: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < forAnalysis.length - 1; i++) {
    for (let j = i + 1; j < forAnalysis.length; j++) {
      pairs.push({ i, j });
    }
  }

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

    const severityOrder = { HIGH_RISK: 0, CAUTION: 1, SAFE: 2 };
    const seen = new Set<string>();
    const allConflicts = pairResults
      .flat()
      .filter((c) => {
        const key = `${c.product1Name}|${c.product2Name}|${c.pair}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return c.severity !== "SAFE";
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
