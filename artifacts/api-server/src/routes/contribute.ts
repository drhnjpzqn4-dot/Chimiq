import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db, userSubmittedProductsTable, cachedProductsTable, usersTable } from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { uploadBufferToGcs } from "../lib/objectStorage.js";
import { getAdminEmails, getRequestEmail, isRequestAdmin } from "../lib/admin.js";
import { randomUUID } from "crypto";
import {
  sanitizeProductName,
  sanitizeBrand,
  sanitizeIngredients,
  SanitizationError,
} from "../lib/sanitize.js";
import { evaluateContributionBadges } from "../lib/gamification.js";
import { requireAuth } from "../lib/authGate.js";
import { ipRateLimit } from "../lib/rateLimit.js";

const StartBody = z.object({
  barcode: z.string().regex(/^[0-9]{6,14}$/, "A valid 6–14 digit barcode is required."),
  productName: z.string().trim().min(1, "Product name is required.").max(500),
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

const AdminRejectBody = z.object({
  reason: z.string().trim().min(1, "Reason is required.").max(500),
});

const PREMIUM_CONTRIBUTION_MILESTONE = 30;
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

    // Idempotently award count-based badges. Errors here must NOT block
    // the contribution reward path — badges are a nice-to-have layer.
    try {
      await evaluateContributionBadges(userId, newCount);
    } catch (err) {
      log("Badge evaluation failed (non-fatal)", { err });
    }

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

  let safeName: string;
  let safeBrand: string;
  try {
    safeName = sanitizeProductName(productName, false);
    safeBrand = sanitizeBrand(brand, true);
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Reject duplicates: only NEW products count toward the 30-product milestone
  if (barcode) {
    const [existingCached] = await db
      .select({ barcode: cachedProductsTable.barcode, productName: cachedProductsTable.productName })
      .from(cachedProductsTable)
      .where(eq(cachedProductsTable.barcode, barcode));
    if (existingCached) {
      res.status(409).json({
        error: `This product (${existingCached.productName}) is already in our database — thank you! Only new products count toward your contribution milestone.`,
        alreadyInDatabase: true,
      });
      return;
    }
  }

  try {
    const [submission] = await db
      .insert(userSubmittedProductsTable)
      .values({
        barcode: barcode ?? "unknown",
        productName: safeName || null,
        brand: safeBrand || null,
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

// Two vision LLM calls per submission (front photo + ingredients photo) make
// this the most expensive contribution endpoint. `requireAuth` forces every
// vision call to be tied to a real user (admin can also revoke abuse), and
// the IP limiter is a backstop against runaway clients submitting the same
// photos in a loop. The submissionId being a UUID issued by /contribute/start
// already throttles legitimate happy-path traffic.
const contributePhotosLimiter = ipRateLimit({
  windowMs: 60_000,
  max: 8,
  key: "contribute-photos",
});

router.post("/contribute/photos", requireAuth, contributePhotosLimiter, async (req, res) => {
  const parseResult = PhotosBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data.", issues: parseResult.error.issues });
    return;
  }

  const { submissionId, frontImageBase64, ingredientsImageBase64, ingredientsText } = parseResult.data;
  const userId = (req as { user?: { id?: string } }).user?.id ?? null;

  let safeIngredientsText: string | undefined;
  try {
    if (ingredientsText && ingredientsText.trim().length > 0) {
      safeIngredientsText = sanitizeIngredients(ingredientsText, false);
    }
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

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

  
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let extractedProductName: string | undefined;
  let extractedBrand: string | undefined;
  let extractedIngredients: string | undefined;
  let confidence: "high" | "low" = "high";
  let aiNote: string | undefined;

  if ((frontImageBase64 || ingredientsImageBase64) && baseURL && apiKey) {
    const anthropic = new Anthropic({ apiKey });
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

  // Sanitize AI-extracted product name / brand (defence in depth: AI output is untrusted user content)
  let safeExtractedProductName: string | null = extractedProductName ?? null;
  let safeExtractedBrand: string | null = extractedBrand ?? null;
  if (safeExtractedProductName) {
    try {
      safeExtractedProductName = sanitizeProductName(safeExtractedProductName);
    } catch {
      safeExtractedProductName = null;
    }
  }
  if (safeExtractedBrand) {
    try {
      safeExtractedBrand = sanitizeBrand(safeExtractedBrand);
    } catch {
      safeExtractedBrand = null;
    }
  }
  const finalProductName = existing.productName ?? safeExtractedProductName;
  const finalBrand = existing.brand ?? safeExtractedBrand;
  let finalIngredients: string | null =
    safeIngredientsText || extractedIngredients || null;

  // Sanitize AI-extracted ingredients too (defence in depth)
  if (finalIngredients) {
    try {
      finalIngredients = sanitizeIngredients(finalIngredients, false);
    } catch (err) {
      if (err instanceof SanitizationError) {
        finalIngredients = null;
      }
    }
  }

  const hasIngredients = !!finalIngredients && finalIngredients.length > 5;
  const hasProductName = !!finalProductName && finalProductName.trim().length > 0;
  const hasFrontPhoto = !!frontImageBase64 || !!existing.frontImageUrl;
  const hasRealBarcode = !!existing.barcode && existing.barcode !== "unknown";

  // Hard-reject incomplete submissions with a clear error. We re-check ALL four required
  // fields here (not just the two added in this step) — the start route enforces name +
  // barcode, but defensive re-checking handles legacy rows, sanitization-to-empty, etc.
  const missingFields: string[] = [];
  if (!hasProductName) missingFields.push("product name");
  if (!hasRealBarcode) missingFields.push("barcode");
  if (!hasFrontPhoto) missingFields.push("front photo");
  if (!hasIngredients) missingFields.push("ingredient list");
  if (missingFields.length > 0) {
    res.status(400).json({
      error: `Please add the missing ${missingFields.join(", ")} before submitting.`,
      missingFields,
    });
    return;
  }

  // All four fields required to count as a "complete contribution" toward the milestone
  const isCompleteContribution =
    hasIngredients && hasProductName && hasFrontPhoto && hasRealBarcode;

  const status =
    isCompleteContribution && confidence === "high" ? "approved" : "needs_admin";

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
      // Re-check newness BEFORE approveSubmission upserts the cache row. Closes the race
      // window between /contribute/start (where we first checked) and now: if the barcode
      // was added to cached_products by anyone in the meantime, this submission is no
      // longer a "new" product and must not count toward the milestone.
      let isStillNewProduct = true;
      if (existing.barcode && existing.barcode !== "unknown") {
        const [preexisting] = await db
          .select({ barcode: cachedProductsTable.barcode })
          .from(cachedProductsTable)
          .where(eq(cachedProductsTable.barcode, existing.barcode));
        if (preexisting) isStillNewProduct = false;
      }

      const approved = await approveSubmission(updated, (msg, data) =>
        req.log.info(data ?? {}, msg),
      );
      const effectiveUserId = userId ?? existing.submittedBy;
      if (approved && effectiveUserId && isStillNewProduct) {
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
        // Surface the admin's rejection reason so the submitter can see why
        // their product wasn't accepted (#72). Only populated for rejected
        // submissions; null otherwise.
        reviewNote: userSubmittedProductsTable.reviewNote,
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
      premiumUntil.getTime() - Date.now() > 24 * 60 * 60 * 1000 * 29;

    res.json({
      acceptedContributions: user?.acceptedContributions ?? 0,
      premiumUntil: premiumUntil?.toISOString() ?? null,
      premiumJustUnlocked: justUnlocked,
    });
  } catch {
    res.json({ acceptedContributions: 0, premiumUntil: null, premiumJustUnlocked: false });
  }
});

// Admin helpers centralized in lib/admin.ts (#46b).

router.get("/admin/check", async (req, res) => {
  const email = getRequestEmail(req as { user?: { email?: string } });
  if (!email) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  res.json({ isAdmin: getAdminEmails().includes(email) });
});

/**
 * GET /admin/submissions — list crowdsourced product submissions for review.
 *
 * Query params (all optional):
 *  - status   pending|approved|rejected|all  (default: pending)
 *             "pending" maps to the internal "needs_admin" status.
 *  - q        case-insensitive substring match on barcode, product name,
 *             or brand. Wildcards are escaped.
 *  - limit    1-200 (default 200)
 *
 * Always ordered newest-submitted first. Bumped to a richer response so the
 * admin UI can show approved/rejected history alongside the pending queue
 * (#73).
 */
const AdminSubmissionsQuery = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

router.get("/admin/submissions", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const parsed = AdminSubmissionsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }

  const { status, q, limit } = parsed.data;
  const conds = [];
  // "pending" is the user-facing label; the schema status is "needs_admin".
  if (!status || status === "pending") {
    conds.push(eq(userSubmittedProductsTable.status, "needs_admin"));
  } else if (status === "approved") {
    conds.push(eq(userSubmittedProductsTable.status, "approved"));
  } else if (status === "rejected") {
    conds.push(eq(userSubmittedProductsTable.status, "rejected"));
  }
  // status === "all" intentionally adds no status condition.

  if (q && q.length > 0) {
    const needle = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const orClauses = or(
      ilike(userSubmittedProductsTable.barcode, needle),
      ilike(userSubmittedProductsTable.productName, needle),
      ilike(userSubmittedProductsTable.brand, needle),
    );
    if (orClauses) conds.push(orClauses);
  }

  try {
    const rows = await db
      .select()
      .from(userSubmittedProductsTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(userSubmittedProductsTable.submittedAt))
      .limit(limit ?? 200);
    res.json({ submissions: rows });
  } catch (err) {
    req.log.error({ err }, "Admin submissions query failed");
    res.status(500).json({ error: "Failed to load submissions." });
  }
});

/**
 * GET /contribute/my-recent — return the logged-in user's most recent
 * submissions so the contributor surface (Profile) can show the admin's
 * rejection note (#72) and let users follow up on outstanding items.
 * Returns at most 10 rows, newest first.
 */
router.get("/contribute/my-recent", async (req, res) => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    res.json({ submissions: [] });
    return;
  }

  try {
    const rows = await db
      .select({
        id: userSubmittedProductsTable.id,
        barcode: userSubmittedProductsTable.barcode,
        productName: userSubmittedProductsTable.productName,
        brand: userSubmittedProductsTable.brand,
        status: userSubmittedProductsTable.status,
        reviewNote: userSubmittedProductsTable.reviewNote,
        aiReviewNote: userSubmittedProductsTable.aiReviewNote,
        submittedAt: userSubmittedProductsTable.submittedAt,
        reviewedAt: userSubmittedProductsTable.reviewedAt,
      })
      .from(userSubmittedProductsTable)
      .where(eq(userSubmittedProductsTable.submittedBy, userId))
      .orderBy(desc(userSubmittedProductsTable.submittedAt))
      .limit(10);
    res.json({ submissions: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load user's recent submissions");
    res.status(500).json({ error: "Failed to load your submissions." });
  }
});

router.post("/admin/submissions/:id/approve", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string } })) {
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
      // Same completeness gate as the user-facing /contribute/photos route, applied here so
      // an admin click can never grant the milestone reward for an incomplete submission.
      const adminHasName = !!updated.productName && updated.productName.trim().length > 0;
      const adminHasIngredients = !!updated.ingredients && updated.ingredients.length > 5;
      const adminHasFront = !!updated.frontImageUrl;
      const adminHasBarcode = !!updated.barcode && updated.barcode !== "unknown";
      const adminIsComplete =
        adminHasName && adminHasIngredients && adminHasFront && adminHasBarcode;

      // Also check the submission isn't a duplicate of an already-cached product —
      // duplicates must never count toward a user's contribution milestone.
      let isNewProduct = true;
      if (adminHasBarcode) {
        const [dup] = await db
          .select({ barcode: cachedProductsTable.barcode })
          .from(cachedProductsTable)
          .where(eq(cachedProductsTable.barcode, updated.barcode!));
        if (dup) isNewProduct = false;
      }

      await approveSubmission(updated, (msg, data) => req.log.info(data ?? {}, msg));
      if (updated.submittedBy && !updated.rewardGranted && adminIsComplete && isNewProduct) {
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
  if (!isRequestAdmin(req as { user?: { email?: string } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const { id } = req.params;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    res.status(400).json({ error: "Invalid submission ID." });
    return;
  }

  const parseResult = AdminRejectBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0]?.message ?? "Invalid data." });
    return;
  }

  try {
    const updated = await db
      .update(userSubmittedProductsTable)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewNote: parseResult.data.reason,
      })
      .where(
        sql`${userSubmittedProductsTable.id} = ${id}
          AND ${userSubmittedProductsTable.status} = 'needs_admin'`,
      )
      .returning({ id: userSubmittedProductsTable.id });

    if (updated.length === 0) {
      const [existing] = await db
        .select({ status: userSubmittedProductsTable.status })
        .from(userSubmittedProductsTable)
        .where(eq(userSubmittedProductsTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "Submission not found." });
      } else {
        res.status(409).json({
          error: `Submission is no longer pending review (current status: ${existing.status}).`,
        });
      }
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Admin reject failed");
    res.status(500).json({ error: "Failed to reject submission." });
  }
});

export default router;
