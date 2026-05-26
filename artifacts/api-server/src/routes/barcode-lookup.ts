import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  SanitizationError,
  sanitizeBrand,
  sanitizeIngredients,
  sanitizeProductName,
} from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { detectProductType } from "../lib/product-type.js";
import { analyzeSingleIngredients } from "./analyze-single.js";

const router: IRouter = Router();
const OBF_TIMEOUT_MS = 5_000;

interface CachedProductRow {
  product_name: string;
  brand: string;
  ingredients: string;
  image_url: string | null;
  source: string | null;
  categories: string | null;
  product_type: string | null;
  analysis_cache_hash: string | null;
  analysis_result_json: unknown | null;
}

async function lookupOpenBeautyFacts(barcode: string): Promise<{
  productName: string;
  brand: string;
  ingredientsText: string;
  imageUrl: string | null;
  quantity: string | null;
  categories: string | null;
  labels: string | null;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v3/product/${barcode}.json`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "Chimiq/1.0 (chimiq.com)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      product?: {
        product_name?: string;
        brands?: string;
        ingredients_text?: string;
        image_url?: string;
        image_front_url?: string;
        quantity?: string;
        categories_en?: string;
        labels_en?: string;
      };
    };
    if (data.status !== "success" || !data.product) return null;
    const p = data.product;
    if (!p.ingredients_text) return null;
    return {
      productName: p.product_name ?? "Unknown product",
      brand: p.brands ?? "",
      ingredientsText: p.ingredients_text,
      imageUrl: p.image_front_url ?? p.image_url ?? null,
      quantity: p.quantity ?? null,
      categories: p.categories_en ?? null,
      labels: p.labels_en ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return null;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/barcode/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || !/^[0-9]{6,14}$/.test(code)) {
    res.status(400).json({ found: false, error: "Invalid barcode" });
    return;
  }

  const { data: cached, error: cachedError } = await supabaseAdmin
    .from("cached_products")
    .select("product_name,brand,ingredients,image_url,source,categories,product_type,analysis_cache_hash,analysis_result_json")
    .eq("barcode", code)
    .maybeSingle<CachedProductRow>();
  if (cachedError) {
    req.log.warn({ err: cachedError }, "Cached product lookup failed");
  }

  if (cached) {
    const productType =
      cached.product_type ?? detectProductType(cached.categories);
    res.json({
      found: true,
      productName: cached.product_name,
      brand: cached.brand,
      ingredients: cached.ingredients,
      imageUrl: cached.image_url ?? null,
      productType,
      source: cached.source ?? "chimiq",
      analysis: cached.analysis_result_json
        ? {
            ...(cached.analysis_result_json as Record<string, unknown>),
            cacheHash: cached.analysis_cache_hash,
            fromCache: true,
          }
        : null,
      fromCache: true,
    });
    return;
  }

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from("user_submitted_products")
    .select("product_name, brand, ingredients")
    .eq("barcode", code)
    .in("status", ["needs_admin", "ai_reviewing", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      product_name: string | null;
      brand: string | null;
      ingredients: string | null;
    }>();
  if (pendingError) {
    req.log.warn({ err: pendingError }, "Pending user submission lookup failed");
  }
  if (pending?.ingredients?.trim()) {
    res.json({
      found: true,
      productName: pending.product_name ?? "Unknown product",
      brand: pending.brand ?? "",
      ingredients: pending.ingredients,
      imageUrl: null,
      source: "user_submitted_pending",
      analysis: null,
      fromCache: false,
    });
    return;
  }

  try {
    const obfProduct = await lookupOpenBeautyFacts(code);
    if (!obfProduct) {
      await recordUnknownBarcode(code, req.log);
      res.json({ found: false, recorded: true });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      req.log.error("Anthropic integration env vars not configured");
      res.status(500).json({ error: "Analysis service is not available. Please try again later." });
      return;
    }

    const productName = sanitizeProductName(obfProduct.productName, true);
    const brand = sanitizeBrand(obfProduct.brand, true);
    const ingredients = sanitizeIngredients(obfProduct.ingredientsText, false);
    const imageUrl = obfProduct.imageUrl;
    const productType = detectProductType(obfProduct.categories);
    const analysis = await analyzeSingleIngredients({
      ingredients,
      productType,
      apiKey,
      log: req.log,
    });

    if (!analysis) {
      res.status(500).json({ error: "Analysis failed. Please try again." });
      return;
    }

    const { error: insertError } = await supabaseAdmin.from("cached_products").insert({
      barcode: code,
      product_name: productName,
      brand,
      ingredients,
      image_url: imageUrl,
      source: "obf",
      quantity: obfProduct.quantity,
      categories: obfProduct.categories,
      labels: obfProduct.labels,
      product_type: productType,
      analysis_cache_hash: analysis.cacheHash,
      analysis_result_json: analysis,
    });
    if (insertError) {
      req.log.warn({ err: insertError }, "OBF product cache write failed");
    }

    res.json({
      found: true,
      productName,
      brand,
      ingredients,
      imageUrl,
      productType,
      source: "obf",
      analysis,
    });
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.warn({ err }, "Barcode lookup failed");
    await recordUnknownBarcode(code, req.log).catch(() => {});
    res.json({ found: false, recorded: true });
  }
});

const SubmitProductBody = z.object({
  barcode: z.string().trim().regex(/^[0-9]{6,14}$/, "Invalid barcode"),
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  ingredients: z.string().trim().min(1, "Ingredients are required").max(10000),
});

router.post("/barcode/submit", async (req, res) => {
  const parseResult = SubmitProductBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid submission", issues: parseResult.error.issues });
    return;
  }

  const { barcode } = parseResult.data;

  // #74: sanitize every free-form field BEFORE the row is upserted into
  // the crowdsourced cache so the public DB never stores unsanitized text.
  let productName: string;
  let brand: string;
  let ingredients: string;
  try {
    productName = sanitizeProductName(parseResult.data.productName, true);
    brand = sanitizeBrand(parseResult.data.brand, true);
    ingredients = sanitizeIngredients(parseResult.data.ingredients);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  try {
    const { error } = await supabaseAdmin.from("user_submitted_products").insert({
      barcode,
      product_name: productName || null,
      brand: brand || null,
      ingredients: ingredients || null,
      status: "pending",
      obf_contributed: "pending",
    });
    if (error) throw error;

    res.json({ recorded: true, message: "Product submitted. Thank you for contributing!" });
  } catch (err) {
    req.log.error({ err }, "Failed to record user-submitted product");
    res.status(500).json({ error: "Could not record submission. Please try again." });
  }
});

async function recordUnknownBarcode(
  barcode: string,
  log: { warn: (obj: unknown, msg: string) => void },
  productName?: string,
  brand?: string,
  ingredients?: string,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("user_submitted_products").insert({
      barcode,
      product_name: productName ?? null,
      brand: brand ?? null,
      ingredients: ingredients ?? null,
      status: "pending",
      obf_contributed: "pending",
    });
    if (error) throw error;
  } catch (err) {
    log.warn({ err }, "Failed to record unknown barcode in user_submitted_products");
  }
}

export default router;
