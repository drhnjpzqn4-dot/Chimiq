import { Router, type IRouter } from "express";

const router: IRouter = Router();

function scoreMatch(query: string, productName: string, brand: string): number {
  const q = query.toLowerCase();
  const name = productName.toLowerCase();
  const br = brand.toLowerCase();
  const queryWords = q.split(/\s+/).filter((w) => w.length > 1);

  let score = 0;

  if (name === q || `${br} ${name}` === q) score += 100;
  if (name.startsWith(q) || `${br} ${name}`.startsWith(q)) score += 50;

  for (const word of queryWords) {
    if (name.includes(word)) score += 10;
    if (br.includes(word)) score += 5;
  }

  return score;
}

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
      `&page_size=15`;

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

    const candidates = products
      .filter((p) => {
        const text =
          (p["ingredients_text_en"] as string | undefined) ??
          (p["ingredients_text"] as string | undefined) ??
          "";
        return text.trim().length > 10;
      })
      .map((p) => ({
        p,
        score: scoreMatch(
          q,
          (p["product_name"] as string | undefined) ?? "",
          (p["brands"] as string | undefined) ?? "",
        ),
      }))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    if (!best) {
      res.json({ found: false });
      return;
    }

    const { p: match } = best;
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
