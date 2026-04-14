import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db, userSubmittedProductsTable, cachedProductsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { uploadBufferToGcs } from "../lib/objectStorage";
import { randomUUID } from "crypto";

const StartBody = z.object({
  barcode: z.string().regex(/^[0-9]{6,14}$/, "Invalid barcode").optional(),
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
});

const PhotosBody = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  frontImageBase64: z.string().optional(),
  ingredientsImageBase64: z.string().optional(),
  ingredientsText: z.string().trim().max(10000).optional(),
});

const AdminReviewBody = z.object({
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  ingredients: z.string().trim().max(10000).optional(),
});

const PREMIUM_CONTRIBUTION_MILESTONE = 5;
const PREMIUM_DURATION_DAYS = 30;

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
- confidence: "high" if clearly readable, "low" if blurry or incomplete
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

async function rewardContributorIdempotent(
  submissionId: string,
  userId: string,
  log: (msg: string, data?: unknown) => void,
): Promise<{ premiumUnlocked: boolean; premiumUntil: Date | null; totalContributions: number }> {
  try {
    const [claimed] = await db
      .update(userSubmittedProductsTable)
      .set({ rewardGranted: true })
      .where(
        sql`${userSubmittedProductsTable.id} = ${submissionId}
          AND ${userSubmittedProductsTable.rewardGranted} = false`,
      )
      .returning({ id: userSubmittedProductsTable.id });

    if (!claimed) {
      log("Reward already granted for submission, skipping", { submissionId });
      const [user] = await db
        .select({ acceptedContributions: usersTable.acceptedContributions })
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      return { premiumUnlocked: false, premiumUntil: null, totalContributions: user?.acceptedContributions ?? 0 };
    }

    const [updated] = await db
      .update(usersTable)
      .set({ acceptedContributions: sql`accepted_contributions + 1` })
      .where(eq(usersTable.id, userId))
      .returning({ acceptedContributions: usersTable.acceptedContributions });

    const newCount = updated?.acceptedContributions ?? 0;

    if (newCount > 0 && newCount % PREMIUM_CONTRIBUTION_MILESTONE === 0) {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DURATION_DAYS);
      await db
        .update(usersTable)
        .set({ premiumUntil })
        .where(eq(usersTable.id, userId));
      log("Premium unlocked via contributions", { userId, count: newCount, premiumUntil });
      return { premiumUnlocked: true, premiumUntil, totalContributions: newCount };
    }

    return { premiumUnlocked: false, premiumUntil: null, totalContributions: newCount };
  } catch (err) {
    log("Failed to process contribution reward", { err });
    return { premiumUnlocked: false, premiumUntil: null, totalContributions: 0 };
  }
}

async function approveSubmission(
  submission: typeof userSubmittedProductsTable.$inferSelect,
  log: (msg: string, data?: unknown) => void,
): Promise<boolean> {
  const hasIngredients = submission.ingredients && submission.ingredients.trim().length > 5;
  if (!hasIngredients) return false;

  if (submission.barcode && submission.barcode !== "unknown") {
    await db
      .insert(cachedProductsTable)
      .values({
        barcode: submission.barcode,
        productName: submission.productName ?? "Unknown product",
        brand: submission.brand ?? "",
        ingredients: submission.ingredients!,
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

  log("Submission approved and cached", { submissionId: submission.id, barcode: submission.barcode });
  return true;
}

const router: IRouter = Router();

router.post("/contribute/start", async (req, res) => {
  const parseResult = StartBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data.", issues: parseResult.error.issues });
    return;
  }

  const { barcode, productName, brand } = parseResult.data;
  const userId = (req as { user?: { id?: string } }).user?.id ?? null;

  try {
    const [submission] = await db
      .insert(userSubmittedProductsTable)
      .values({
        barcode: barcode ?? "unknown",
        productName: productName ?? null,
        brand: brand ?? null,
        submittedBy: userId,
        status: "pending",
        obfContributed: "pending",
        rewardGranted: false,
      })
      .returning();

    res.json({ submissionId: submission?.id });
  } catch (err) {
    req.log.error({ err }, "Failed to start contribution");
    res.status(500).json({ error: "Could not create submission. Please try again." });
  }
});

router.post("/contribute/photos", async (req, res) => {
  const parseResult = PhotosBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data.", issues: parseResult.error.issues });
    return;
  }

  const { submissionId, frontImageBase64, ingredientsImageBase64, ingredientsText } = parseResult.data;
  const userId = (req as { user?: { id?: string } }).user?.id ?? null;

  const [existing] = await db
    .select()
    .from(userSubmittedProductsTable)
    .where(eq(userSubmittedProductsTable.id, submissionId));

  if (!existing) {
    res.status(404).json({ error: "Submission not found." });
    return;
  }

  if (existing.submittedBy && userId !== existing.submittedBy) {
    res.status(403).json({ error: "You are not authorised to modify this submission." });
    return;
  }

  await db
    .update(userSubmittedProductsTable)
    .set({ status: "ai_reviewing" })
    .where(eq(userSubmittedProductsTable.id, submissionId));

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  let extractedProductName: string | undefined;
  let extractedBrand: string | undefined;
  let extractedIngredients: string | undefined;
  let confidence: "high" | "low" = "high";
  let aiNote: string | undefined;

  if ((frontImageBase64 || ingredientsImageBase64) && baseURL && apiKey) {
    const anthropic = new Anthropic({ apiKey, baseURL });
    const [frontResult, ingredientsResult] = await Promise.allSettled([
      frontImageBase64 ? extractFromFrontImage(frontImageBase64, anthropic) : Promise.resolve(null),
      ingredientsImageBase64
        ? extractFromIngredientsImage(ingredientsImageBase64, anthropic)
        : Promise.resolve(null),
    ]);

    if (frontResult.status === "fulfilled" && frontResult.value) {
      extractedProductName = frontResult.value.productName;
      extractedBrand = frontResult.value.brand;
      if (frontResult.value.confidence === "low") confidence = "low";
    }
    if (ingredientsResult.status === "fulfilled" && ingredientsResult.value) {
      extractedIngredients = ingredientsResult.value.ingredients;
      if (ingredientsResult.value.confidence === "low") confidence = "low";
    }
    if (confidence === "low") {
      aiNote = "AI extraction had low confidence — please verify the extracted data.";
    }
  }

  const imageFolder = `contributions/${submissionId}`;
  const [frontImageUrl, ingredientsImageUrl] = await Promise.all([
    frontImageBase64
      ? uploadBufferToGcs(
          Buffer.from(frontImageBase64, "base64"),
          imageFolder,
          `front-${randomUUID()}.jpg`,
          "image/jpeg",
        )
      : Promise.resolve(null),
    ingredientsImageBase64
      ? uploadBufferToGcs(
          Buffer.from(ingredientsImageBase64, "base64"),
          imageFolder,
          `ingredients-${randomUUID()}.jpg`,
          "image/jpeg",
        )
      : Promise.resolve(null),
  ]);

  const finalProductName = existing.productName ?? extractedProductName;
  const finalBrand = existing.brand ?? extractedBrand;
  const finalIngredients = ingredientsText?.trim() || extractedIngredients || null;
  const hasIngredients = finalIngredients && finalIngredients.length > 5;
  const status = hasIngredients && confidence === "high" ? "approved" : "needs_admin";

  try {
    const [updated] = await db
      .update(userSubmittedProductsTable)
      .set({
        productName: finalProductName ?? null,
        brand: finalBrand ?? null,
        ingredients: finalIngredients ?? null,
        submittedBy: userId ?? existing.submittedBy,
        status,
        aiReviewNote: aiNote ?? null,
        frontImageUrl: frontImageUrl ?? existing.frontImageUrl,
        ingredientsImageUrl: ingredientsImageUrl ?? existing.ingredientsImageUrl,
      })
      .where(eq(userSubmittedProductsTable.id, submissionId))
      .returning();

    let premiumUnlocked = false;
    let premiumUntil: Date | null = null;

    if (status === "approved" && updated) {
      const approved = await approveSubmission(updated, (msg, data) =>
        req.log.info(data ?? {}, msg),
      );
      const effectiveUserId = userId ?? existing.submittedBy;
      if (approved && effectiveUserId) {
        const reward = await rewardContributorIdempotent(
          submissionId,
          effectiveUserId,
          (msg, data) => req.log.info(data ?? {}, msg),
        );
        premiumUnlocked = reward.premiumUnlocked;
        premiumUntil = reward.premiumUntil;
      }
    }

    res.json({
      submissionId,
      status,
      extractedIngredients: hasIngredients ? finalIngredients : null,
      premiumUnlocked,
      premiumUntil: premiumUntil?.toISOString() ?? null,
      message:
        status === "approved"
          ? "Thank you! Your contribution has been added to our database."
          : "Thank you! Your submission is under review — we'll add it soon.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to process contribution photos");
    res.status(500).json({ error: "Could not process your submission. Please try again." });
  }
});

router.get("/contribute/status/:id", async (req, res) => {
  const { id } = req.params;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid submission ID." });
    return;
  }

  const userId = (req as { user?: { id?: string } }).user?.id ?? null;

  try {
    const [submission] = await db
      .select({
        id: userSubmittedProductsTable.id,
        status: userSubmittedProductsTable.status,
        productName: userSubmittedProductsTable.productName,
        brand: userSubmittedProductsTable.brand,
        ingredients: userSubmittedProductsTable.ingredients,
        aiReviewNote: userSubmittedProductsTable.aiReviewNote,
        submittedBy: userSubmittedProductsTable.submittedBy,
      })
      .from(userSubmittedProductsTable)
      .where(eq(userSubmittedProductsTable.id, id));

    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    if (submission.submittedBy && userId !== submission.submittedBy) {
      res.status(403).json({ error: "Not authorised to view this submission." });
      return;
    }

    const { submittedBy: _omit, ...safe } = submission;
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch submission status");
    res.status(500).json({ error: "Could not fetch submission status." });
  }
});

router.get("/contribute/stats", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.json({ acceptedContributions: 0, premiumUntil: null, premiumJustUnlocked: false });
    return;
  }

  try {
    const [user] = await db
      .select({
        acceptedContributions: usersTable.acceptedContributions,
        premiumUntil: usersTable.premiumUntil,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const premiumUntil = user?.premiumUntil ?? null;
    const justUnlocked =
      premiumUntil !== null &&
      new Date().getTime() - premiumUntil.getTime() < 24 * 60 * 60 * 1000 * 29;

    res.json({
      acceptedContributions: user?.acceptedContributions ?? 0,
      premiumUntil: premiumUntil?.toISOString() ?? null,
      premiumJustUnlocked: justUnlocked,
    });
  } catch {
    res.json({ acceptedContributions: 0, premiumUntil: null, premiumJustUnlocked: false });
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
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid submission ID." });
    return;
  }

  const parseResult = AdminReviewBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data." });
    return;
  }

  const { productName, brand, ingredients } = parseResult.data;

  try {
    const [existing] = await db
      .select()
      .from(userSubmittedProductsTable)
      .where(eq(userSubmittedProductsTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    const [updated] = await db
      .update(userSubmittedProductsTable)
      .set({
        status: "approved",
        ...(productName !== undefined ? { productName } : {}),
        ...(brand !== undefined ? { brand } : {}),
        ...(ingredients !== undefined ? { ingredients } : {}),
        reviewedAt: new Date(),
      })
      .where(eq(userSubmittedProductsTable.id, id))
      .returning();

    if (updated) {
      await approveSubmission(updated, (msg, data) => req.log.info(data ?? {}, msg));
      if (updated.submittedBy && !updated.rewardGranted) {
        await rewardContributorIdempotent(
          id,
          updated.submittedBy,
          (msg, data) => req.log.info(data ?? {}, msg),
        );
      }
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
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid submission ID." });
    return;
  }

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
