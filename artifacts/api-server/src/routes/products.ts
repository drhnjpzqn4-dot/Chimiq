import { Router, type IRouter } from "express";
import { db, cachedProductsTable, analysisCacheTable } from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { computeSingleHash } from "../lib/analysis-cache.js";

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

export default router;
