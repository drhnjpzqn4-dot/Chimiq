import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { isRequestAdmin } from "../lib/admin.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const router: IRouter = Router();

/**
 * Derive the human-readable status that the admin Users dashboard shows in
 * the "Trial / Plan" column. Stripe's subscription status is the source of
 * truth when present; otherwise we fall back to the user's plan column
 * (which also covers earned-premium time from contributions via
 * getUserPlan). Pure function so it's trivially testable.
 */
type PlanBucket = "trial" | "premium" | "free" | "past_due" | "canceled";

interface AdminUserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  premium_until: string | null;
  stripe_subscription_id: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

function deriveBucket(row: {
  plan: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  premiumUntil: Date | null;
}): PlanBucket {
  const now = Date.now();
  if (row.subscriptionStatus === "trialing") {
    // Stripe says trialing but the trial end has already passed → treat as
    // premium (the webhook for the next status flip just hasn't arrived).
    if (row.trialEndsAt && row.trialEndsAt.getTime() <= now) return "premium";
    return "trial";
  }
  if (row.subscriptionStatus === "active") return "premium";
  if (row.subscriptionStatus === "past_due" || row.subscriptionStatus === "unpaid") {
    return "past_due";
  }
  if (
    row.subscriptionStatus === "canceled" ||
    row.subscriptionStatus === "incomplete_expired"
  ) {
    return "canceled";
  }
  // No Stripe state yet — fall back to the plan column (covers earned
  // premium from contributions).
  if (row.plan === "premium") return "premium";
  if (row.premiumUntil && row.premiumUntil.getTime() > now) return "premium";
  return "free";
}

const ListQuery = z.object({
  q: z.string().trim().max(200).optional(),
  sort: z.enum(["createdAt", "email", "plan"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

router.get("/admin/users", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter values." });
    return;
  }
  const {
    q,
    sort = "createdAt",
    dir = "desc",
    page = 1,
    pageSize = 50,
  } = parsed.data;

  const escaped = q ? q.replace(/[\\%_]/g, (m) => `\\${m}`) : null;
  const sortCol = sort === "email" ? "email" : sort === "plan" ? "plan" : "created_at";
  const offset = (page - 1) * pageSize;

  // Run page query + total count + headline aggregates in parallel.
  let pageQuery = supabaseAdmin
    .from("users")
    .select(
      "id,email,first_name,last_name,plan,subscription_status,trial_ends_at,premium_until,stripe_subscription_id,email_verified,created_at,updated_at",
    )
    .order(sortCol, { ascending: dir === "asc" })
    .range(offset, offset + pageSize - 1);
  let countQuery = supabaseAdmin
    .from("users")
    .select("id", { head: true, count: "exact" });
  if (escaped) {
    const pattern = `%${escaped}%`;
    pageQuery = pageQuery.ilike("email", pattern);
    countQuery = countQuery.ilike("email", pattern);
  }

  const [rowsResult, countResult, aggregateResult] = await Promise.all([
    pageQuery,
    countQuery,
    supabaseAdmin
      .from("users")
      .select("plan,subscription_status,trial_ends_at,premium_until"),
  ]);
  if (rowsResult.error) throw rowsResult.error;
  if (countResult.error) throw countResult.error;
  if (aggregateResult.error) throw aggregateResult.error;

  const totals = { total: 0, free: 0, premium: 0, trial: 0, past_due: 0, canceled: 0 };
  for (const row of (aggregateResult.data ?? []) as Array<Pick<AdminUserRow, "plan" | "subscription_status" | "trial_ends_at" | "premium_until">>) {
    const bucket = deriveBucket({
      plan: row.plan,
      subscriptionStatus: row.subscription_status,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
      premiumUntil: row.premium_until ? new Date(row.premium_until) : null,
    });
    totals.total += 1;
    totals[bucket] += 1;
  }

  const users = ((rowsResult.data ?? []) as AdminUserRow[]).map((r) => {
    const trialEndsAt = r.trial_ends_at ? new Date(r.trial_ends_at) : null;
    const premiumUntil = r.premium_until ? new Date(r.premium_until) : null;
    const bucket = deriveBucket({
      plan: r.plan,
      subscriptionStatus: r.subscription_status,
      trialEndsAt,
      premiumUntil,
    });
    const trialDaysLeft =
      bucket === "trial" && trialEndsAt
        ? Math.max(
            0,
            Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          )
        : null;
    return {
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      plan: r.plan,
      bucket,
      subscriptionStatus: r.subscription_status,
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      trialDaysLeft,
      premiumUntil: premiumUntil ? premiumUntil.toISOString() : null,
      stripeSubscriptionId: r.stripe_subscription_id,
      hasSubscription: !!r.stripe_subscription_id,
      emailVerified: r.email_verified,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  });

  res.json({ users, total: Number(countResult.count ?? 0), page, pageSize, totals });
});

export default router;
