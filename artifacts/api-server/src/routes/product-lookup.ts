import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/product-lookup", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!q || q.length < 2) {
    res.json({ found: false });
    return;
  }

  try {
    const url =
      `https://world.openbeautyfacts.org/cgi/search.pl` +
      `?action=process` +
      `&search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1` +
      `&output_format=json` +
      `&fields=product_name,brands,ingredients_text_en,ingredients_text` +
      `&json=1` +
      `&page_size=10`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "SkinScreen/1.0 (https://skinscreen.app)" },
    });

    if (!response.ok) {
      res.json({ found: false });
      return;
    }

    const data = (await response.json()) as { products?: Record<string, unknown>[] };
    const products = data.products ?? [];

    const match = products.find((p) => {
      const text = (p["ingredients_text_en"] as string | undefined) ?? (p["ingredients_text"] as string | undefined) ?? "";
      return text.trim().length > 10;
    });

    if (!match) {
      res.json({ found: false });
      return;
    }

    const ingredients = (
      (match["ingredients_text_en"] as string | undefined) ??
      (match["ingredients_text"] as string | undefined) ??
      ""
    ).trim();

    res.json({
      found: true,
      productName: (match["product_name"] as string | undefined) ?? q,
      brand: (match["brands"] as string | undefined) ?? "",
      ingredients,
    });
  } catch (err) {
    req.log.warn({ err }, "Product lookup failed");
    res.json({ found: false });
  }
});

export default router;
