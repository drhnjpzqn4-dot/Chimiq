import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  recipesTable,
  RECIPE_RISK_LEVELS,
  type RecipeIngredient,
} from "@workspace/db";
import { isRequestAdmin } from "../lib/admin";
import { sanitizeText, SanitizationError } from "../lib/sanitize";
import {
  scanRecipeSafety,
  RecipeSafetyUnavailableError,
} from "../lib/recipeSafety";

const router: IRouter = Router();

const RECIPE_CATEGORIES = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "mask",
  "exfoliant",
  "oil",
  "balm",
  "mist",
  "scrub",
  "other",
] as const;

const SKIN_TYPES = ["dry", "oily", "combination", "sensitive", "normal", "all"] as const;

const RecipeIngredientInput = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().max(60).optional(),
  notes: z.string().max(200).optional(),
});

const SubmitRecipeBody = z.object({
  title: z.string().min(3).max(120),
  category: z.enum(RECIPE_CATEGORIES),
  skinTypes: z.array(z.enum(SKIN_TYPES)).min(1).max(SKIN_TYPES.length),
  ingredients: z.array(RecipeIngredientInput).min(2).max(40),
  method: z.string().min(10).max(4000),
  photoUrl: z.string().max(500).optional(),
});

const AdminReviewBody = z.object({
  note: z.string().max(1000).optional(),
});

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Eligibility — gates "Submit a recipe" entry point.
 * (Auth required + IdP-verified email; see #46a.)
 */
router.get("/recipes/eligibility", (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ canSubmit: false, reason: "auth_required", emailVerified: false });
    return;
  }
  const emailVerified = req.user.emailVerified === true;
  res.json({
    canSubmit: emailVerified,
    reason: emailVerified ? null : "email_unverified",
    emailVerified,
  });
});

/**
 * Submit a DIY recipe. Runs an AI safety scan synchronously, then persists
 * with status='pending' for admin review. Soft daily rate limit (5/day) to
 * blunt accidental spam — admin can still moderate the rest.
 */
router.post("/recipes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to submit a recipe." });
    return;
  }
  if (req.user.emailVerified !== true) {
    res.status(403).json({
      error: "Please verify your email with your sign-in provider before submitting recipes.",
    });
    return;
  }

  const parsed = SubmitRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Recipe data is invalid or incomplete." });
    return;
  }

  let title: string;
  let method: string;
  let cleanIngredients: RecipeIngredient[];
  try {
    title = sanitizeText(parsed.data.title, {
      fieldName: "Recipe title",
      maxLength: 120,
      minLength: 3,
    });
    method = sanitizeText(parsed.data.method, {
      fieldName: "Method",
      maxLength: 4000,
      minLength: 10,
    });
    cleanIngredients = parsed.data.ingredients.map((ing) => ({
      name: sanitizeText(ing.name, { fieldName: "Ingredient name", maxLength: 120 }),
      amount: ing.amount
        ? sanitizeText(ing.amount, { fieldName: "Amount", maxLength: 60, allowEmpty: true })
        : undefined,
      notes: ing.notes
        ? sanitizeText(ing.notes, { fieldName: "Notes", maxLength: 200, allowEmpty: true })
        : undefined,
    }));
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  // Cheap pre-check: short-circuit obviously-over-limit users BEFORE we spend
  // money on a model call. This is racy — the in-transaction advisory-lock
  // check below is the source of truth for correctness — but it stops simple
  // cost-amplification abuse without holding a long lock.
  const submitterId = req.user.id;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pre] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.submitterId, submitterId),
        gte(recipesTable.createdAt, since),
      ),
    );
  if (pre.count >= 5) {
    res.status(429).json({
      error:
        "You've reached today's submission limit (5 per day). Please try again tomorrow.",
    });
    return;
  }

  // AI safety scan (synchronous so users see the verdict before final submit).
  // Run this BEFORE entering the rate-limit transaction so a slow model call
  // does not hold a lock for ~10s.
  let aiVerdict: Awaited<ReturnType<typeof scanRecipeSafety>> = null;
  let riskLevel: (typeof RECIPE_RISK_LEVELS)[number] | null = null;
  let scannerUnavailable = false;
  try {
    aiVerdict = await scanRecipeSafety({
      title,
      category: parsed.data.category,
      ingredients: cleanIngredients,
      method,
      log: (msg, data) => req.log.info(data ?? {}, msg),
    });
    if (aiVerdict) riskLevel = aiVerdict.riskLevel;
  } catch (err) {
    if (err instanceof RecipeSafetyUnavailableError) {
      scannerUnavailable = true;
      req.log.warn("recipe-safety scanner unavailable; storing without verdict");
    } else {
      req.log.error({ err }, "recipe-safety scan failed");
    }
  }

  // Daily rate limit: 5 submissions / user / 24h. We hold a per-user advisory
  // lock for the duration of the transaction so concurrent requests serialize
  // and cannot bypass the count.
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${submitterId}))`);
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(recipesTable)
        .where(
          and(
            eq(recipesTable.submitterId, submitterId),
            gte(recipesTable.createdAt, since),
          ),
        );
      if (count >= 5) {
        return { rateLimited: true as const };
      }
      const [created] = await tx
        .insert(recipesTable)
        .values({
          submitterId,
          title,
          category: parsed.data.category,
          skinTypes: parsed.data.skinTypes,
          ingredients: cleanIngredients,
          method,
          photoUrl: parsed.data.photoUrl ?? null,
          aiVerdict: aiVerdict ?? null,
          riskLevel,
          status: "pending",
        })
        .returning();
      return { rateLimited: false as const, recipe: created };
    });

    if (result.rateLimited) {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day). Please try again tomorrow.",
      });
      return;
    }

    res.status(201).json({
      recipe: result.recipe,
      aiVerdict,
      scannerUnavailable,
    });
  } catch (err) {
    req.log.error({ err }, "recipe submit insert failed");
    res.status(500).json({ error: "Failed to save recipe. Please try again." });
  }
});

/**
 * GET /admin/recipes — list pending recipes (admin only).
 */
router.get("/admin/recipes", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.status, "pending"))
      .orderBy(desc(recipesTable.createdAt));
    res.json({ recipes: rows });
  } catch (err) {
    req.log.error({ err }, "admin recipes list failed");
    res.status(500).json({ error: "Failed to load recipes." });
  }
});

async function adminUpdateStatus(
  req: Parameters<Parameters<typeof router.post>[1]>[0],
  res: Parameters<Parameters<typeof router.post>[1]>[1],
  status: "approved" | "changes_requested" | "rejected",
) {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const { id } = req.params;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }
  const parsed = AdminReviewBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid review data." });
    return;
  }
  let note: string | null = null;
  if (parsed.data.note) {
    try {
      note = sanitizeText(parsed.data.note, {
        fieldName: "Admin note",
        maxLength: 1000,
        allowEmpty: true,
      });
    } catch (err) {
      if (err instanceof SanitizationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }

  const reviewerId = req.user?.id ?? null;
  try {
    const [updated] = await db
      .update(recipesTable)
      .set({
        status,
        adminNote: note,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(recipesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json({ recipe: updated });
  } catch (err) {
    req.log.error({ err }, `admin recipe ${status} failed`);
    res.status(500).json({ error: "Failed to update recipe." });
  }
}

router.post("/admin/recipes/:id/approve", (req, res) => adminUpdateStatus(req, res, "approved"));
router.post("/admin/recipes/:id/request-changes", (req, res) =>
  adminUpdateStatus(req, res, "changes_requested"),
);
router.post("/admin/recipes/:id/reject", (req, res) => adminUpdateStatus(req, res, "rejected"));

export default router;
