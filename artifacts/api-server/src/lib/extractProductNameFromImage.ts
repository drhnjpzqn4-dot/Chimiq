import Anthropic from "@anthropic-ai/sdk";

export type ProductNameExtraction = {
  productName: string | null;
  brand: string | null;
  confidence: "high" | "low";
};

const EMPTY: ProductNameExtraction = {
  productName: null,
  brand: null,
  confidence: "low",
};

/** OCR av förpackningens framsida — produktnamn + märke (Claude Vision). */
export async function extractProductNameFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  anthropic: Anthropic,
): Promise<ProductNameExtraction> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            {
              type: "text",
              text: `Look at this product packaging image. Extract ONLY:
1. The product name (e.g. "Daily Moisturiser SPF 30")
2. The brand name (e.g. "NIVEA")

Respond with JSON only, no explanation:
{"productName": "...", "brand": "...", "confidence": "high" or "low"}

If you cannot clearly read the product name or brand, use null for that field and set confidence to "low".`,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    const raw = block.type === "text" ? block.text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return EMPTY;

    const parsed = JSON.parse(jsonMatch[0]) as {
      productName?: string | null;
      brand?: string | null;
      confidence?: string;
    };

    return {
      productName:
        typeof parsed.productName === "string" && parsed.productName.trim()
          ? parsed.productName.trim()
          : null,
      brand:
        typeof parsed.brand === "string" && parsed.brand.trim() ? parsed.brand.trim() : null,
      confidence: parsed.confidence === "high" ? "high" : "low",
    };
  } catch {
    return EMPTY;
  }
}
