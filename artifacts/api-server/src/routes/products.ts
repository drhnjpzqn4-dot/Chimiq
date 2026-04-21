import { Router, type IRouter } from "express";
import { db, cachedProductsTable } from "@workspace/db";
import { desc, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

// Public: list recently-cached / community-contributed products for the in-app
// Browse surface. No auth required so guests can see the database depth.
router.get("/products", async (req, res) => {
  // Cap search length: ILIKE on long unbounded strings can become an expensive
  // wildcard scan, and there is no realistic UI need for >80 chars.
  const q = String(req.query.q ?? "").trim().slice(0, 80);
  const limitRaw = Number(req.query.limit ?? 30);
  const offsetRaw = Number(req.query.offset ?? 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 60) : 30;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  try {
    const where = q
      ? or(
          ilike(cachedProductsTable.productName, `%${q}%`),
          ilike(cachedProductsTable.brand, `%${q}%`),
        )
      : undefined;

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

    res.json({
      products: rows.map((p) => ({
        barcode: p.barcode,
        productName: p.productName,
        brand: p.brand,
        imageUrl: p.imageUrl,
        cachedAt: p.cachedAt.toISOString(),
        ingredientsPreview:
          p.ingredients.length > 140
            ? `${p.ingredients.slice(0, 140)}…`
            : p.ingredients,
      })),
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Could not load products." });
  }
});

export default router;
