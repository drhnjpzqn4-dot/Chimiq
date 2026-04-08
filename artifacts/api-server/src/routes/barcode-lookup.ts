import { Router, type IRouter } from "express";
import { db, cachedProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/barcode/:code", async (req, res) => {
  const { code } = req.params;

  if (!code || !/^[0-9]{6,14}$/.test(code)) {
    res.status(400).json({ found: false, error: "Invalid barcode" });
    return;
  }

  const [cached] = await db
    .select()
    .from(cachedProductsTable)
    .where(eq(cachedProductsTable.barcode, code));

  if (cached) {
    res.json({
      found: true,
      productName: cached.productName,
      brand: cached.brand,
      ingredients: cached.ingredients,
      imageUrl: cached.imageUrl ?? null,
      fromCache: true,
    });
    return;
  }

  try {
    const url = `https://world.openbeautyfacts.org/product/${encodeURIComponent(code)}.json`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "SkinScreen/1.0 (https://skinscreen.app)" },
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("json")) {
      res.json({ found: false });
      return;
    }

    const data = (await response.json()) as {
      status: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      res.json({ found: false });
      return;
    }

    const p = data.product;
    const ingredients = (
      (p["ingredients_text_en"] as string | undefined) ??
      (p["ingredients_text"] as string | undefined) ??
      ""
    ).trim();

    if (!ingredients || ingredients.length < 5) {
      res.json({ found: false, reason: "no_ingredients" });
      return;
    }

    const productName = (p["product_name"] as string | undefined) ?? "Unknown product";
    const brand = (p["brands"] as string | undefined) ?? "";
    const imageUrl = (p["image_front_small_url"] as string | undefined) ?? null;

    db.insert(cachedProductsTable)
      .values({ barcode: code, productName, brand, ingredients, imageUrl })
      .onConflictDoNothing()
      .catch((err) => req.log.warn({ err }, "Cache write failed"));

    res.json({
      found: true,
      productName,
      brand,
      ingredients,
      imageUrl,
    });
  } catch (err) {
    req.log.warn({ err }, "Barcode lookup failed");
    res.json({ found: false });
  }
});

export default router;
