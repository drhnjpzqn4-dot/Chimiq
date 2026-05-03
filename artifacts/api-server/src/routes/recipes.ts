import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  recipesTable,
  recipeEditEventsTable,
  usersTable,
  RECIPE_RISK_LEVELS,
  RECIPE_STATUSES,
  type RecipeIngredient,
} from "@workspace/db";
import { isRequestAdmin } from "../lib/admin";
import { ipRateLimit } from "../lib/rateLimit";
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

const ListQuerySchema = z.object({
  category: z.enum(RECIPE_CATEGORIES).optional(),
  skinType: z.enum(SKIN_TYPES).optional(),
  riskLevel: z.enum(RECIPE_RISK_LEVELS).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
});

// Public read endpoints — rate-limited per-IP to blunt scraping & DB abuse.
const publicReadLimit = ipRateLimit({
  windowMs: 60_000,
  max: 60,
  key: "recipes-public",
});

/**
 * Public list of approved recipes. Filters: category, skinType, riskLevel.
 * Returns trimmed cards (no method body) for the browse grid.
 */
router.get("/recipes", publicReadLimit, async (req, res) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }
  const { category, skinType, riskLevel, limit } = parsed.data;
  const conds = [eq(recipesTable.status, "approved")];
  if (category) conds.push(eq(recipesTable.category, category));
  if (riskLevel) conds.push(eq(recipesTable.riskLevel, riskLevel));
  if (skinType) {
    // skinTypes is a jsonb array; match if it contains the requested type
    // OR contains "all".
    conds.push(
      sql`(${recipesTable.skinTypes} @> ${JSON.stringify([skinType])}::jsonb
        OR ${recipesTable.skinTypes} @> '["all"]'::jsonb)`,
    );
  }
  try {
    const rows = await db
      .select({
        id: recipesTable.id,
        title: recipesTable.title,
        category: recipesTable.category,
        skinTypes: recipesTable.skinTypes,
        ingredients: recipesTable.ingredients,
        riskLevel: recipesTable.riskLevel,
        photoUrl: recipesTable.photoUrl,
        aiVerdict: recipesTable.aiVerdict,
        createdAt: recipesTable.createdAt,
      })
      .from(recipesTable)
      .where(and(...conds))
      .orderBy(desc(recipesTable.createdAt))
      .limit(limit ?? 30);
    res.json({ recipes: rows });
  } catch (err) {
    req.log.error({ err }, "public recipes list failed");
    res.status(500).json({ error: "Failed to load recipes." });
  }
});

/**
 * GET /recipes/mine — list the signed-in user's own recipes (#69).
 *
 * Returns every status (pending / approved / changes_requested / rejected)
 * so the submitter can see admin feedback and resubmit edits. Defined
 * BEFORE `/recipes/:id` so `mine` does not get caught by the UUID matcher.
 */
router.get("/recipes/mine", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to view your recipes." });
    return;
  }
  try {
    const rows = await db
      .select({
        id: recipesTable.id,
        title: recipesTable.title,
        category: recipesTable.category,
        skinTypes: recipesTable.skinTypes,
        ingredients: recipesTable.ingredients,
        method: recipesTable.method,
        photoUrl: recipesTable.photoUrl,
        aiVerdict: recipesTable.aiVerdict,
        riskLevel: recipesTable.riskLevel,
        status: recipesTable.status,
        adminNote: recipesTable.adminNote,
        createdAt: recipesTable.createdAt,
        updatedAt: recipesTable.updatedAt,
        reviewedAt: recipesTable.reviewedAt,
      })
      .from(recipesTable)
      .where(eq(recipesTable.submitterId, req.user.id))
      .orderBy(desc(recipesTable.updatedAt))
      .limit(50);
    // Unseen review count powers the notification dot on Profile (#70).
    // A recipe is "unseen" when it's been reviewed by an admin AFTER the
    // user last opened the My-recipes section. First-ever load (when
    // recipesSeenAt is null) treats every reviewed row as unseen.
    // We count separately from `rows` because rows is capped at 50, and
    // a user with >50 recipes could otherwise miss feedback on an older one.
    const userRows = await db
      .select({ recipesSeenAt: usersTable.recipesSeenAt })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id))
      .limit(1);
    const seenAt = userRows[0]?.recipesSeenAt ?? null;
    const unseenCountRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(recipesTable)
      .where(
        and(
          eq(recipesTable.submitterId, req.user.id),
          sql`${recipesTable.reviewedAt} IS NOT NULL`,
          seenAt
            ? sql`${recipesTable.reviewedAt} > ${seenAt.toISOString()}`
            : sql`TRUE`,
        ),
      );
    const unseenCount = unseenCountRows[0]?.c ?? 0;
    res.json({ recipes: rows, unseenCount });
  } catch (err) {
    req.log.error({ err }, "GET /recipes/mine failed");
    res.status(500).json({ error: "Failed to load your recipes." });
  }
});

// Mark all current review feedback on the user's recipes as "seen". Called
// when the Profile -> Your DIY recipes section becomes visible. (#70)
router.post("/recipes/mine/seen", async (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  try {
    await db
      .update(usersTable)
      .set({ recipesSeenAt: new Date() })
      .where(eq(usersTable.id, req.user.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /recipes/mine/seen failed");
    res.status(500).json({ error: "Failed to mark recipes as seen." });
  }
});

/**
 * Public detail for a single approved recipe.
 */
router.get("/recipes/:id", publicReadLimit, async (req, res) => {
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }
  try {
    const [row] = await db
      .select({
        id: recipesTable.id,
        title: recipesTable.title,
        category: recipesTable.category,
        skinTypes: recipesTable.skinTypes,
        ingredients: recipesTable.ingredients,
        method: recipesTable.method,
        photoUrl: recipesTable.photoUrl,
        aiVerdict: recipesTable.aiVerdict,
        riskLevel: recipesTable.riskLevel,
        adminNote: recipesTable.adminNote,
        createdAt: recipesTable.createdAt,
        updatedAt: recipesTable.updatedAt,
      })
      .from(recipesTable)
      .where(and(eq(recipesTable.id, id), eq(recipesTable.status, "approved")));
    if (!row) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json({ recipe: row });
  } catch (err) {
    req.log.error({ err }, "public recipe detail failed");
    res.status(500).json({ error: "Failed to load recipe." });
  }
});

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
 * PUT /recipes/:id — submitter edits + resubmits a pending or
 * changes_requested recipe (#69).
 *
 * Re-runs the AI safety scan, replaces the verdict, and resets status to
 * 'pending' so the recipe re-enters the admin queue. An edit counts toward
 * the daily 5-action rate limit (created today + edited-today recipes), so
 * this endpoint can't be used to amplify LLM costs.
 */
router.put("/recipes/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to edit a recipe." });
    return;
  }
  if (req.user.emailVerified !== true) {
    res.status(403).json({
      error: "Please verify your email with your sign-in provider before editing recipes.",
    });
    return;
  }
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }

  const parsed = SubmitRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Recipe data is invalid or incomplete." });
    return;
  }

  // Ownership + editable-status check before doing any work.
  const submitterId = req.user.id;
  const [existing] = await db
    .select({
      submitterId: recipesTable.submitterId,
      status: recipesTable.status,
    })
    .from(recipesTable)
    .where(eq(recipesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Recipe not found." });
    return;
  }
  if (existing.submitterId !== submitterId) {
    res.status(403).json({ error: "You can only edit your own recipes." });
    return;
  }
  if (existing.status !== "pending" && existing.status !== "changes_requested") {
    res.status(409).json({
      error:
        "This recipe can no longer be edited (it has been approved or rejected).",
    });
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

  // Pre-flight rate-limit check (cheap path before LLM scan). The
  // authoritative count happens inside the transaction below; this is just
  // a fast-fail to avoid burning Anthropic tokens for users already at
  // their daily cap.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count: preCreated }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recipesTable)
    .where(
      and(
        eq(recipesTable.submitterId, submitterId),
        gte(recipesTable.createdAt, since),
      ),
    );
  const [{ count: preEdits }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recipeEditEventsTable)
    .where(
      and(
        eq(recipeEditEventsTable.submitterId, submitterId),
        gte(recipeEditEventsTable.createdAt, since),
      ),
    );
  if (preCreated + preEdits >= 5) {
    res.status(429).json({
      error:
        "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
    });
    return;
  }

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
      req.log.warn("recipe-safety scanner unavailable on edit; storing without verdict");
    } else {
      req.log.error({ err }, "recipe-safety scan failed on edit");
    }
  }

  // Authoritative atomic step: lock the user, recount under the lock,
  // insert an edit-event row, and update the recipe — all in one
  // transaction. Concurrent PUTs serialize on the advisory lock, so two
  // requests near the boundary cannot both pass.
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${submitterId}))`,
      );
      const [{ count: createdToday }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(recipesTable)
        .where(
          and(
            eq(recipesTable.submitterId, submitterId),
            gte(recipesTable.createdAt, since),
          ),
        );
      const [{ count: editsToday }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(recipeEditEventsTable)
        .where(
          and(
            eq(recipeEditEventsTable.submitterId, submitterId),
            gte(recipeEditEventsTable.createdAt, since),
          ),
        );
      if (createdToday + editsToday >= 5) {
        return { kind: "limit" as const };
      }
      // Re-assert editable status inside the transaction. Without this,
      // an admin who flips the recipe to approved/rejected between our
      // pre-check (above) and this UPDATE could be overwritten back to
      // pending by the submitter (TOCTOU on moderation state).
      const [updated] = await tx
        .update(recipesTable)
        .set({
          title,
          category: parsed.data.category,
          skinTypes: parsed.data.skinTypes,
          ingredients: cleanIngredients,
          method,
          photoUrl: parsed.data.photoUrl ?? null,
          aiVerdict: aiVerdict ?? null,
          riskLevel,
          status: "pending",
          // Clear the prior admin note so the resubmitted recipe shows
          // clean in the queue; admins write a new note if they request
          // more changes. `reviewedAt` is preserved so the audit history
          // stays intact across resubmissions.
          adminNote: null,
        })
        .where(
          and(
            eq(recipesTable.id, id),
            eq(recipesTable.submitterId, submitterId),
            inArray(recipesTable.status, ["pending", "changes_requested"]),
          ),
        )
        .returning();
      if (!updated) {
        // Either the row vanished or its status moved to approved/rejected
        // between the pre-check and the transactional update.
        return { kind: "conflict" as const };
      }
      await tx.insert(recipeEditEventsTable).values({
        submitterId,
        recipeId: id,
        action: "edit",
      });
      return { kind: "ok" as const, updated };
    });
    if (result.kind === "limit") {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
      });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({
        error:
          "This recipe can no longer be edited (it has been approved or rejected).",
      });
      return;
    }
    res.json({ recipe: result.updated, aiVerdict, scannerUnavailable });
  } catch (err) {
    req.log.error({ err }, "recipe edit update failed");
    res.status(500).json({ error: "Failed to save recipe. Please try again." });
  }
});

const AdminListQuery = z.object({
  status: z.enum([...RECIPE_STATUSES, "all"]).optional(),
  category: z.enum(RECIPE_CATEGORIES).optional(),
  riskLevel: z.enum(RECIPE_RISK_LEVELS).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

/**
 * GET /admin/recipes — list recipes for moderation.
 *
 * Query params:
 *  - status     pending|approved|changes_requested|rejected|all (default: pending)
 *  - category   filter by recipe category
 *  - riskLevel  filter by AI safety verdict
 *  - q          case-insensitive substring match on title or ingredient name
 *  - limit      1-200 (default 200)
 */
router.get("/admin/recipes", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const parsed = AdminListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }
  const { status, category, riskLevel, q, limit } = parsed.data;
  const conds = [];
  if (status && status !== "all") conds.push(eq(recipesTable.status, status));
  else if (!status) conds.push(eq(recipesTable.status, "pending"));
  if (category) conds.push(eq(recipesTable.category, category));
  if (riskLevel) conds.push(eq(recipesTable.riskLevel, riskLevel));
  if (q) {
    const needle = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conds.push(
      or(
        ilike(recipesTable.title, needle),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${recipesTable.ingredients}) AS ing
          WHERE ing->>'name' ILIKE ${needle}
        )`,
      )!,
    );
  }
  try {
    const rows = await db
      .select()
      .from(recipesTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(recipesTable.createdAt))
      .limit(limit ?? 200);
    res.json({ recipes: rows });
  } catch (err) {
    req.log.error({ err }, "admin recipes list failed");
    res.status(500).json({ error: "Failed to load recipes." });
  }
});

/**
 * PATCH /admin/recipes/:id — edit recipe fields before approving.
 * Allows the admin to fix typos, normalize ingredient names, or trim a method
 * without bouncing the submission back to the user.
 */
const AdminEditBody = z.object({
  title: z.string().min(3).max(120).optional(),
  category: z.enum(RECIPE_CATEGORIES).optional(),
  skinTypes: z.array(z.enum(SKIN_TYPES)).min(1).max(SKIN_TYPES.length).optional(),
  ingredients: z.array(RecipeIngredientInput).min(2).max(40).optional(),
  method: z.string().min(10).max(4000).optional(),
});

router.patch("/admin/recipes/:id", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }
  const parsed = AdminEditBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid edit data." });
    return;
  }

  const update: Partial<typeof recipesTable.$inferInsert> = {};
  try {
    if (parsed.data.title !== undefined) {
      update.title = sanitizeText(parsed.data.title, {
        fieldName: "Recipe title",
        maxLength: 120,
        minLength: 3,
      });
    }
    if (parsed.data.method !== undefined) {
      update.method = sanitizeText(parsed.data.method, {
        fieldName: "Method",
        maxLength: 4000,
        minLength: 10,
      });
    }
    if (parsed.data.ingredients !== undefined) {
      update.ingredients = parsed.data.ingredients.map((ing) => ({
        name: sanitizeText(ing.name, { fieldName: "Ingredient name", maxLength: 120 }),
        amount: ing.amount
          ? sanitizeText(ing.amount, { fieldName: "Amount", maxLength: 60, allowEmpty: true })
          : undefined,
        notes: ing.notes
          ? sanitizeText(ing.notes, { fieldName: "Notes", maxLength: 200, allowEmpty: true })
          : undefined,
      }));
    }
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.skinTypes !== undefined) update.skinTypes = parsed.data.skinTypes;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  try {
    const [updated] = await db
      .update(recipesTable)
      .set(update)
      .where(eq(recipesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json({ recipe: updated });
  } catch (err) {
    req.log.error({ err }, "admin recipe edit failed");
    res.status(500).json({ error: "Failed to update recipe." });
  }
});

/**
 * POST /admin/recipes/bulk — apply the same action to many recipes at once.
 * Body: { ids: string[], action: "approve"|"reject"|"request-changes", note?: string }
 */
const AdminBulkBody = z.object({
  ids: z.array(z.string().regex(UUID_RE)).min(1).max(100),
  action: z.enum(["approve", "reject", "request-changes"]),
  note: z.string().max(1000).optional(),
});

router.post("/admin/recipes/bulk", async (req, res) => {
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  const parsed = AdminBulkBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid bulk action data." });
    return;
  }
  const status: "approved" | "rejected" | "changes_requested" =
    parsed.data.action === "approve"
      ? "approved"
      : parsed.data.action === "reject"
        ? "rejected"
        : "changes_requested";

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
    const updated = await db
      .update(recipesTable)
      .set({
        status,
        adminNote: note,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      })
      .where(inArray(recipesTable.id, parsed.data.ids))
      .returning({ id: recipesTable.id });
    res.json({ updated: updated.length, ids: updated.map((u) => u.id) });
  } catch (err) {
    req.log.error({ err }, "admin recipe bulk action failed");
    res.status(500).json({ error: "Failed to apply bulk action." });
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
  const id = String(req.params.id ?? "");
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
