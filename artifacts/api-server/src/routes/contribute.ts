import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { extractProductNameFromImage } from "../lib/extractProductNameFromImage.js";
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
import { ProductTypeSchema } from "../lib/product-type.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import { isValidGtin } from "../lib/ean.js";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function notifyAdminsOfNewSubmission(
  params: { productName: string; brand: string; barcode: string },
  log: { warn: (obj: unknown, msg: string) => void },
): void {
  if (!resend) return;

  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return;

  const { productName, brand, barcode } = params;
  const subject = `Ny produktinlämning: ${productName} (${barcode})`;
  const text = `En ny produkt har skickats in och väntar på granskning.

Produkt: ${productName}
Märke: ${brand}
Streckkod: ${barcode}

Granska på: https://chimiq.com/admin/submissions`;

  void (async () => {
    try {
      await resend.emails.send({
        from: "Chimiq Admin <noreply@chimiq.com>",
        to: adminEmails,
        subject,
        text,
      });
    } catch (err) {
      log.warn({ err }, "Admin submission notification email failed");
    }
  })();
}

const AUTO_APPROVE_ENABLED = process.env.AUTO_APPROVE_ENABLED === "true";

function normalizeProductNameWords(name: string): string[] {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** True when submitted and extracted names share ≥80% of words (by max word count). */
function productNamesSimilarityMatch(submitted: string, extracted: string): boolean {
  const submittedWords = normalizeProductNameWords(submitted);
  const extractedWords = normalizeProductNameWords(extracted);
  if (submittedWords.length === 0 || extractedWords.length === 0) return false;

  const extractedSet = new Set(extractedWords);
  const overlap = submittedWords.filter((w) => extractedSet.has(w)).length;
  return overlap / Math.max(submittedWords.length, extractedWords.length) >= 0.8;
}

function evaluatePhotoAutoApproval(params: {
  frontImageConfidence: "high" | "low" | undefined;
  ingredientsImageConfidence: "high" | "low" | undefined;
  submittedProductName: string | null;
  extractedProductName: string | null;
  ingredients: string | null;
}): { autoApprove: boolean; aiReviewNote: string } {
  if (params.frontImageConfidence !== "high") {
    return { autoApprove: false, aiReviewNote: "Low confidence: front image" };
  }
  if (params.ingredientsImageConfidence !== "high") {
    return { autoApprove: false, aiReviewNote: "Low confidence: ingredients image" };
  }

  const submitted = params.submittedProductName?.trim() ?? "";
  const extracted = params.extractedProductName?.trim() ?? "";
  if (!submitted || !extracted || !productNamesSimilarityMatch(submitted, extracted)) {
    return {
      autoApprove: false,
      aiReviewNote: `Name mismatch: submitted '${submitted || "(empty)"}' vs extracted '${extracted || "(empty)"}'`,
    };
  }

  const ingredients = params.ingredients?.trim() ?? "";
  if (ingredients.length < 20) {
    return { autoApprove: false, aiReviewNote: "Insufficient ingredients text" };
  }

  return {
    autoApprove: true,
    aiReviewNote: "Auto-approved: high confidence on all signals",
  };
}

const StartBody = z.object({
  barcode: z
    .string()
    .trim()
    .regex(/^[0-9]{6,14}$/, "A valid 6–14 digit barcode is required.")
    .refine(isValidGtin, "Streckkoden har felaktig kontrollsiffra — kontrollera siffrorna."),
  productName: z.string().trim().min(1, "Product name is required.").max(500),
  brand: z.string().trim().max(200).optional(),
});

const PhotosBody = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  frontImageBase64: z.string().optional(),
  ingredientsImageBase64: z.string().optional(),
  ingredientsText: z.string().trim().max(10000).optional(),
});

const ManualContributionBody = z.object({
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  barcode: z
    .string()
    .trim()
    .regex(/^[0-9]{8,14}$/)
    .refine(isValidGtin, "Streckkoden har felaktig kontrollsiffra.")
    .optional(),
  ingredients: z.string().trim().max(10000).optional(),
  productType: ProductTypeSchema.optional(),
  source_type: z.enum(["package", "manufacturer_site", "other"]).optional(),
  source_note: z.string().trim().max(500).optional(),
  // SS-074: base64-bilddata från frontendens ProductCapture
  imageDataUrl: z.string().max(5_000_000).optional(),
  // SS-079 (#3): permanent bild-URL (redan uppladdad) som ska följa med när en
  // sparad skanning auto-bidras till cached_products, så katalog-kortet får bild.
  imageUrl: z.string().url().max(2000).optional(),
  // SS-081 (#1): "komplettera en platshållarprodukt". The Ordinary search-only-
  // produkter ligger i cached_products med en CHIMIQ_-platshållar-barcode. När en
  // användare öppnar en sådan och fyller i riktig EAN + INCI/foto skickar appen
  // med den ursprungliga platshållar-koden här, så servern kan KOMPLETTERA den
  // befintliga raden på plats (byta barcode, lägga till INCI/bild) istället för
  // att skapa en dublett under den nya EAN:en.
  placeholderBarcode: z
    .string()
    .trim()
    .startsWith("CHIMIQ_", "placeholderBarcode måste vara en CHIMIQ_-platshållare.")
    .max(120)
    .optional(),
}).refine(
  (data) =>
    Boolean(data.ingredients?.trim() || data.barcode?.trim() || data.placeholderBarcode?.trim()),
  {
    message: "Ingredients or barcode is required.",
  },
);

const AdminReviewBody = z.object({
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  ingredients: z.string().trim().max(10000).optional(),
});

const AdminRejectBody = z.object({
  reason: z.string().trim().min(1, "Reason is required.").max(500),
});

async function extractFromFrontImage(
  imageBase64: string,
  anthropic: Anthropic,
): Promise<{ productName?: string; brand?: string; confidence: "high" | "low" }> {
  const result = await extractProductNameFromImage(imageBase64, "image/jpeg", anthropic);
  return {
    productName: result.productName ?? undefined,
    brand: result.brand ?? undefined,
    confidence: result.confidence,
  };
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
    const { data, error } = await supabaseAdmin.rpc("reward_contributor_idempotent", {
      submission_id: submissionId,
      user_id: userId,
    });
    if (error) throw error;

    const result = (data ?? {}) as {
      premiumUnlocked?: boolean;
      premiumUntil?: string | null;
      totalContributions?: number;
      alreadyGranted?: boolean;
    };

    if (result.alreadyGranted) {
      log("Reward already granted for submission, skipping", { submissionId });
    }

    const newCount = Number(result.totalContributions ?? 0);

    // Idempotently award count-based badges. Errors here must NOT block
    // the contribution reward path — badges are a nice-to-have layer.
    if (!result.alreadyGranted) {
      try {
        await evaluateContributionBadges(userId, newCount);
      } catch (err) {
        log("Badge evaluation failed (non-fatal)", { err });
      }
    }

    const premiumUntil = result.premiumUntil ? new Date(result.premiumUntil) : null;
    if (result.premiumUnlocked && premiumUntil) {
      log("Premium unlocked via contributions", { userId, count: newCount, premiumUntil });
      return { premiumUnlocked: true, premiumUntil, totalContributions: newCount };
    }

    return { premiumUnlocked: false, premiumUntil: null, totalContributions: newCount };
  } catch (err) {
    log("Failed to process contribution reward", { err });
    return { premiumUnlocked: false, premiumUntil: null, totalContributions: 0 };
  }
}

async function approveSubmission(submission: Submission, log: (msg: string, data?: unknown) => void): Promise<boolean> {
  const hasIngredients = submission.ingredients && submission.ingredients.trim().length > 5;
  if (!hasIngredients) return false;

  if (submission.barcode && submission.barcode !== "unknown") {
    const { error } = await supabaseAdmin
      .from("cached_products")
      .upsert(
        {
          barcode: submission.barcode,
          product_name: submission.productName ?? "Unknown product",
          brand: submission.brand ?? "",
          ingredients: submission.ingredients!,
          image_url: null,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "barcode" },
      );
    if (error) throw error;
  }

  log("Submission approved and cached", { submissionId: submission.id, barcode: submission.barcode });
  return true;
}

const router: IRouter = Router();

type SubmissionStatus = "pending" | "ai_reviewing" | "approved" | "needs_admin" | "rejected";

interface SubmissionRow {
  id: string;
  barcode: string;
  product_name: string | null;
  brand: string | null;
  ingredients: string | null;
  submitted_at: string;
  obf_contributed: string | null;
  submitted_by: string | null;
  status: SubmissionStatus;
  ai_review_note: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  front_image_url: string | null;
  ingredients_image_url: string | null;
  reward_granted: boolean;
}

interface Submission {
  id: string;
  barcode: string;
  productName: string | null;
  brand: string | null;
  ingredients: string | null;
  submittedAt: string;
  obfContributed: string | null;
  submittedBy: string | null;
  status: SubmissionStatus;
  aiReviewNote: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  frontImageUrl: string | null;
  ingredientsImageUrl: string | null;
  rewardGranted: boolean;
}

function mapSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    barcode: row.barcode,
    productName: row.product_name,
    brand: row.brand,
    ingredients: row.ingredients,
    submittedAt: row.submitted_at,
    obfContributed: row.obf_contributed,
    submittedBy: row.submitted_by,
    status: row.status,
    aiReviewNote: row.ai_review_note,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    frontImageUrl: row.front_image_url,
    ingredientsImageUrl: row.ingredients_image_url,
    rewardGranted: row.reward_granted,
  };
}

async function getSubmission(id: string): Promise<Submission | null> {
  const { data, error } = await supabaseAdmin
    .from("user_submitted_products")
    .select("*")
    .eq("id", id)
    .maybeSingle<SubmissionRow>();
  if (error) throw error;
  return data ? mapSubmission(data) : null;
}

async function getCachedProduct(
  barcode: string,
): Promise<{ barcode: string; productName: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("cached_products")
    .select("barcode,product_name")
    .eq("barcode", barcode)
    .maybeSingle<{ barcode: string; product_name: string | null }>();
  if (error) throw error;
  return data ? { barcode: data.barcode, productName: data.product_name } : null;
}

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
    const existingCached = await getCachedProduct(barcode);
    if (existingCached) {
      res.status(409).json({
        error: `This product (${existingCached.productName}) is already in our database — thank you! Only new products count toward your contribution milestone.`,
        alreadyInDatabase: true,
      });
      return;
    }
  }

  try {
    const { data: submission, error } = await supabaseAdmin
      .from("user_submitted_products")
      .insert({
        barcode: barcode ?? "unknown",
        product_name: safeName || null,
        brand: safeBrand || null,
        submitted_by: userId,
        status: "pending",
        obf_contributed: "pending",
        reward_granted: false,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;

    res.json({ submissionId: submission?.id });
  } catch (err) {
    req.log.error({ err }, "Failed to start contribution");
    res.status(500).json({ error: "Could not create submission. Please try again." });
  }
});

router.post("/contribute/manual", requireAuth, async (req, res) => {
  const parseResult = ManualContributionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid data.", issues: parseResult.error.issues });
    return;
  }

  const userId = (req as { user?: { id?: string } }).user?.id ?? null;
  const { barcode, productName, brand, ingredients, productType, imageDataUrl, imageUrl, placeholderBarcode } =
    parseResult.data;

  let safeName: string | null = null;
  let safeBrand: string | null = null;
  let safeIngredients: string | null = null;

  try {
    safeName = productName ? sanitizeProductName(productName, false) || null : null;
    safeBrand = brand ? sanitizeBrand(brand, true) || null : null;
    safeIngredients = ingredients ? sanitizeIngredients(ingredients, false) || null : null;
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  // SS-074: Ladda upp produktbild till Supabase Storage om den skickats med.
  // SS-081: även när användaren kompletterar en platshållare utan ny EAN ska
  // bilden kunna laddas upp (använd platshållar-koden som mapp).
  const imageOwnerBarcode = barcode ?? placeholderBarcode ?? null;
  let uploadedImageUrl: string | null = null;
  if (imageDataUrl && imageOwnerBarcode) {
    try {
      const base64 = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
      const buffer = Buffer.from(base64 ?? "", "base64");
      const filePath = `products/${imageOwnerBarcode}/front-${Date.now()}.jpg`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("chimiq-uploads")
        .upload(filePath, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from("chimiq-uploads")
          .getPublicUrl(filePath);
        uploadedImageUrl = publicUrlData.publicUrl;
      } else {
        req.log.warn({ err: uploadError }, "Image upload failed (non-fatal)");
      }
    } catch (err) {
      req.log.warn({ err }, "Image upload threw (non-fatal)");
    }
  }

  try {
    const effectiveBarcode = barcode ?? `CHIMIQ_${randomUUID()}`;
    const { data, error } = await supabaseAdmin
      .from("user_submitted_products")
      .insert({
        barcode: effectiveBarcode,
        product_name: safeName,
        brand: safeBrand,
        ingredients: safeIngredients,
        submitted_by: userId,
        status: "needs_admin",
        obf_contributed: "pending",
        reward_granted: false,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;

    // SS-081 (#1): KOMPLETTERA en platshållarprodukt på plats.
    // The Ordinary search-only-produkter ligger i cached_products med en
    // CHIMIQ_-barcode. När appen skickar `placeholderBarcode` ska vi uppdatera
    // EXISTERANDE rad — byta till riktig EAN om sådan finns, annars bara lägga
    // till INCI/bild — istället för att skapa en dublett under den nya EAN:en.
    let placeholderCompleted = false;
    if (placeholderBarcode && placeholderBarcode.startsWith("CHIMIQ_")) {
      const realBarcode = barcode && !barcode.startsWith("CHIMIQ_") ? barcode : null;

      const patch: Record<string, unknown> = { source: "user" };
      if (realBarcode) patch.barcode = realBarcode; // platshållare → scanbar produkt
      if (safeName) patch.product_name = safeName;
      if (safeBrand) patch.brand = safeBrand;
      if (productType) patch.product_type = productType;
      if (safeIngredients?.trim()) patch.ingredients = safeIngredients;
      if (uploadedImageUrl) patch.image_url = uploadedImageUrl;
      else if (imageUrl) patch.image_url = imageUrl;

      // Om en riktig EAN-rad redan finns (t.ex. via OBF) krockar barcode-bytet
      // med unique-constraint. Slå då ihop in i den befintliga riktiga raden och
      // ta bort platshållaren, annars uppdatera platshållarraden direkt.
      let collision = false;
      if (realBarcode) {
        const { data: existingReal } = await supabaseAdmin
          .from("cached_products")
          .select("barcode")
          .eq("barcode", realBarcode)
          .maybeSingle<{ barcode: string }>();
        collision = Boolean(existingReal);
      }

      if (realBarcode && collision) {
        // Riktig rad finns redan → uppdatera den och rensa platshållaren.
        const mergePatch = { ...patch };
        delete mergePatch.barcode;
        const { error: mergeErr } = await supabaseAdmin
          .from("cached_products")
          .update(mergePatch)
          .eq("barcode", realBarcode);
        if (mergeErr) req.log.warn({ err: mergeErr }, "Placeholder merge into real row failed (non-fatal)");
        const { error: delErr } = await supabaseAdmin
          .from("cached_products")
          .delete()
          .eq("barcode", placeholderBarcode);
        if (delErr) req.log.warn({ err: delErr }, "Placeholder cleanup delete failed (non-fatal)");
        else placeholderCompleted = true;
      } else {
        const { error: completeErr } = await supabaseAdmin
          .from("cached_products")
          .update(patch)
          .eq("barcode", placeholderBarcode);
        if (completeErr) {
          req.log.warn({ err: completeErr }, "Placeholder completion update failed (non-fatal)");
        } else {
          placeholderCompleted = true;
        }
      }

      // Invalidera ev. analyscache för den nya riktiga koden.
      if (placeholderCompleted && realBarcode && safeIngredients?.trim()) {
        await supabaseAdmin
          .from("analysis_cache")
          .delete()
          .eq("product_barcode", realBarcode)
          .eq("scan_type", "single");
      }
    }

    // SS-074: Uppdatera existing kort istället för att ignorera dubletter.
    // (Hoppas över om vi redan kompletterat en platshållare ovan.)
    if (!placeholderCompleted && barcode && !barcode.startsWith("CHIMIQ_")) {
      const patch: Record<string, unknown> = {
        barcode,
        product_name: safeName ?? "Unknown product",
        brand: safeBrand ?? "",
        source: "user",
        product_type: productType ?? "skincare",
      };
      if (safeIngredients?.trim()) patch.ingredients = safeIngredients;
      if (uploadedImageUrl) patch.image_url = uploadedImageUrl;
      else if (imageUrl) patch.image_url = imageUrl;

      const { error: cacheError } = await supabaseAdmin
        .from("cached_products")
        .upsert(patch, { onConflict: "barcode", ignoreDuplicates: false });
      if (cacheError) {
        req.log.warn({ err: cacheError }, "Auto-cache upsert failed (non-fatal)");
      } else if (safeIngredients?.trim()) {
        // SS-074: Försök invalidera single-analysecache för aktuellt barcode.
        // Om product_barcode inte finns loggar vi och går vidare.
        const { error: cacheDelErr } = await supabaseAdmin
          .from("analysis_cache")
          .delete()
          .eq("product_barcode", barcode)
          .eq("scan_type", "single");
        if (cacheDelErr) {
          req.log.info(
            { barcode, err: cacheDelErr },
            "analysis_cache invalidation skipped (column may not exist — non-fatal)",
          );
        } else {
          req.log.info({ barcode }, "analysis_cache invalidated after ingredient update");
        }
      }
    }

    notifyAdminsOfNewSubmission(
      {
        productName: safeName ?? "(okänt)",
        brand: safeBrand ?? "",
        barcode: effectiveBarcode,
      },
      req.log,
    );

    res.json({
      submissionId: data.id,
      status: "needs_admin",
      extractedIngredients: safeIngredients,
      imageUrl: uploadedImageUrl,
      message: "Thank you! Your submission is under review — we'll add it soon.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save manual contribution");
    res.status(500).json({ error: "Could not save your contribution." });
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

  const existing = await getSubmission(submissionId);

  if (!existing) {
    res.status(404).json({ error: "Submission not found." });
    return;
  }

  if (existing.submittedBy && userId !== existing.submittedBy) {
    res.status(403).json({ error: "You are not authorised to modify this submission." });
    return;
  }

  {
    const { error } = await supabaseAdmin
      .from("user_submitted_products")
      .update({ status: "ai_reviewing" })
      .eq("id", submissionId);
    if (error) throw error;
  }

  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.API_BASE_URL ?? process.env.VITE_API_URL ?? "";

  let extractedProductName: string | undefined;
  let extractedBrand: string | undefined;
  let extractedIngredients: string | undefined;
  let frontImageConfidence: "high" | "low" | undefined;
  let ingredientsImageConfidence: "high" | "low" | undefined;

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
      frontImageConfidence = frontResult.value.confidence;
    }
    if (ingredientsResult.status === "fulfilled" && ingredientsResult.value) {
      extractedIngredients = ingredientsResult.value.ingredients;
      ingredientsImageConfidence = ingredientsResult.value.confidence;
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

  let status: SubmissionStatus;
  let aiReviewNote: string | null;

  if (AUTO_APPROVE_ENABLED && isCompleteContribution) {
    const decision = evaluatePhotoAutoApproval({
      frontImageConfidence,
      ingredientsImageConfidence,
      submittedProductName: existing.productName,
      extractedProductName: safeExtractedProductName,
      ingredients: finalIngredients,
    });
    if (decision.autoApprove) {
      status = "approved";
      aiReviewNote = decision.aiReviewNote;
      req.log.info(`[AI auto-approve] ${existing.barcode} – ${finalProductName}`);
    } else {
      status = "needs_admin";
      aiReviewNote = decision.aiReviewNote;
    }
  } else {
    status = "needs_admin";
    aiReviewNote =
      frontImageConfidence === "low" || ingredientsImageConfidence === "low"
        ? "AI extraction had low confidence — please verify the extracted data."
        : null;
  }

  try {
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("user_submitted_products")
      .update({
        product_name: finalProductName ?? null,
        brand: finalBrand ?? null,
        ingredients: finalIngredients ?? null,
        submitted_by: userId ?? existing.submittedBy,
        status,
        ai_review_note: aiReviewNote,
        front_image_url: frontImageUrl ?? existing.frontImageUrl,
        ingredients_image_url: ingredientsImageUrl ?? existing.ingredientsImageUrl,
      })
      .eq("id", submissionId)
      .select("*")
      .maybeSingle<SubmissionRow>();
    if (updateError) throw updateError;
    const updated = updatedRow ? mapSubmission(updatedRow) : null;

    let premiumUnlocked = false;
    let premiumUntil: Date | null = null;

    if (status === "approved" && updated) {
      // Re-check newness BEFORE approveSubmission upserts the cache row. Closes the race
      // window between /contribute/start (where we first checked) and now: if the barcode
      // was added to cached_products by anyone in the meantime, this submission is no
      // longer a "new" product and must not count toward the milestone.
      let isStillNewProduct = true;
      if (existing.barcode && existing.barcode !== "unknown") {
        const preexisting = await getCachedProduct(existing.barcode);
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

    if (status === "needs_admin") {
      notifyAdminsOfNewSubmission(
        {
          productName: finalProductName ?? "(okänt)",
          brand: finalBrand ?? "",
          barcode: existing.barcode,
        },
        req.log,
      );
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
    const submission = await getSubmission(id);

    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    if (submission.submittedBy && userId !== submission.submittedBy) {
      res.status(403).json({ error: "Not authorised to view this submission." });
      return;
    }

    res.json({
      id: submission.id,
      status: submission.status,
      productName: submission.productName,
      brand: submission.brand,
      ingredients: submission.ingredients,
      aiReviewNote: submission.aiReviewNote,
      // Surface the admin's rejection reason so the submitter can see why
      // their product wasn't accepted (#72). Only populated for rejected
      // submissions; null otherwise.
      reviewNote: submission.reviewNote,
    });
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
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("accepted_contributions,premium_until")
      .eq("id", userId)
      .maybeSingle<{ accepted_contributions: number; premium_until: string | null }>();
    if (error) throw error;

    const premiumUntil = user?.premium_until ? new Date(user.premium_until) : null;
    const justUnlocked =
      premiumUntil !== null &&
      premiumUntil.getTime() - Date.now() > 24 * 60 * 60 * 1000 * 29;

    res.json({
      acceptedContributions: user?.accepted_contributions ?? 0,
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
  let query = supabaseAdmin
    .from("user_submitted_products")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(limit ?? 200);
  // "pending" is the user-facing label; the schema status is "needs_admin".
  if (!status || status === "pending") {
    query = query.eq("status", "needs_admin");
  } else if (status === "approved") {
    query = query.eq("status", "approved");
  } else if (status === "rejected") {
    query = query.eq("status", "rejected");
  }
  // status === "all" intentionally adds no status condition.

  if (q && q.length > 0) {
    const needle = `%${q.replace(/,/g, " ").replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    query = query.or(`barcode.ilike.${needle},product_name.ilike.${needle},brand.ilike.${needle}`);
  }

  try {
    const { data, error } = await query;
    if (error) throw error;
    res.json({ submissions: ((data ?? []) as SubmissionRow[]).map(mapSubmission) });
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
    const { data, error } = await supabaseAdmin
      .from("user_submitted_products")
      .select("id,barcode,product_name,brand,status,review_note,ai_review_note,submitted_at,reviewed_at")
      .eq("submitted_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    const submissions = ((data ?? []) as Array<
      Pick<
        SubmissionRow,
        | "id"
        | "barcode"
        | "product_name"
        | "brand"
        | "status"
        | "review_note"
        | "ai_review_note"
        | "submitted_at"
        | "reviewed_at"
      >
    >).map((row) => ({
      id: row.id,
      barcode: row.barcode,
      productName: row.product_name,
      brand: row.brand,
      status: row.status,
      reviewNote: row.review_note,
      aiReviewNote: row.ai_review_note,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
    }));
    res.json({ submissions });
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
    const existing = await getSubmission(id);

    if (!existing) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    const updateValues: Record<string, unknown> = {
        status: "approved",
      reviewed_at: new Date().toISOString(),
    };
    if (productName !== undefined) updateValues.product_name = productName;
    if (brand !== undefined) updateValues.brand = brand;
    if (ingredients !== undefined) updateValues.ingredients = ingredients;

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("user_submitted_products")
      .update(updateValues)
      .eq("id", id)
      .select("*")
      .maybeSingle<SubmissionRow>();
    if (updateError) throw updateError;
    const updated = updatedRow ? mapSubmission(updatedRow) : null;

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
        const dup = await getCachedProduct(updated.barcode);
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
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("user_submitted_products")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: parseResult.data.reason,
      })
      .eq("id", id)
      .eq("status", "needs_admin")
      .select("id");
    if (updateError) throw updateError;

    if ((updated?.length ?? 0) === 0) {
      const existing = await getSubmission(id);
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
