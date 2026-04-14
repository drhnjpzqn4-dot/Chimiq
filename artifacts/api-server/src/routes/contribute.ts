import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db, userSubmittedProductsTable, cachedProductsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const ContributeBody = z.object({
  barcode: z.string().regex(/^[0-9]{6,14}$/, "Invalid barcode").optional(),
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  ingredientsText: z.string().trim().max(10000).optional(),
  frontImageBase64: z.string().optional(),
  ingredientsImageBase64: z.string().optional(),
});

const AdminReviewBody = z.object({
  id: z.string().uuid(),
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  ingredients: z.string().trim().max(10000).optional(),
});

interface ExtractionResult {
  productName?: string;
  brand?: string;
  ingredients?: string;
  confidence: "high" | "low";
  note?: string;
}

async function extractFromFrontImage(
  imageBase64: string,
  anthropic: Anthropic,
): Promise<{ productName?: string; brand?: string; confidence: "high" | "low" }> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
            },
            {
              type: "text",
              text: `Look at this product image. Extract the product name and brand.
Return ONLY valid JSON: {"productName": "...", "brand": "...", "confidence": "high"|"low"}
If you cannot clearly read the product name or brand, set confidence to "low".
Return only JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    const raw = block.type === "text" ? block.text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { confidence: "low" };
    const parsed = JSON.parse(jsonMatch[0]) as { productName?: string; brand?: string; confidence?: string };
    return {
      productName: parsed.productName ?? undefined,
      brand: parsed.brand ?? undefined,
      confidence: parsed.confidence === "high" ? "high" : "low",
    };
  } catch {
    return { confidence: "low" };
  }
}

async function extractFromIngredientsImage(
  imageBase64: string,
  anthropic: Anthropic,
): Promise<{ ingredients?: string; confidence: "high" | "low" }> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
            },
            {
              type: "text",
              text: `Look at this product label image. Extract ONLY the ingredients list.
Return ONLY valid JSON: {"ingredients": "...", "confidence": "high"|"low"}
- ingredients: the raw ingredient list as plain comma-separated text
- confidence: "high" if the text is clearly readable, "low" if blurry or incomplete
- If no ingredient list found: {"ingredients": null, "confidence": "low"}
Return only JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    const raw = block.type === "text" ? block.text.trim() : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { confidence: "low" };
    const parsed = JSON.parse(jsonMatch[0]) as { ingredients?: string | null; confidence?: string };
    return {
      ingredients: parsed.ingredients ?? undefined,
      confidence: parsed.confidence === "high" ? "high" : "low",
    };
  } catch {
    return { confidence: "low" };
  }
}

async function rewardContributor(userId: string, log: (msg: string, data?: unknown) => void) {
  try {
    const rows = await db
      .select({ id: userSubmittedProductsTable.id })
      .from(userSubmittedProductsTable)
      .where(
        and(
          eq(userSubmittedProductsTable.submittedBy, userId),
          eq(userSubmittedProductsTable.status, "approved"),
        ),
      );

    const count = rows.length;

    if (count > 0 && count % 5 === 0) {
      await db
        .update(usersTable)
        .set({ plan: "premium" })
        .where(eq(usersTable.id, userId));
      log("Contribution milestone reached — premium unlocked", { userId, count });
    }
  } catch (err) {
    log("Failed to process contribution reward", { err });
  }
}

const router: IRouter = Router();

router.post("/contribute", async (req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  const parseResult = ContributeBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid contribution data.", issues: parseResult.error.issues });
    return;
  }

  const { barcode, productName, brand, ingredientsText, frontImageBase64, ingredientsImageBase64 } = parseResult.data;

  if (!barcode && !ingredientsText && !ingredientsImageBase64) {
    res.status(400).json({ error: "Provide a barcode or ingredient information." });
    return;
  }

  const userId = (req as { user?: { id?: string } }).user?.id ?? null;

  let extraction: ExtractionResult = { confidence: "high" };
  let aiNote: string | undefined;

  if ((frontImageBase64 || ingredientsImageBase64) && baseURL && apiKey) {
    const anthropic = new Anthropic({ apiKey, baseURL });
    const [frontResult, ingredientsResult] = await Promise.allSettled([
      frontImageBase64 ? extractFromFrontImage(frontImageBase64, anthropic) : Promise.resolve(null),
      ingredientsImageBase64 ? extractFromIngredientsImage(ingredientsImageBase64, anthropic) : Promise.resolve(null),
    ]);

    if (frontResult.status === "fulfilled" && frontResult.value) {
      if (!productName && frontResult.value.productName) extraction.productName = frontResult.value.productName;
      if (!brand && frontResult.value.brand) extraction.brand = frontResult.value.brand;
      if (frontResult.value.confidence === "low") extraction.confidence = "low";
    }

    if (ingredientsResult.status === "fulfilled" && ingredientsResult.value) {
      if (!ingredientsText && ingredientsResult.value.ingredients) {
        extraction.ingredients = ingredientsResult.value.ingredients;
      }
      if (ingredientsResult.value.confidence === "low") extraction.confidence = "low";
    }

    if (extraction.confidence === "low") {
      aiNote = "AI extraction had low confidence — please verify the extracted data.";
    }
  }

  const finalProductName = productName ?? extraction.productName;
  const finalBrand = brand ?? extraction.brand;
  const finalIngredients = ingredientsText ?? extraction.ingredients;

  const hasIngredients = finalIngredients && finalIngredients.trim().length > 5;
  const status = hasIngredients && extraction.confidence === "high" ? "approved" : "needs_admin";

  try {
    const [submission] = await db
      .insert(userSubmittedProductsTable)
      .values({
        barcode: barcode ?? "unknown",
        productName: finalProductName ?? null,
        brand: finalBrand ?? null,
        ingredients: finalIngredients ?? null,
        submittedBy: userId,
        status,
        aiReviewNote: aiNote ?? null,
        obfContributed: "pending",
      })
      .returning();

    if (status === "approved" && hasIngredients && barcode) {
      db.insert(cachedProductsTable)
        .values({
          barcode,
          productName: finalProductName ?? "Unknown product",
          brand: finalBrand ?? "",
          ingredients: finalIngredients!,
          imageUrl: null,
        })
        .onConflictDoUpdate({
          target: cachedProductsTable.barcode,
          set: {
            productName: sql`EXCLUDED.product_name`,
            brand: sql`EXCLUDED.brand`,
            ingredients: sql`EXCLUDED.ingredients`,
            cachedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    if (status === "approved" && userId) {
      rewardContributor(userId, (msg, data) => req.log.info(data ?? {}, msg)).catch(() => {});
    }

    res.json({
      submissionId: submission?.id,
      status,
      extractedIngredients: hasIngredients ? finalIngredients : null,
      message: status === "approved"
        ? "Thank you! Your contribution has been added to our database."
        : "Thank you! Your submission is under review — we'll add it soon.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save contribution");
    res.status(500).json({ error: "Could not save your contribution. Please try again." });
  }
});

router.get("/contribute/stats", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.json({ acceptedContributions: 0 });
    return;
  }

  try {
    const rows = await db
      .select({ id: userSubmittedProductsTable.id })
      .from(userSubmittedProductsTable)
      .where(
        and(
          eq(userSubmittedProductsTable.submittedBy, userId),
          eq(userSubmittedProductsTable.status, "approved"),
        ),
      );
    res.json({ acceptedContributions: rows.length });
  } catch {
    res.json({ acceptedContributions: 0 });
  }
});

router.get("/admin/submissions", async (req, res) => {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const userEmail = (req as { user?: { email?: string } }).user?.email;

  if (!userEmail || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(userSubmittedProductsTable)
      .where(eq(userSubmittedProductsTable.status, "needs_admin"));
    res.json({ submissions: rows });
  } catch (err) {
    req.log.error({ err }, "Admin submissions query failed");
    res.status(500).json({ error: "Failed to load submissions." });
  }
});

router.post("/admin/submissions/:id/approve", async (req, res) => {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const userEmail = (req as { user?: { email?: string } }).user?.email;

  if (!userEmail || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const { id } = req.params;
  const parseResult = AdminReviewBody.safeParse({ id, ...req.body });
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data." });
    return;
  }

  const { productName, brand, ingredients } = parseResult.data;

  try {
    const [updated] = await db
      .update(userSubmittedProductsTable)
      .set({
        status: "approved",
        productName: productName ?? sql`product_name`,
        brand: brand ?? sql`brand`,
        ingredients: ingredients ?? sql`ingredients`,
        reviewedAt: new Date(),
      })
      .where(eq(userSubmittedProductsTable.id, id))
      .returning();

    if (updated?.barcode && updated.barcode !== "unknown" && updated.ingredients) {
      await db
        .insert(cachedProductsTable)
        .values({
          barcode: updated.barcode,
          productName: updated.productName ?? "Unknown product",
          brand: updated.brand ?? "",
          ingredients: updated.ingredients,
          imageUrl: null,
        })
        .onConflictDoUpdate({
          target: cachedProductsTable.barcode,
          set: {
            productName: sql`EXCLUDED.product_name`,
            brand: sql`EXCLUDED.brand`,
            ingredients: sql`EXCLUDED.ingredients`,
            cachedAt: new Date(),
          },
        });
    }

    if (updated?.submittedBy) {
      rewardContributor(updated.submittedBy, (msg, data) => req.log.info(data ?? {}, msg)).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin approve failed");
    res.status(500).json({ error: "Failed to approve submission." });
  }
});

router.post("/admin/submissions/:id/reject", async (req, res) => {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const userEmail = (req as { user?: { email?: string } }).user?.email;

  if (!userEmail || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const { id } = req.params;

  try {
    await db
      .update(userSubmittedProductsTable)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(userSubmittedProductsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin reject failed");
    res.status(500).json({ error: "Failed to reject submission." });
  }
});

export default router;
