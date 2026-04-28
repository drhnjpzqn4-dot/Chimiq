import { Router, type IRouter } from "express";
import {
  db,
  cachedProductsTable,
  analysisCacheTable,
  productRatingsTable,
  userSubmittedProductsTable,
  shelfProductsTable,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { computeSingleHash } from "../lib/analysis-cache.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import {
  sanitizeProductName,
  sanitizeBrand,
  sanitizeIngredients,
  SanitizationError,
} from "../lib/sanitize.js";
import { uploadBufferToGcs } from "../lib/objectStorage.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

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

function categoryFilter(category: string): SQL | undefined {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords?.length) return undefined;
  const ors = keywords.flatMap((k) => [
    ilike(cachedProductsTable.productName, `%${k}%`),
    ilike(cachedProductsTable.brand, `%${k}%`),
  ]);
  return or(...ors);
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
  const rows = await db
    .select({
      hash: analysisCacheTable.hash,
      resultJson: analysisCacheTable.resultJson,
    })
    .from(analysisCacheTable)
    .where(
      and(
        eq(analysisCacheTable.scanType, "single"),
        inArray(analysisCacheTable.hash, Array.from(hashToBarcode.keys())),
      ),
    );
  for (const row of rows) {
    const barcode = hashToBarcode.get(row.hash);
    if (!barcode) continue;
    out.set(barcode, isSafeVerdict(row.resultJson));
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
    const filters: SQL[] = [];
    if (q) {
      const search = or(
        ilike(cachedProductsTable.productName, `%${q}%`),
        ilike(cachedProductsTable.brand, `%${q}%`),
      );
      if (search) filters.push(search);
    }
    if (category) {
      const catFilter = categoryFilter(category);
      if (catFilter) filters.push(catFilter);
    }
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        barcode: cachedProductsTable.barcode,
        productName: cachedProductsTable.productName,
        brand: cachedProductsTable.brand,
        ingredients: cachedProductsTable.ingredients,
        imageUrl: cachedProductsTable.imageUrl,
        cachedAt: cachedProductsTable.cachedAt,
      })
      .from(cachedProductsTable)
      .where(where)
      .orderBy(desc(cachedProductsTable.cachedAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cachedProductsTable)
      .where(where);

    const ingMap = new Map<string, string>();
    rows.forEach((r) => ingMap.set(r.barcode, r.ingredients));
    const safetyMap = await lookupSafety(ingMap);

    res.json({
      products: rows.map((p) => ({
        barcode: p.barcode,
        productName: p.productName,
        brand: p.brand,
        imageUrl: p.imageUrl,
        cachedAt: p.cachedAt.toISOString(),
        category: deriveCategory(p.productName, p.brand),
        verifiedSafe: safetyMap.get(p.barcode) === true,
        ingredientsPreview:
          p.ingredients.length > 140
            ? `${p.ingredients.slice(0, 140)}…`
            : p.ingredients,
      })),
      total: count,
      limit,
      offset,
      categories: Array.from(ALLOWED_CATEGORIES),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Could not load products." });
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
    const rows = await db
      .select()
      .from(cachedProductsTable)
      .where(eq(cachedProductsTable.barcode, barcode))
      .limit(1);
    const product = rows[0];
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    const safetyMap = await lookupSafety(new Map([[barcode, product.ingredients]]));
    res.json({
      barcode: product.barcode,
      productName: product.productName,
      brand: product.brand,
      imageUrl: product.imageUrl,
      ingredients: product.ingredients,
      cachedAt: product.cachedAt.toISOString(),
      category: deriveCategory(product.productName, product.brand),
      verifiedSafe: safetyMap.get(barcode) === true,
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
  // (a) Scanned/contributed this barcode themselves.
  const [submission] = await db
    .select({ id: userSubmittedProductsTable.id })
    .from(userSubmittedProductsTable)
    .where(
      and(
        eq(userSubmittedProductsTable.barcode, barcode),
        eq(userSubmittedProductsTable.submittedBy, userId),
      ),
    )
    .limit(1);
  if (submission) return { eligible: true, reason: "scanned" };

  // (b) Has the product on their shelf — match by exact (case-insensitive)
  // product name. Use the hint from the request if given, else look the
  // product name up from cached_products.
  let nameToMatch = (productNameHint ?? "").trim();
  if (!nameToMatch) {
    const [cached] = await db
      .select({ productName: cachedProductsTable.productName })
      .from(cachedProductsTable)
      .where(eq(cachedProductsTable.barcode, barcode))
      .limit(1);
    nameToMatch = cached?.productName ?? "";
  }
  if (nameToMatch) {
    // Exact case-insensitive equality only — never feed user input straight
    // into ILIKE (treats `%`/`_` as wildcards, which would let a user with
    // any shelf row claim eligibility for any product).
    const [shelfRow] = await db
      .select({ id: shelfProductsTable.id })
      .from(shelfProductsTable)
      .where(
        and(
          eq(shelfProductsTable.userId, userId),
          sql`lower(${shelfProductsTable.productName}) = lower(${nameToMatch})`,
        ),
      )
      .limit(1);
    if (shelfRow) return { eligible: true, reason: "shelf" };
  }

  return { eligible: false };
}

async function loadRatingAggregate(barcode: string, userId: string | null) {
  const [agg] = await db
    .select({
      avg: sql<number | null>`avg(${productRatingsTable.stars})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(productRatingsTable)
    .where(eq(productRatingsTable.barcode, barcode));
  let myRating: number | null = null;
  if (userId) {
    const [mine] = await db
      .select({ stars: productRatingsTable.stars })
      .from(productRatingsTable)
      .where(
        and(
          eq(productRatingsTable.barcode, barcode),
          eq(productRatingsTable.userId, userId),
        ),
      )
      .limit(1);
    myRating = mine?.stars ?? null;
  }
  return {
    avg: agg?.avg ?? null,
    count: agg?.count ?? 0,
    myRating,
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

    await db
      .insert(productRatingsTable)
      .values({ barcode, userId, stars })
      .onConflictDoUpdate({
        target: [productRatingsTable.barcode, productRatingsTable.userId],
        set: { stars, updatedAt: new Date() },
      });

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
    const [cached] = await db
      .select()
      .from(cachedProductsTable)
      .where(eq(cachedProductsTable.barcode, barcode))
      .limit(1);
    res.json({
      barcode,
      productName: cached?.productName ?? null,
      brand: cached?.brand ?? null,
      hasIngredients: Boolean(cached?.ingredients && cached.ingredients.trim().length > 0),
      hasFrontImage: Boolean(cached?.imageUrl && cached.imageUrl.trim().length > 0),
      missing: {
        productName: !cached?.productName || cached.productName.trim().length === 0,
        brand: !cached?.brand || cached.brand.trim().length === 0,
        ingredients: !cached?.ingredients || cached.ingredients.trim().length === 0,
        frontImage: !cached?.imageUrl || cached.imageUrl.trim().length === 0,
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
    async function tryUpload(b64: unknown, kind: "front" | "ingredients"): Promise<string | null> {
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
      const [created] = await db
        .insert(userSubmittedProductsTable)
        .values({
          barcode,
          productName: updates.productName ?? null,
          brand: updates.brand ?? null,
          ingredients: updates.ingredients ?? null,
          frontImageUrl: updates.frontImageUrl ?? null,
          ingredientsImageUrl: updates.ingredientsImageUrl ?? null,
          submittedBy: userId,
          status: "pending",
        })
        .returning({ id: userSubmittedProductsTable.id });

      // Additive cache patch: only fill empty columns on cached_products so
      // we never overwrite verified data with an unreviewed contribution.
      const [cached] = await db
        .select()
        .from(cachedProductsTable)
        .where(eq(cachedProductsTable.barcode, barcode))
        .limit(1);
      if (cached) {
        const patch: Record<string, string> = {};
        if (updates.productName && (!cached.productName || cached.productName.trim() === "")) {
          patch["productName"] = updates.productName;
        }
        if (updates.brand && (!cached.brand || cached.brand.trim() === "")) {
          patch["brand"] = updates.brand;
        }
        if (updates.frontImageUrl && (!cached.imageUrl || cached.imageUrl.trim() === "")) {
          patch["imageUrl"] = updates.frontImageUrl;
        }
        if (Object.keys(patch).length > 0) {
          await db
            .update(cachedProductsTable)
            .set(patch)
            .where(eq(cachedProductsTable.barcode, barcode));
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
