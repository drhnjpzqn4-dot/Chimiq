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
import {
  computeCompareHash,
  getCacheEntry,
  saveCacheEntry,
  bumpCacheUsage,
} from "../lib/analysis-cache.js";
import {
  FREE_DAILY_SCAN_LIMIT,
  claimDailyScanSlot,
  incrementTodayScanCount,
  releaseDailyScanSlot,
} from "../lib/scanQuota.js";

const router: IRouter = Router();

type ShelfProductResponse = ShelfProduct & {
  imageUrl: string | null;
  barcode: string | null;
  analysisResultJson: unknown | null;
};

function mapShelfRow(row: Record<string, unknown>): ShelfProductResponse {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    productName: row.product_name as string,
    ingredients: row.ingredients as string,
    barcode: (row.barcode as string | null | undefined) ?? null,
    imageUrl: (row.image_url as string | null | undefined) ?? null,
    routineSlot: row.routine_slot as ShelfProduct["routineSlot"],
    addedAt: new Date(row.added_at as string),
    analysisResultJson: row.analysis_result_json ?? null,
  };
}

const routineSlotSchema = z.enum(["morning", "evening", "both", "occasional", "wishlist"]);

const shelfBarcodeSchema = z
  .string()
  .regex(/^[0-9]{6,14}$/)
  .nullable()
  .optional();

const AddToShelfBodySchema = z.object({
  productName: z.string().min(1).max(200),
  ingredients: z.string().min(1).max(5000),
  image_url: z.string().url().nullable().optional(),
  routineSlot: routineSlotSchema.optional().default("both"),
  barcode: shelfBarcodeSchema,
});

const PatchShelfBodySchema = z.object({
  routineSlot: routineSlotSchema.optional(),
  analysisResultJson: z.record(z.string(), z.unknown()).nullable().optional(),
  barcode: shelfBarcodeSchema,
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
      barcode: parsed.data.barcode ?? null,
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
  const updateFields: Record<string, unknown> = {};
  if (parsed.data.routineSlot !== undefined) {
    updateFields.routine_slot = parsed.data.routineSlot;
  }
  if (parsed.data.analysisResultJson !== undefined) {
    updateFields.analysis_result_json = parsed.data.analysisResultJson;
  }
  if (parsed.data.barcode !== undefined) {
    updateFields.barcode = parsed.data.barcode;
  }

  if (Object.keys(updateFields).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const supabase = supabaseAdmin;
  const { data: updated, error } = await supabase
    .from("shelf_products")
    .update(updateFields)
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

// SS-081c (kostnad): cacha parvisa rutin-analyser per (ordningsoberoende)
// compare-hash. Upprepade rutinkontroller och par som delas mellan användare
// kostar då inga nya AI-anrop. Listorna sorteras före hash → (A,B) och (B,A)
// träffar samma cache; produktnamn fästs på av anroparen efteråt.
async function analyzePairCached(
  anthropic: Anthropic,
  p1Name: string,
  p1Ingredients: string,
  p2Name: string,
  p2Ingredients: string,
): Promise<Array<z.infer<typeof ConflictResultSchema>>> {
  let hash: string | null = null;
  try {
    const a = sanitizeIngredients(p1Ingredients, false);
    const b = sanitizeIngredients(p2Ingredients, false);
    const [x, y] = [a, b].sort();
    hash = computeCompareHash(x, y, undefined);
  } catch {
    hash = null;
  }
  if (hash) {
    const cached = await getCacheEntry(hash).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached.resultJson);
        const r = AnalyzePairResponseSchema.safeParse(parsed);
        if (r.success) {
          bumpCacheUsage(hash).catch(() => {});
          return r.data.conflicts;
        }
      } catch {
        /* fall through to a fresh analysis */
      }
    }
  }
  const conflicts = await analyzePair(anthropic, p1Name, p1Ingredients, p2Name, p2Ingredients);
  if (hash) {
    saveCacheEntry(hash, "compare", undefined, JSON.stringify({ conflicts })).catch(() => {});
  }
  return conflicts;
}

// SS-081c (AM/PM): analysera bara par som faktiskt KAN användas samtidigt.
// morgon+morgon eller kväll+kväll, samt "both"/"occasional" (och null) som
// wildcard. Annars korsflaggas t.ex. en morgon-C-vitamin mot en kvälls-retinol
// som aldrig blandas — falska konflikter för serum m.m.
function slotsCanCombine(a: string | null, b: string | null): boolean {
  const wild = (s: string | null) => s === "both" || s === "occasional" || s == null;
  if (wild(a) || wild(b)) return true;
  return a === b;
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

  // SS-081c (kostnad): rutinkontrollen räknas nu mot gratis-taket precis som
  // /analyze och /analyze-single (tidigare helt o-gateat → gratisanvändare kunde
  // köra obegränsat, varje körning = flera AI-anrop). En rutinkontroll = EN scan.
  // Premium har inget tak. Slot släpps om svaret blir fel (release on non-2xx).
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
          releaseDailyScanSlot(userId).catch((e) =>
            req.log.warn({ err: e }, "Failed to release scan slot after error"),
          );
        }
      });
    } else {
      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          incrementTodayScanCount(userId).catch((e) =>
            req.log.warn({ err: e }, "Failed to increment scan count"),
          );
        }
      });
    }
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
  const inRoutine = cappedProducts.filter((p) => p.routineSlot !== "wishlist");

  // SS-081c (SÄKERHET): en produkt UTAN användbar ingredienslista kan inte
  // konfliktkontrolleras. Tidigare skickades den ändå till modellen (tom sträng)
  // → inga konflikter → bidrog till "allt klart". Det är ett FALSKT lugn: en
  // produkt vi inte kunnat läsa redovisas som säker. Skilj ut dem och rapportera
  // dem så klienten kan varna istället för att tyst påstå att rutinen är ren.
  const hasUsableInci = (s: string | null | undefined): boolean =>
    Boolean(s && s.trim().length >= 5 && /[a-zA-Z]/.test(s));
  const analyzable = inRoutine.filter((p) => hasUsableInci(p.ingredients));
  const skipped = inRoutine
    .filter((p) => !hasUsableInci(p.ingredients))
    .map((p) => p.productName);

  if (analyzable.length < 2) {
    res.status(400).json({
      error:
        skipped.length > 0
          ? "Need at least 2 products WITH ingredient lists to analyse your routine. Some products are missing ingredients — add them first."
          : "You need at least 2 products on your shelf to analyse your routine.",
      skipped,
      skippedCount: skipped.length,
    });
    return;
  }
  const forAnalysis = analyzable;

  const anthropic = new Anthropic({ apiKey });

  // SS-081c (AM/PM): bara par som kan användas samtidigt (samma slot eller
  // wildcard) — annars korsflaggas morgon- mot kvällsprodukter felaktigt.
  const pairs: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < forAnalysis.length - 1; i++) {
    for (let j = i + 1; j < forAnalysis.length; j++) {
      if (
        slotsCanCombine(
          forAnalysis[i].routineSlot as string | null,
          forAnalysis[j].routineSlot as string | null,
        )
      ) {
        pairs.push({ i, j });
      }
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
      const conflicts = await analyzePairCached(
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
      // overallSafe = inga konflikter MELLAN de produkter vi kunde läsa. Klienten
      // måste visa "skipped"-varningen så "allt klart" inte tolkas som att ÄVEN
      // de oläsbara produkterna är säkra.
      overallSafe: allConflicts.length === 0,
      highRiskCount,
      cautionCount,
      skipped,
      skippedCount: skipped.length,
      // SS-081c: hur många produkter som faktiskt analyserades + max-taket, så
      // klienten kan informera när äldre produkter föll utanför 10-gränsen.
      analyzedCount: forAnalysis.length,
      maxProducts: MAX_PRODUCTS,
      capped: products.length > MAX_PRODUCTS,
    });
  } catch (err) {
    req.log.error({ err }, "Routine analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
