import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, getUserPlan } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

router.get("/payments/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const plan = await getUserPlan(req.user.id);
  res.json({ plan });
});

/**
 * A user is eligible for the 14-day free trial only if they've never had a
 * Stripe subscription before — checked by listing subscriptions on their
 * Stripe customer (any status). If the user has no Stripe customer yet,
 * they're trivially eligible. This prevents trial abuse via cancel-and-
 * re-checkout cycles. Earned-premium time (premiumUntil from
 * contributions) is ignored — that's a separate reward path.
 */
async function isTrialEligible(
  customerId: string | null | undefined,
  stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>,
): Promise<boolean> {
  if (!customerId) return true;
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  return subs.data.length === 0;
}

const TRIAL_DAYS = 14;

router.get("/payments/trial-eligible", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const [user] = await db
      .select({ stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const eligible = await isTrialEligible(user.stripeCustomerId, stripe);
    res.json({ eligible, trialDays: TRIAL_DAYS });
  } catch (err) {
    req.log.error({ err }, "trial-eligible check failed");
    // Fail open to "not eligible" so we never wrongly promise a free trial.
    res.json({ eligible: false, trialDays: TRIAL_DAYS });
  }
});

router.post("/payments/checkout", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawPlan = (req.body?.plan ?? "monthly") as unknown;
  const plan: "monthly" | "yearly" =
    rawPlan === "yearly" ? "yearly" : "monthly";

  try {
    const stripe = await getUncachableStripeClient();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let customerId = user.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db
        .update(usersTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(usersTable.id, user.id));
    }

    const envKey =
      plan === "yearly"
        ? "STRIPE_PREMIUM_PRICE_ID_YEARLY"
        : "STRIPE_PREMIUM_PRICE_ID_MONTHLY";
    const priceId = process.env[envKey];
    if (!priceId) {
      res
        .status(500)
        .json({ error: `Payment not configured — ${envKey} missing` });
      return;
    }

    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : (forwardedProto ?? req.protocol);
    const host = req.headers.host ?? "";
    const baseUrl = `${protocol}://${host}`;

    // Re-check trial eligibility server-side — never trust the client to
    // tell us "I'm eligible for the trial". (#trial)
    const eligible = await isTrialEligible(customerId, stripe);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/?upgraded=true`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { userId: user.id, plan },
      ...(eligible
        ? {
            subscription_data: {
              trial_period_days: TRIAL_DAYS,
              // If the trial ends and the saved card fails, cancel rather
              // than push the user into past_due — keeps the "no charge
              // unless you stay" promise honest.
              trial_settings: {
                end_behavior: { missing_payment_method: "cancel" },
              },
            },
          }
        : {}),
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Checkout session creation failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/payments/portal", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.stripeCustomerId) {
      res
        .status(400)
        .json({ error: "No subscription on file — upgrade first to manage billing." });
      return;
    }

    const stripe = await getUncachableStripeClient();

    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : (forwardedProto ?? req.protocol);
    const host = req.headers.host ?? "";
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/app/profile`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Billing portal session creation failed");
    res.status(500).json({ error: "Failed to open billing portal" });
  }
});

export default router;
