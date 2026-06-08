import { Router, type IRouter } from "express";
import { z } from "zod";
import { computeSingleHash } from "../lib/analysis-cache.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import {
  sanitizeProductName,
  sanitizeBrand,
  sanitizeIngredients,
  SanitizationError,
} from "../lib/sanitize.js";
import { uploadBufferToGcs } from "../lib/objectStorage.js";
import { detectProductType } from "../lib/product-type.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const ProductCompletionBody = z.object({
  barcode: z.string().trim().regex(/^[0-9]{8,14}$/).optional(),
  brand: z.string().trim().max(200).optional(),
  imageBase64: z.string().optional(),
});

// Coarse server-side category derivation. We don't have a `category` column on
// cached_products, so we use ILIKE keyword matching against the product name
// (and brand). Keep the keyword lists short — false positives hurt less than
// missing matches in a browse list.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cleanser: ["cleanser", "cleansing", "face wash", "wash", "foam", "micellar"],
  toner: ["toner", "mist", "essence"],
  serum: ["serum", "ampoule", "booster"],
  moisturizer: ["moisturiser", "moisturizer", "cream", "lotion", "balm", "emulsion"],
  sunscreen: ["sunscreen", "spf", "sun cream", "sun protect", "sunblock"],
  exfoliant: ["exfoliant", "exfoliating", "peel", "scrub", "aha", "bha"],
  mask: ["mask", "masque"],
};

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_KEYWORDS));

function deriveCategory(name: string, brand: string | null): string {
  const hay = `${name} ${brand ?? ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => hay.includes(k))) return cat;
  }
  return "other";
}

function escapeFilterValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function keywordOrFilter(keywords: string[]): string {
  return keywords
    .flatMap((k) => {
      const needle = `%${escapeFilterValue(k)}%`;
      return [`product_name.ilike.${needle}`, `brand.ilike.${needle}`];
    })
    .join(",");
}

function categoryOrFilter(category: string): string | null {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords?.length) return null;
  return keywordOrFilter(keywords);
}

function searchOrFilter(query: string): string {
  const needle = `%${escapeFilterValue(query)}%`;
  // Om query består enbart av siffror antar vi att användaren skriver
  // streckkods-prefix → matcha även mot barcode-fältet (prefix-search).
  // Annars bara namn + brand.
  const isNumeric = /^\d+$/.test(query);
  if (isNumeric) {
    const prefixNeedle = `${escapeFilterValue(query)}%`;
    return `product_name.ilike.${needle},brand.ilike.${needle},barcode.ilike.${prefixNeedle}`;
  }
  return `product_name.ilike.${needle},brand.ilike.${needle}`;
}

// Inspect a cached AI verdict and decide whether it counts as "safe".
// We treat a single-product analysis with zero HIGH_RISK flags as safe.
function isSafeVerdict(resultJson: string): boolean {
  try {
    const parsed = JSON.parse(resultJson) as {
      flags?: Array<{ severity?: string }>;
    };
    if (!Array.isArray(parsed.flags)) return false;
    return parsed.flags.every((f) => (f.severity ?? "").toUpperCase() !== "HIGH_RISK");
  } catch {
    return false;
  }
}

// Batch-look up safety verdicts for a set of product ingredient lists.
async function lookupSafety(
  ingredientsByBarcode: Map<string, string>,
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (ingredientsByBarcode.size === 0) return out;
  const hashToBarcode = new Map<string, string>();
  for (const [barcode, ing] of ingredientsByBarcode) {
    if (!ing.trim()) continue;
    hashToBarcode.set(computeSingleHash(ing, undefined), barcode);
  }
  if (hashToBarcode.size === 0) return out;
  const supabase = supabaseAdmin;
  const hashes = Array.from(hashToBarcode.keys());
  const { data, error } = await supabase
    .from("analysis_cache")
    .select("hash,result_json")
    .eq("scan_type", "single")
    .in("hash", hashes);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ hash: string; result_json: string }>;
  for (const row of rows) {
    const barcode = hashToBarcode.get(row.hash);
    if (!barcode) continue;
    out.set(barcode, isSafeVerdict(row.result_json));
  }
  return out;
}

// Public: list recently-cached / community-contributed products for the in-app
// Browse surface. No auth required so guests can see the database depth.
router.get("/products", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 80);
  const limitRaw = Number(req.query.limit ?? 30);
  const offsetRaw = Number(req.query.offset ?? 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 60) : 30;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  const categoryRaw = String(req.query.category ?? "").trim().toLowerCase();
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "";

  try {
    const supabase = supabaseAdmin;
    let dataQuery = supabase
      .from("cached_products")
      .select("barcode,product_name,brand,ingredients,image_url,cached_at,categories,product_type")
      .order("cached_at", { ascending: false })
      .range(offset, offset + limit - 1);
    let countQuery = supabase
      .from("cached_products")
      .select("barcode", { count: "exact", head: true });

    if (q) {
      const search = searchOrFilter(q);
      dataQuery = dataQuery.or(search);
      countQuery = countQuery.or(search);
    }
    if (category) {
      const catFilter = categoryOrFilter(category);
      if (catFilter) {
        dataQuery = dataQuery.or(catFilter);
        countQuery = countQuery.or(catFilter);
      }
    }

    const [
      { data: listRows, error: listError },
      { count, error: countError },
    ] = await Promise.all([dataQuery, countQuery]);
    if (listError) throw listError;
    if (countError) throw countError;

    const rows = (listRows ?? []) as Array<{
      barcode: string;
      product_name: string;
      brand: string | null;
      ingredients: string;
      image_url: string | null;
      cached_at: string;
      categories: string | null;
      product_type: string | null;
    }>;

    const ingMap = new Map<string, string>();
    rows.forEach((r) => ingMap.set(r.barcode, r.ingredients ?? ""));
    const safetyMap = await lookupSafety(ingMap);

    res.json({
      products: rows.map((p) => ({
        barcode: p.barcode,
        productName: p.product_name,
        brand: p.brand ?? "",
        imageUrl: p.image_url,
        cachedAt: new Date(p.cached_at).toISOString(),
        category: deriveCategory(p.product_name, p.brand),
        productType: p.product_type ?? detectProductType(p.categories),
        verifiedSafe: safetyMap.get(p.barcode) === true,
        ingredientsPreview:
          p.ingredients.length > 140 ? `${p.ingredients.slice(0, 140)}…` : p.ingredients,
      })),
      total: count ?? 0,
      limit,
      offset,
      categories: Array.from(ALLOWED_CATEGORIES),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Could not load products." });
  }
});

router.get("/products/brands", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 80);

  if (q.length < 2) {
    res.json({ brands: [] });
    return;
  }

  try {
    const needle = `%${escapeFilterValue(q)}%`;
    const { data, error } = await supabaseAdmin
      .from("cached_products")
      .select("brand")
      .ilike("brand", needle)
      .limit(30);

    if (error) throw error;

    const seen = new Set<string>();
    const brands = ((data ?? []) as Array<{ brand: string | null }>)
      .map((row) => row.brand?.trim() ?? "")
      .filter((brand) => {
        if (!brand) return false;
        const key = brand.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);

    res.json({ brands });
  } catch (err) {
    req.log.warn({ err }, "Brand lookup failed");
    res.json({ brands: [] });
  }
});

router.patch("/products/:barcode", async (req, res) => {
  const currentBarcode = String(req.params.barcode ?? "").trim().slice(0, 80);
  if (!currentBarcode) {
    res.status(400).json({ error: "Missing barcode." });
    return;
  }

  const parsed = ProductCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data.", issues: parsed.error.issues });
    return;
  }

  try {
    let imageUrl: string | undefined;
    if (parsed.data.imageBase64) {
      imageUrl = (await uploadBufferToGcs(
        Buffer.from(parsed.data.imageBase64, "base64"),
        "product-completions",
        `${randomUUID()}.jpg`,
        "image/jpeg",
      )) ?? undefined;
    }

    const patch: Record<string, string> = {};
    if (parsed.data.barcode) patch["barcode"] = parsed.data.barcode;
    if (parsed.data.brand) patch["brand"] = sanitizeBrand(parsed.data.brand);
    if (imageUrl) patch["image_url"] = imageUrl;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Nothing to update." });
      return;
    }

    const { data: cached, error: cachedError } = await supabaseAdmin
      .from("cached_products")
      .update(patch)
      .eq("barcode", currentBarcode)
      .select("barcode")
      .maybeSingle<{ barcode: string }>();
    if (cachedError) throw cachedError;

    if (!cached) {
      const submittedPatch: Record<string, string> = {};
      if (patch["barcode"]) submittedPatch["barcode"] = patch["barcode"];
      if (patch["brand"]) submittedPatch["brand"] = patch["brand"];
      if (patch["image_url"]) submittedPatch["front_image_url"] = patch["image_url"];
      const { data: submitted, error: submittedError } = await supabaseAdmin
        .from("user_submitted_products")
        .update(submittedPatch)
        .eq("barcode", currentBarcode)
        .select("barcode")
        .maybeSingle<{ barcode: string }>();
      if (submittedError) throw submittedError;
      if (!submitted) {
        res.status(404).json({ error: "Product not found." });
        return;
      }
    }

    res.json({ ok: true, ...patch });
  } catch (err) {
    req.log.error({ err }, "Failed to update product completion");
    res.status(500).json({ error: "Could not update product." });
  }
});

// Public: read-only product detail for the Browse surface. Returns full
// ingredient list and the cached safety verdict if one exists.
router.get("/products/:barcode", async (req, res) => {
  const barcode = String(req.params.barcode ?? "").trim().slice(0, 64);
  if (!barcode) {
    res.status(400).json({ error: "Missing barcode." });
    return;
  }
  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("cached_products")
      .select("barcode,product_name,brand,ingredients,image_url,cached_at,analysis_result_json")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) throw error;
    const product = data as
      | {
          barcode: string;
          product_name: string;
          brand: string | null;
          ingredients: string;
          image_url: string | null;
          cached_at: string;
          analysis_result_json: unknown | null;
        }
      | null;
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const safetyMap = await lookupSafety(new Map([[barcode, product.ingredients ?? ""]]));

    // Also return the full cached analysis result so the client can skip the
    // expensive AI call when opening an already-analysed product.
    // SS-081: prefer the analysis stored DIRECTLY on the product row (written by
    // /analyze-single when a real barcode is present) — it's barcode-keyed and
    // shared across users, robust to ingredient-hash parameter differences.
    // Fall back to the ingredient-hash cache lookup for legacy rows.
    let analysisResultJson: unknown = product.analysis_result_json ?? null;
    if (!analysisResultJson && product.ingredients?.trim()) {
      const hash = computeSingleHash(product.ingredients);
      const { data: cacheRow } = await supabase
        .from("analysis_cache")
        .select("result_json")
        .eq("hash", hash)
        .eq("scan_type", "single")
        .maybeSingle<{ result_json: string }>();
      if (cacheRow?.result_json) {
        try { analysisResultJson = JSON.parse(cacheRow.result_json); } catch { /* keep null */ }
      }
    }

    res.json({
      barcode: product.barcode,
      productName: product.product_name,
      brand: product.brand ?? "",
      imageUrl: product.image_url,
      ingredients: product.ingredients,
      cachedAt: new Date(product.cached_at).toISOString(),
      category: deriveCategory(product.product_name, product.brand),
      verifiedSafe: safetyMap.get(barcode) === true,
      analysisResultJson,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load product detail");
    res.status(500).json({ error: "Could not load product." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Product ratings (#97) — 1–5 stars per user per product, keyed by barcode.
// Eligibility: user has submitted this barcode (acts as our scan record) OR
// has a shelf entry whose name matches the product. Ineligible users still
// see the aggregate (avg + count) — they just can't write.
// ─────────────────────────────────────────────────────────────────────────────

async function checkRatingEligibility(
  userId: string,
  barcode: string,
  productNameHint: string | null,
): Promise<{ eligible: boolean; reason?: "scanned" | "shelf" }> {
  const supabase = supabaseAdmin;

  // (a) Scanned/contributed this barcode themselves.
  const { data: submission, error: submissionError } = await supabase
    .from("user_submitted_products")
    .select("id")
    .eq("barcode", barcode)
    .eq("submitted_by", userId)
    .limit(1)
    .maybeSingle();
  if (submissionError) throw submissionError;
  if (submission) return { eligible: true, reason: "scanned" };

  // (b) Has the product on their shelf — match by exact (case-insensitive)
  // product name. Use the hint from the request if given, else look the
  // product name up from cached_products.
  let nameToMatch = (productNameHint ?? "").trim();
  if (!nameToMatch) {
    const { data: cached, error: cachedError } = await supabase
      .from("cached_products")
      .select("product_name")
      .eq("barcode", barcode)
      .maybeSingle();
    if (cachedError) throw cachedError;
    nameToMatch = (cached as { product_name: string } | null)?.product_name ?? "";
  }
  if (nameToMatch) {
    const { data: shelfRows, error: shelfError } = await supabase
      .from("shelf_products")
      .select("id,product_name")
      .eq("user_id", userId)
      .limit(500);
    if (shelfError) throw shelfError;
    const shelfRow = (shelfRows ?? []).find(
      (row) =>
        String((row as { product_name?: string | null }).product_name ?? "").toLocaleLowerCase() ===
        nameToMatch.toLocaleLowerCase(),
    );
    if (shelfRow) return { eligible: true, reason: "shelf" };
  }

  return { eligible: false };
}

async function loadRatingAggregate(barcode: string, userId: string | null) {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("product_ratings")
    .select("stars,user_id")
    .eq("barcode", barcode);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ stars: number; user_id: string }>;
  const count = rows.length;
  const avg = count > 0 ? rows.reduce((sum, row) => sum + row.stars, 0) / count : null;
  const mine = userId ? rows.find((row) => row.user_id === userId) : null;

  return {
    avg,
    count,
    myRating: mine?.stars ?? null,
  };
}

router.get("/products/:barcode/rating", async (req, res) => {
  const barcode = String(req.params.barcode ?? "").trim().slice(0, 64);
  if (!barcode) {
    res.status(400).json({ error: "Missing barcode." });
    return;
  }
  const userId = req.isAuthenticated() ? req.user.id : null;
  const productNameHint =
    typeof req.query.name === "string" ? req.query.name.trim().slice(0, 200) : "";

  try {
    const aggregate = await loadRatingAggregate(barcode, userId);
    let eligible = false;
    let reason: "scanned" | "shelf" | undefined;
    if (userId) {
      const elig = await checkRatingEligibility(
        userId,
        barcode,
        productNameHint || null,
      );
      eligible = elig.eligible;
      reason = elig.reason;
    }
    res.json({ ...aggregate, eligible, eligibilityReason: reason ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to load product rating");
    res.status(500).json({ error: "Could not load rating." });
  }
});

// Per-IP + per-user rate limit (#85) — applied as middleware. The IP limiter
// is fixed-window in-memory; the per-user limit is enforced inline below.
const ratingRateLimit = ipRateLimit({ windowMs: 60_000, max: 30, key: "product-rating" });
const userRatingHits = new Map<string, { count: number; resetAt: number }>();

router.post("/products/:barcode/rating", ratingRateLimit, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to rate products." });
    return;
  }
  const userId = req.user.id;

  // Per-user limit: 10 writes per minute.
  const now = Date.now();
  const bucket = userRatingHits.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    userRatingHits.set(userId, { count: 1, resetAt: now + 60_000 });
  } else {
    bucket.count += 1;
    if (bucket.count > 10) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "You're rating too quickly. Try again in a moment." });
      return;
    }
  }
  if (userRatingHits.size > 5000) {
    for (const [k, b] of userRatingHits) if (b.resetAt <= now) userRatingHits.delete(k);
  }

  const barcode = String(req.params.barcode ?? "").trim().slice(0, 64);
  if (!barcode) {
    res.status(400).json({ error: "Missing barcode." });
    return;
  }

  const body = (req.body ?? {}) as { stars?: unknown; productName?: unknown };
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    res.status(400).json({ error: "Stars must be an integer between 1 and 5." });
    return;
  }

  let productNameHint: string | null = null;
  if (body.productName !== undefined && body.productName !== null && body.productName !== "") {
    try {
      productNameHint = sanitizeProductName(body.productName, true) || null;
    } catch (err) {
      if (err instanceof SanitizationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }

  try {
    const elig = await checkRatingEligibility(userId, barcode, productNameHint);
    if (!elig.eligible) {
      res.status(403).json({
        error: "Scan this product or add it to your shelf before rating.",
      });
      return;
    }

    const supabase = supabaseAdmin;
    const { error: saveError } = await supabase.from("product_ratings").upsert(
      {
        barcode,
        user_id: userId,
        stars,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barcode,user_id" },
    );
    if (saveError) throw saveError;

    const aggregate = await loadRatingAggregate(barcode, userId);
    res.json({ ...aggregate, eligible: true, eligibilityReason: elig.reason });
  } catch (err) {
    req.log.error({ err }, "Failed to save product rating");
    res.status(500).json({ error: "Could not save rating." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Gap-fill PATCH (#98) — submit only the fields a product is missing without
// going through the full ContributeModal. Eligibility mirrors ratings: user
// must have scanned/contributed this barcode OR have it on their shelf. We
// upsert into user_submitted_products (so the AI review pipeline picks the
// changes up just like a fresh contribution) and refresh cached_products
// directly when the field is unambiguously additive.
// ─────────────────────────────────────────────────────────────────────────────

const gapFillRateLimit = ipRateLimit({
  windowMs: 60_000,
  max: 20,
  key: "product-gap-fill",
});

router.get("/products/:barcode/gaps", async (req, res) => {
  const barcode = String(req.params.barcode ?? "").trim().slice(0, 64);
  if (!barcode) {
    res.status(400).json({ error: "Missing barcode." });
    return;
  }
  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("cached_products")
      .select("barcode,product_name,brand,ingredients,image_url")
      .eq("barcode", barcode)
      .limit(1);
    if (error) throw error;
    const cached = ((data ?? [])[0] ?? null) as
      | {
          barcode: string;
          product_name: string;
          brand: string | null;
          ingredients: string;
          image_url: string | null;
        }
      | null;
    res.json({
      barcode,
      productName: cached?.product_name ?? null,
      brand: cached?.brand ?? null,
      hasIngredients: Boolean(cached?.ingredients && cached.ingredients.trim().length > 0),
      hasFrontImage: Boolean(cached?.image_url && cached.image_url.trim().length > 0),
      missing: {
        productName: !cached?.product_name || cached.product_name.trim().length === 0,
        brand: !cached?.brand || cached.brand.trim().length === 0,
        ingredients: !cached?.ingredients || cached.ingredients.trim().length === 0,
        frontImage: !cached?.image_url || cached.image_url.trim().length === 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load product gaps");
    res.status(500).json({ error: "Could not load product." });
  }
});

router.patch(
  "/products/:barcode/contribute",
  gapFillRateLimit,
  async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Sign in to contribute." });
      return;
    }
    const userId = req.user.id;
    const barcode = String(req.params.barcode ?? "").trim().slice(0, 64);
    if (!/^[0-9]{6,14}$/.test(barcode)) {
      res.status(400).json({ error: "A valid barcode is required." });
      return;
    }

    const body = (req.body ?? {}) as {
      productName?: unknown;
      brand?: unknown;
      ingredients?: unknown;
      frontImageBase64?: unknown;
      ingredientsImageBase64?: unknown;
    };

    // Sanitize each provided field; ignore any field that's missing/empty.
    const updates: {
      productName?: string;
      brand?: string;
      ingredients?: string;
      frontImageUrl?: string;
      ingredientsImageUrl?: string;
    } = {};

    try {
      if (body.productName !== undefined && body.productName !== null && body.productName !== "") {
        updates.productName = sanitizeProductName(body.productName);
      }
      if (body.brand !== undefined && body.brand !== null && body.brand !== "") {
        updates.brand = sanitizeBrand(body.brand);
      }
      if (
        body.ingredients !== undefined &&
        body.ingredients !== null &&
        body.ingredients !== ""
      ) {
        updates.ingredients = sanitizeIngredients(body.ingredients);
      }
    } catch (err) {
      if (err instanceof SanitizationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    // Optional photo uploads — base64 PNG/JPEG, capped at ~6 MB raw.
    async function tryUpload(
      b64: unknown,
      _kind: "front" | "ingredients",
    ): Promise<string | null> {
      if (typeof b64 !== "string" || b64.length === 0) return null;
      if (b64.length > 8_500_000) {
        throw new SanitizationError("Image is too large (max ~6 MB).");
      }
      const buf = Buffer.from(b64, "base64");
      if (buf.length === 0 || buf.length > 6_500_000) {
        throw new SanitizationError("Image upload failed validation.");
      }
      return uploadBufferToGcs(buf, "product-images", `${randomUUID()}.jpg`, "image/jpeg");
    }

    try {
      const frontUrl = await tryUpload(body.frontImageBase64, "front");
      if (frontUrl) updates.frontImageUrl = frontUrl;
      const ingUrl = await tryUpload(body.ingredientsImageBase64, "ingredients");
      if (ingUrl) updates.ingredientsImageUrl = ingUrl;
    } catch (err) {
      if (err instanceof SanitizationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Provide at least one field to contribute." });
      return;
    }

    try {
      const supabase = supabaseAdmin;
      const elig = await checkRatingEligibility(
        userId,
        barcode,
        typeof updates.productName === "string" ? updates.productName : null,
      );
      if (!elig.eligible) {
        res.status(403).json({
          error: "Scan this product or add it to your shelf before contributing.",
        });
        return;
      }

      // Insert a new submission row (the AI/admin review pipeline will pick
      // it up). Status stays "pending" so it's auditable.
      const { data: created, error: insertError } = await supabase
        .from("user_submitted_products")
        .insert({
          barcode,
          product_name: updates.productName ?? null,
          brand: updates.brand ?? null,
          ingredients: updates.ingredients ?? null,
          front_image_url: updates.frontImageUrl ?? null,
          ingredients_image_url: updates.ingredientsImageUrl ?? null,
          submitted_by: userId,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (insertError) throw insertError;

      // Additive cache patch: only fill empty columns on cached_products so
      // we never overwrite verified data with an unreviewed contribution.
      const { data: cachedData, error: cachedError } = await supabase
        .from("cached_products")
        .select("barcode,product_name,brand,image_url")
        .eq("barcode", barcode)
        .limit(1);
      if (cachedError) throw cachedError;
      const cached = ((cachedData ?? [])[0] ?? null) as
        | {
            barcode: string;
            product_name: string;
            brand: string | null;
            image_url: string | null;
          }
        | null;
      if (cached) {
        const patch: Record<string, string> = {};
        if (updates.productName && (!cached.product_name || cached.product_name.trim() === "")) {
          patch["product_name"] = updates.productName;
        }
        if (updates.brand && (!cached.brand || String(cached.brand).trim() === "")) {
          patch["brand"] = updates.brand;
        }
        if (updates.frontImageUrl && (!cached.image_url || cached.image_url.trim() === "")) {
          patch["image_url"] = updates.frontImageUrl;
        }
        if (Object.keys(patch).length > 0) {
          const { error: patchError } = await supabase
            .from("cached_products")
            .update(patch)
            .eq("barcode", barcode);
          if (patchError) throw patchError;
        }
      }

      res.json({
        ok: true,
        submissionId: created?.id ?? null,
        updatedFields: Object.keys(updates),
      });
    } catch (err) {
      req.log.error({ err }, "Gap-fill PATCH failed");
      res.status(500).json({ error: "Could not save your contribution." });
    }
  },
);

export default router;
