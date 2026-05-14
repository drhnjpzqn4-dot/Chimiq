import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  RECIPE_RISK_LEVELS,
  RECIPE_STATUSES,
  type RecipeIngredient,
} from "@workspace/db/schema";
import { isRequestAdmin } from "../lib/admin.js";
import { ipRateLimit } from "../lib/rateLimit.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import {
  scanRecipeSafety,
  RecipeSafetyUnavailableError,
} from "../lib/recipeSafety.js";

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

type RecipeStatus = (typeof RECIPE_STATUSES)[number];
type RecipeRiskLevel = (typeof RECIPE_RISK_LEVELS)[number];

type RecipeRow = {
  id: string;
  submitter_id: string;
  title: string;
  category: string;
  skin_types: string[];
  ingredients: RecipeIngredient[];
  method: string;
  photo_url: string | null;
  ai_verdict: unknown | null;
  risk_level: RecipeRiskLevel | null;
  status: RecipeStatus;
  admin_note: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRecipeRow(row: RecipeRow) {
  return {
    id: row.id,
    submitterId: row.submitter_id,
    title: row.title,
    category: row.category,
    skinTypes: row.skin_types,
    ingredients: row.ingredients,
    method: row.method,
    photoUrl: row.photo_url,
    aiVerdict: row.ai_verdict,
    riskLevel: row.risk_level,
    status: row.status,
    adminNote: row.admin_note,
    reviewedById: row.reviewed_by_id,
    reviewedAt: row.reviewed_at,
    reviewSeenAt: row.review_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecipeCardRow(row: Pick<
  RecipeRow,
  | "id"
  | "title"
  | "category"
  | "skin_types"
  | "ingredients"
  | "risk_level"
  | "photo_url"
  | "ai_verdict"
  | "created_at"
>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    skinTypes: row.skin_types,
    ingredients: row.ingredients,
    riskLevel: row.risk_level,
    photoUrl: row.photo_url,
    aiVerdict: row.ai_verdict,
    createdAt: row.created_at,
  };
}

function mapMineRow(row: Pick<
  RecipeRow,
  | "id"
  | "title"
  | "category"
  | "skin_types"
  | "ingredients"
  | "method"
  | "photo_url"
  | "ai_verdict"
  | "risk_level"
  | "status"
  | "admin_note"
  | "created_at"
  | "updated_at"
  | "reviewed_at"
>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    skinTypes: row.skin_types,
    ingredients: row.ingredients,
    method: row.method,
    photoUrl: row.photo_url,
    aiVerdict: row.ai_verdict,
    riskLevel: row.risk_level,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
  };
}

function mapNotificationRow(row: {
  id: string;
  title: string;
  status: RecipeStatus;
  admin_note: string | null;
  reviewed_at: string | null;
}) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    adminNote: row.admin_note,
    reviewedAt: row.reviewed_at,
  };
}

function isUnseenReview(row: { reviewed_at: string | null; review_seen_at: string | null }) {
  if (!row.reviewed_at) return false;
  if (!row.review_seen_at) return true;
  return new Date(row.review_seen_at).getTime() < new Date(row.reviewed_at).getTime();
}

async function countRowsSince24h(
  table: "recipes" | "recipe_edit_events",
  submitterId: string,
  sinceIso: string,
): Promise<number> {
  const supabase = supabaseAdmin;
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("submitter_id", submitterId)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

function sanitizeNeedle(value: string): string {
  return value.toLocaleLowerCase();
}

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
  const supabase = supabaseAdmin;

  let query = supabase
    .from("recipes")
    .select("id,title,category,skin_types,ingredients,risk_level,photo_url,ai_verdict,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit ?? 30);
  if (category) query = query.eq("category", category);
  if (riskLevel) query = query.eq("risk_level", riskLevel);
  if (skinType) {
    query = query.or(
      `skin_types.cs.${JSON.stringify([skinType])},skin_types.cs.${JSON.stringify(["all"])}`,
    );
  }

  try {
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<
      Pick<
        RecipeRow,
        | "id"
        | "title"
        | "category"
        | "skin_types"
        | "ingredients"
        | "risk_level"
        | "photo_url"
        | "ai_verdict"
        | "created_at"
      >
    >;
    res.json({ recipes: rows.map(mapRecipeCardRow) });
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
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select(
        "id,title,category,skin_types,ingredients,method,photo_url,ai_verdict,risk_level,status,admin_note,created_at,updated_at,reviewed_at",
      )
      .eq("submitter_id", req.user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const rows = (data ?? []) as Array<
      Pick<
        RecipeRow,
        | "id"
        | "title"
        | "category"
        | "skin_types"
        | "ingredients"
        | "method"
        | "photo_url"
        | "ai_verdict"
        | "risk_level"
        | "status"
        | "admin_note"
        | "created_at"
        | "updated_at"
        | "reviewed_at"
      >
    >;

    const { data: unseenRows, error: unseenError } = await supabase
      .from("recipes")
      .select("reviewed_at,review_seen_at")
      .eq("submitter_id", req.user.id)
      .not("reviewed_at", "is", null);
    if (unseenError) throw unseenError;
    const unseenCount = (unseenRows ?? []).filter((row) =>
      isUnseenReview(row as { reviewed_at: string | null; review_seen_at: string | null }),
    ).length;

    res.json({ recipes: rows.map(mapMineRow), unseenCount });
  } catch (err) {
    req.log.error({ err }, "GET /recipes/mine failed");
    res.status(500).json({ error: "Failed to load your recipes." });
  }
});

/**
 * GET /recipes/mine/unseen-count — lightweight count for the bottom tab
 * bar dot (#70). Polled from BottomTabBar without fetching the full list,
 * so it's cheap to call on every navigation.
 */
router.get("/recipes/mine/unseen-count", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ unseenCount: 0 });
    return;
  }
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("reviewed_at,review_seen_at")
      .eq("submitter_id", req.user.id)
      .not("reviewed_at", "is", null);
    if (error) throw error;
    const unseenCount = (data ?? []).filter((row) =>
      isUnseenReview(row as { reviewed_at: string | null; review_seen_at: string | null }),
    ).length;
    res.json({ unseenCount });
  } catch (err) {
    req.log.error({ err }, "GET /recipes/mine/unseen-count failed");
    res.status(500).json({ error: "Failed to load unseen count." });
  }
});

/**
 * GET /recipes/mine/notifications — list of unseen reviewed recipes for
 * the contributor notification banner (#70). Each entry carries the data
 * the UI needs to render the banner row (title, status, admin note) and
 * the deep-link target (RecipeDetail for approved, edit form otherwise).
 */
router.get("/recipes/mine/notifications", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ notifications: [] });
    return;
  }
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("id,title,status,admin_note,reviewed_at,review_seen_at")
      .eq("submitter_id", req.user.id)
      .not("reviewed_at", "is", null)
      .in("status", ["approved", "changes_requested"])
      .order("reviewed_at", { ascending: false });
    if (error) throw error;

    const notifications = (data ?? [])
      .filter((row) =>
        isUnseenReview(row as { reviewed_at: string | null; review_seen_at: string | null }),
      )
      .slice(0, 20)
      .map((row) =>
        mapNotificationRow(
          row as {
            id: string;
            title: string;
            status: RecipeStatus;
            admin_note: string | null;
            reviewed_at: string | null;
          },
        ),
      );
    res.json({ notifications });
  } catch (err) {
    req.log.error({ err }, "GET /recipes/mine/notifications failed");
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

/**
 * POST /recipes/mine/:id/seen — acknowledge ONE recipe's review
 * feedback (#70). Called when the user taps the notification banner
 * entry, opens RecipeDetail, or opens the edit form for that recipe.
 * Per-recipe ack means we never silently clear feedback for recipes
 * the user never looked at (e.g. older than the 8-row Profile preview).
 */
router.post("/recipes/mine/:id/seen", async (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .update({ review_seen_at: new Date().toISOString() })
      .eq("id", id)
      .eq("submitter_id", req.user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /recipes/mine/:id/seen failed");
    res.status(500).json({ error: "Failed to mark recipe as seen." });
  }
});

// Legacy endpoint kept as a no-op success for forward compatibility;
// callers have moved to per-recipe acks but we don't want stale clients
// to error. (#70)
router.post("/recipes/mine/seen", (req, res) => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sign in first." });
    return;
  }
  res.json({ ok: true, deprecated: true });
});

/**
 * Eligibility — gates "Submit a recipe" entry point.
 * (Auth required + IdP-verified email; see #46a.)
 *
 * Registered BEFORE `/recipes/:id` so the static path doesn't get matched
 * by the UUID detail route (which 400s on non-UUID values).
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
 * Public detail for a single approved recipe.
 */
router.get("/recipes/:id", publicReadLimit, async (req, res) => {
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid recipe ID." });
    return;
  }
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select(
        "id,title,category,skin_types,ingredients,method,photo_url,ai_verdict,risk_level,admin_note,created_at,updated_at",
      )
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    const row = data as Pick<
      RecipeRow,
      | "id"
      | "title"
      | "category"
      | "skin_types"
      | "ingredients"
      | "method"
      | "photo_url"
      | "ai_verdict"
      | "risk_level"
      | "admin_note"
      | "created_at"
      | "updated_at"
    >;
    res.json({
      recipe: {
        id: row.id,
        title: row.title,
        category: row.category,
        skinTypes: row.skin_types,
        ingredients: row.ingredients,
        method: row.method,
        photoUrl: row.photo_url,
        aiVerdict: row.ai_verdict,
        riskLevel: row.risk_level,
        adminNote: row.admin_note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    req.log.error({ err }, "public recipe detail failed");
    res.status(500).json({ error: "Failed to load recipe." });
  }
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

  const submitterId = req.user.id;
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const [preCreated, preEdits] = await Promise.all([
      countRowsSince24h("recipes", submitterId, sinceIso),
      countRowsSince24h("recipe_edit_events", submitterId, sinceIso),
    ]);
    if (preCreated + preEdits >= 5) {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
      });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "recipe pre-rate-limit check failed");
    res.status(500).json({ error: "Failed to save recipe. Please try again." });
    return;
  }

  let aiVerdict: Awaited<ReturnType<typeof scanRecipeSafety>> = null;
  let riskLevel: RecipeRiskLevel | null = null;
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

  const supabase = supabaseAdmin;
  try {
    const [createdToday, editsToday] = await Promise.all([
      countRowsSince24h("recipes", submitterId, sinceIso),
      countRowsSince24h("recipe_edit_events", submitterId, sinceIso),
    ]);
    if (createdToday + editsToday >= 5) {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        submitter_id: submitterId,
        title,
        category: parsed.data.category,
        skin_types: parsed.data.skinTypes,
        ingredients: cleanIngredients,
        method,
        photo_url: parsed.data.photoUrl ?? null,
        ai_verdict: aiVerdict ?? null,
        risk_level: riskLevel,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      recipe: mapRecipeRow(data as RecipeRow),
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

  const supabase = supabaseAdmin;
  const submitterId = req.user.id;
  const { data: existing, error: existingError } = await supabase
    .from("recipes")
    .select("submitter_id,status")
    .eq("id", id)
    .maybeSingle();
  if (existingError) {
    req.log.error({ err: existingError }, "recipe ownership check failed");
    res.status(500).json({ error: "Failed to save recipe. Please try again." });
    return;
  }
  if (!existing) {
    res.status(404).json({ error: "Recipe not found." });
    return;
  }
  if (existing.submitter_id !== submitterId) {
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

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const [preCreated, preEdits] = await Promise.all([
      countRowsSince24h("recipes", submitterId, sinceIso),
      countRowsSince24h("recipe_edit_events", submitterId, sinceIso),
    ]);
    if (preCreated + preEdits >= 5) {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
      });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "recipe edit pre-rate-limit check failed");
    res.status(500).json({ error: "Failed to save recipe. Please try again." });
    return;
  }

  let aiVerdict: Awaited<ReturnType<typeof scanRecipeSafety>> = null;
  let riskLevel: RecipeRiskLevel | null = null;
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

  try {
    const [createdToday, editsToday] = await Promise.all([
      countRowsSince24h("recipes", submitterId, sinceIso),
      countRowsSince24h("recipe_edit_events", submitterId, sinceIso),
    ]);
    if (createdToday + editsToday >= 5) {
      res.status(429).json({
        error:
          "You've reached today's submission limit (5 per day, edits included). Please try again tomorrow.",
      });
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("recipes")
      .update({
        title,
        category: parsed.data.category,
        skin_types: parsed.data.skinTypes,
        ingredients: cleanIngredients,
        method,
        photo_url: parsed.data.photoUrl ?? null,
        ai_verdict: aiVerdict ?? null,
        risk_level: riskLevel,
        status: "pending",
        admin_note: null,
      })
      .eq("id", id)
      .eq("submitter_id", submitterId)
      .in("status", ["pending", "changes_requested"])
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      res.status(409).json({
        error:
          "This recipe can no longer be edited (it has been approved or rejected).",
      });
      return;
    }

    const { error: eventError } = await supabase.from("recipe_edit_events").insert({
      submitter_id: submitterId,
      recipe_id: id,
      action: "edit",
    });
    if (eventError) throw eventError;

    res.json({ recipe: mapRecipeRow(updated as RecipeRow), aiVerdict, scannerUnavailable });
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
  const supabase = supabaseAdmin;

  let query = supabase.from("recipes").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  else if (!status) query = query.eq("status", "pending");
  if (category) query = query.eq("category", category);
  if (riskLevel) query = query.eq("risk_level", riskLevel);
  if (!q) query = query.limit(limit ?? 200);

  try {
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as RecipeRow[];
    const needle = q ? sanitizeNeedle(q) : null;
    const filtered = needle
      ? rows.filter((row) => {
          const inTitle = row.title.toLocaleLowerCase().includes(needle);
          if (inTitle) return true;
          return (row.ingredients ?? []).some((ing) =>
            (ing?.name ?? "").toLocaleLowerCase().includes(needle),
          );
        })
      : rows;
    res.json({ recipes: filtered.slice(0, limit ?? 200).map(mapRecipeRow) });
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

  const update: Record<string, unknown> = {};
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
  if (parsed.data.skinTypes !== undefined) update.skin_types = parsed.data.skinTypes;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .update(update)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    res.json({ recipe: mapRecipeRow(data as RecipeRow) });
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
  const supabase = supabaseAdmin;
  let updated: { id: string; submitter_id: string; title: string }[];
  try {
    const { data, error } = await supabase
      .from("recipes")
      .update({
        status,
        admin_note: note,
        reviewed_by_id: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_seen_at: null,
      })
      .in("id", parsed.data.ids)
      .select("id,submitter_id,title");
    if (error) throw error;
    updated = (data ?? []) as { id: string; submitter_id: string; title: string }[];
  } catch (err) {
    req.log.error({ err }, "admin recipe bulk action failed");
    res.status(500).json({ error: "Failed to apply bulk action." });
    return;
  }

  if (updated.length) {
    try {
      const submitterIds = Array.from(new Set(updated.map((u) => u.submitter_id)));
      const { data: submitters, error: submitterError } = await supabase
        .from("users")
        .select("id,email")
        .in("id", submitterIds);
      if (submitterError) throw submitterError;
      const emailById = new Map((submitters ?? []).map((s) => [s.id as string, s.email ?? null]));
      for (const row of updated) {
        req.log.info(
          {
            event: "recipe.notify",
            recipeId: row.id,
            submitterId: row.submitter_id,
            submitterEmail: emailById.get(row.submitter_id) ?? null,
            status,
          },
          `recipe ${row.id} ${status} (bulk) — would send transactional email`,
        );
      }
    } catch (notifyErr) {
      req.log.warn({ err: notifyErr }, "bulk recipe notify log failed (non-fatal)");
    }
  }
  res.json({ updated: updated.length, ids: updated.map((u) => u.id) });
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
  const supabase = supabaseAdmin;
  try {
    const { data, error } = await supabase
      .from("recipes")
      .update({
        status,
        admin_note: note,
        reviewed_by_id: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_seen_at: null,
      })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Recipe not found." });
      return;
    }
    const updated = data as RecipeRow;
    res.json({ recipe: mapRecipeRow(updated) });

    void (async () => {
      try {
        const { data: submitter, error: submitterError } = await supabase
          .from("users")
          .select("email")
          .eq("id", updated.submitter_id)
          .maybeSingle();
        if (submitterError) throw submitterError;
        req.log.info(
          {
            event: "recipe.notify",
            recipeId: updated.id,
            submitterId: updated.submitter_id,
            submitterEmail: submitter?.email ?? null,
            status,
          },
          `recipe ${updated.id} ${status} — would send transactional email`,
        );
      } catch (notifyErr) {
        req.log.warn({ err: notifyErr }, "recipe notify log failed (non-fatal)");
      }
    })();
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
