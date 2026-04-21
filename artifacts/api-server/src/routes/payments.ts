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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/?upgraded=true`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { userId: user.id, plan },
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
