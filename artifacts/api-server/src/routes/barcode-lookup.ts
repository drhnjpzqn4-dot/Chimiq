import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, cachedProductsTable, userSubmittedProductsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  SanitizationError,
  sanitizeBrand,
  sanitizeIngredients,
  sanitizeProductName,
} from "../lib/sanitize.js";

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
      await recordUnknownBarcode(code, req.log);
      res.json({ found: false, recorded: true });
      return;
    }

    const data = (await response.json()) as {
      status: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      await recordUnknownBarcode(code, req.log);
      res.json({ found: false, recorded: true });
      return;
    }

    const p = data.product;
    const ingredients = (
      (p["ingredients_text_en"] as string | undefined) ??
      (p["ingredients_text"] as string | undefined) ??
      ""
    ).trim();

    if (!ingredients || ingredients.length < 5) {
      const productName = (p["product_name"] as string | undefined) ?? undefined;
      const brand = (p["brands"] as string | undefined) ?? undefined;
      await recordUnknownBarcode(code, req.log, productName, brand, undefined);
      res.json({ found: false, reason: "no_ingredients", recorded: true });
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
    await recordUnknownBarcode(code, req.log).catch(() => {});
    res.json({ found: false, recorded: true });
  }
});

const SubmitProductBody = z.object({
  barcode: z.string().regex(/^[0-9]{6,14}$/, "Invalid barcode"),
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
    await db.insert(userSubmittedProductsTable).values({
      barcode,
      productName: productName || null,
      brand: brand || null,
      ingredients: ingredients || null,
      status: "pending",
      obfContributed: "pending",
    });

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
    await db.insert(userSubmittedProductsTable).values({
      barcode,
      productName: productName ?? null,
      brand: brand ?? null,
      ingredients: ingredients ?? null,
      status: "pending",
      obfContributed: "pending",
    });
  } catch (err) {
    log.warn({ err }, "Failed to record unknown barcode in user_submitted_products");
  }
}

export default router;
