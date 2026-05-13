import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { and, asc, count, desc, ilike, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { isRequestAdmin } from "../lib/admin.js";

const router: IRouter = Router();

/**
 * Derive the human-readable status that the admin Users dashboard shows in
 * the "Trial / Plan" column. Stripe's subscription status is the source of
 * truth when present; otherwise we fall back to the user's plan column
 * (which also covers earned-premium time from contributions via
 * getUserPlan). Pure function so it's trivially testable.
 */
type PlanBucket = "trial" | "premium" | "free" | "past_due" | "canceled";

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

  // Email search uses ILIKE with escaped wildcards so user-supplied "%" or
  // "_" can't widen the query.
  const escaped = q ? q.replace(/[\\%_]/g, (m) => `\\${m}`) : null;
  const where = escaped ? ilike(usersTable.email, `%${escaped}%`) : undefined;

  const sortCol =
    sort === "email"
      ? usersTable.email
      : sort === "plan"
        ? usersTable.plan
        : usersTable.createdAt;
  const order = dir === "asc" ? asc(sortCol) : desc(sortCol);

  const offset = (page - 1) * pageSize;

  // Run page query + total count + headline aggregates in parallel.
  const [rows, [{ total }], aggregateRows] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        plan: usersTable.plan,
        subscriptionStatus: usersTable.subscriptionStatus,
        trialEndsAt: usersTable.trialEndsAt,
        premiumUntil: usersTable.premiumUntil,
        stripeSubscriptionId: usersTable.stripeSubscriptionId,
        emailVerified: usersTable.emailVerified,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(where ?? sql`true`)
      .orderBy(order)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(usersTable)
      .where(where ?? sql`true`),
    // Headline counts ignore the search filter — Pia wants a true picture
    // of the whole base, not "matches in current view".
    db
      .select({
        plan: usersTable.plan,
        subscriptionStatus: usersTable.subscriptionStatus,
        trialEndsAt: usersTable.trialEndsAt,
        premiumUntil: usersTable.premiumUntil,
        c: count(),
      })
      .from(usersTable)
      .groupBy(
        usersTable.plan,
        usersTable.subscriptionStatus,
        usersTable.trialEndsAt,
        usersTable.premiumUntil,
      ),
  ]);

  const totals = { total: 0, free: 0, premium: 0, trial: 0, past_due: 0, canceled: 0 };
  for (const row of aggregateRows) {
    const bucket = deriveBucket({
      plan: row.plan,
      subscriptionStatus: row.subscriptionStatus,
      trialEndsAt: row.trialEndsAt,
      premiumUntil: row.premiumUntil,
    });
    const n = Number(row.c);
    totals.total += n;
    totals[bucket] += n;
  }

  const users = rows.map((r) => {
    const bucket = deriveBucket({
      plan: r.plan,
      subscriptionStatus: r.subscriptionStatus,
      trialEndsAt: r.trialEndsAt,
      premiumUntil: r.premiumUntil,
    });
    const trialDaysLeft =
      bucket === "trial" && r.trialEndsAt
        ? Math.max(
            0,
            Math.ceil((r.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          )
        : null;
    return {
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      plan: r.plan,
      bucket,
      subscriptionStatus: r.subscriptionStatus,
      trialEndsAt: r.trialEndsAt ? r.trialEndsAt.toISOString() : null,
      trialDaysLeft,
      premiumUntil: r.premiumUntil ? r.premiumUntil.toISOString() : null,
      stripeSubscriptionId: r.stripeSubscriptionId,
      hasSubscription: !!r.stripeSubscriptionId,
      emailVerified: r.emailVerified,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  res.json({ users, total: Number(total), page, pageSize, totals });
});

export default router;
