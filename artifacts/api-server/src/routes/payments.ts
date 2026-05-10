import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  getUserPlan,
  paymentTestChargesTable,
  checkoutEventsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { isRequestAdmin } from "../lib/admin";

const router: IRouter = Router();

router.get("/payments/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const plan = await getUserPlan(req.user.id);
  // Surface trial eligibility on the same call the UI already makes for
  // `plan`, so every paywall/upsell can branch copy without an extra
  // round-trip per render. Anonymous visitors default to eligible on the
  // client; this endpoint is the authoritative answer for signed-in users.
  let trialEligible = false;
  try {
    const [user] = await db
      .select({ stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));
    if (user) {
      // Premium users are not "eligible" for a trial offer in the UI sense —
      // they already have access. Skip the Stripe call and report false.
      if (plan === "premium") {
        trialEligible = false;
      } else {
        const stripe = await getUncachableStripeClient();
        trialEligible = await isTrialEligible(user.stripeCustomerId, stripe);
      }
    }
  } catch (err) {
    req.log.error({ err }, "trial-eligible check failed in /payments/status");
    // Fail closed — never wrongly promise a free trial.
    trialEligible = false;
  }
  res.json({ plan, trialEligible, trialDays: TRIAL_DAYS });
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
      // Allow customers to enter a Stripe promotion code (e.g. TESTER6M) on
      // the hosted checkout page. Stripe applies the discount before payment
      // and shows it in the order summary. For trial-eligible users, Stripe
      // handles both trial_period_days and a promo code together: the trial
      // runs first, then the promo discount applies on the first paid cycle.
      allow_promotion_codes: true,
      success_url: `${baseUrl}/?upgraded=true`,
      cancel_url: `${baseUrl}/pricing?checkout_cancelled=true`,
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

    try {
      await db.insert(checkoutEventsTable).values({
        userId: user.id,
        planType: plan,
        source: "checkout",
      });
    } catch (insertErr) {
      req.log.warn({ err: insertErr }, "Failed to record checkout event");
    }

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

/**
 * POST /payments/admin/test-charge — admin-only one-tap go-live verification.
 *
 * Creates a 1 SEK off-session PaymentIntent against the admin's own saved
 * card, immediately refunds it, and returns the resulting IDs plus the
 * webhook endpoint status so the operator can verify that:
 *   1. The connected Stripe account accepts a real charge.
 *   2. A webhook endpoint is registered and enabled for `charge.refunded`
 *      (the path that downgrades subscribers — see LAUNCH_CHECKLIST §6.4).
 *
 * Restrictions:
 *   - Caller must be authenticated AND in ADMIN_EMAILS.
 *   - Refuses if Stripe is in test mode unless the request body contains
 *     `confirmTestMode: true` — prevents accidentally pointing the button
 *     at a useless test-mode account during go-live verification.
 *   - Requires the admin to already have a saved Stripe customer + card
 *     (i.e. they've subscribed at least once). Returns a 400 with a clear
 *     message otherwise so the operator knows what to do.
 */
router.post(
  "/payments/admin/test-charge",
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!isRequestAdmin(req as { user?: { email?: string | null } })) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const confirmTestMode =
      (req.body && (req.body as { confirmTestMode?: unknown }).confirmTestMode) ===
      true;

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
        res.status(400).json({
          error:
            "No Stripe customer on file — subscribe once with a real card before using the test charge button.",
        });
        return;
      }

      const stripe = await getUncachableStripeClient();

      // Pull the customer to learn (a) live vs. test mode and (b) the
      // default payment method we should bill.
      const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      });

      if (customer.deleted) {
        res
          .status(400)
          .json({ error: "Stripe customer was deleted — re-subscribe first." });
        return;
      }

      const livemode = customer.livemode === true;
      if (!livemode && !confirmTestMode) {
        res.status(400).json({
          error:
            "Stripe is in test mode. Re-send with confirmTestMode=true to charge the test account anyway.",
          livemode: false,
          requiresConfirmation: true,
        });
        return;
      }

      // Prefer the customer's default PM (the one Stripe would auto-bill
      // on subscription renewal); fall back to the first card on file.
      let paymentMethodId: string | null = null;
      const defaultPm = customer.invoice_settings?.default_payment_method;
      if (defaultPm) {
        paymentMethodId =
          typeof defaultPm === "string" ? defaultPm : defaultPm.id;
      }
      if (!paymentMethodId) {
        const list = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: "card",
          limit: 1,
        });
        paymentMethodId = list.data[0]?.id ?? null;
      }
      if (!paymentMethodId) {
        res.status(400).json({
          error:
            "No saved card on file — open Manage billing and add a card first.",
        });
        return;
      }

      // 1 SEK = 100 öre. off_session=true + confirm=true means Stripe
      // attempts the charge synchronously without 3DS prompts; if the
      // saved card requires authentication the call throws and we surface
      // the error message verbatim.
      const intent = await stripe.paymentIntents.create({
        amount: 100,
        currency: "sek",
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: "Chimiq go-live verification (auto-refunded)",
        metadata: {
          purpose: "go_live_test_charge",
          adminEmail: user.email ?? "",
          userId: user.id,
        },
      });

      const chargeId =
        typeof intent.latest_charge === "string"
          ? intent.latest_charge
          : intent.latest_charge?.id ?? null;

      // From here on, we have a successful 1 SEK charge on the operator's
      // card. ANY failure before `refunds.create` settles must trigger a
      // compensating refund or we'd silently leave a real charge sitting
      // there — defeating the "charge + immediate refund" promise (#107).
      let refund: Awaited<ReturnType<typeof stripe.refunds.create>> | null = null;
      try {
        // CRITICAL: insert the audit row BEFORE issuing the refund. The
        // resulting `charge.refunded` webhook handler matches against this
        // row to know "this is a verification ping, do not downgrade", so
        // the row must exist before the webhook can fire.
        await db
          .insert(paymentTestChargesTable)
          .values({
            paymentIntentId: intent.id,
            userId: user.id,
            stripeCustomerId: user.stripeCustomerId,
            chargeId,
            livemode: livemode ? "live" : "test",
          })
          .onConflictDoNothing({
            target: paymentTestChargesTable.paymentIntentId,
          });

        // Belt-and-suspenders: also stamp the Charge itself with the same
        // metadata so the webhook guard still works if the audit insert
        // somehow failed silently or the row was rolled back.
        if (chargeId) {
          try {
            await stripe.charges.update(chargeId, {
              metadata: {
                purpose: "go_live_test_charge",
                paymentIntent: intent.id,
              },
            });
          } catch (err) {
            req.log.warn(
              { err, chargeId },
              "Could not stamp test-charge metadata on Charge",
            );
          }
        }

        // Refund immediately. We refund the PaymentIntent (Stripe figures
        // out the underlying charge) so this works even if `latest_charge`
        // hasn't propagated yet.
        refund = await stripe.refunds.create({
          payment_intent: intent.id,
          metadata: { purpose: "go_live_test_charge" },
        });
      } catch (innerErr) {
        // Compensating refund: at least one path between PI confirmation
        // and refund creation failed. Try to refund anyway so the operator
        // isn't out 1 SEK. If even the compensating refund fails we
        // surface the original error and ask the operator to refund
        // manually in the Stripe Dashboard.
        req.log.error(
          { err: innerErr, paymentIntentId: intent.id, chargeId },
          "Test charge post-confirm step failed — attempting compensating refund",
        );
        try {
          const compRefund = await stripe.refunds.create({
            payment_intent: intent.id,
            metadata: {
              purpose: "go_live_test_charge",
              compensating: "true",
            },
          });
          req.log.info(
            { paymentIntentId: intent.id, refundId: compRefund.id },
            "Compensating refund succeeded after test-charge failure",
          );
          refund = compRefund;
        } catch (refundErr) {
          req.log.error(
            { err: refundErr, paymentIntentId: intent.id, chargeId },
            "Compensating refund FAILED — manual refund required",
          );
          const m = (innerErr as { message?: string }).message ?? "Unknown";
          res.status(500).json({
            error: `Test charge created but refund failed: ${m}. Manually refund ${chargeId ?? intent.id} in the Stripe Dashboard.`,
            paymentIntentId: intent.id,
            chargeId,
            refundFailed: true,
          });
          return;
        }
      }

      await db
        .update(paymentTestChargesTable)
        .set({ refundId: refund.id })
        .where(eq(paymentTestChargesTable.paymentIntentId, intent.id));

      // Endpoint configuration health: list endpoints in the same livemode
      // and report whether at least one is enabled and listening for
      // charge.refunded. This is a *configuration* check — not delivery.
      let webhookEndpoints: Array<{
        url: string;
        status: string;
        listensForChargeRefunded: boolean;
      }> = [];
      let chargeRefundedListenerCount = 0;
      try {
        const endpoints = await stripe.webhookEndpoints.list({ limit: 30 });
        webhookEndpoints = endpoints.data
          .filter((e) => e.livemode === livemode)
          .map((e) => {
            const enabledEvents = e.enabled_events ?? [];
            const listens =
              enabledEvents.includes("*") ||
              enabledEvents.includes("charge.refunded");
            if (listens && e.status === "enabled") {
              chargeRefundedListenerCount += 1;
            }
            return {
              url: e.url,
              status: e.status,
              listensForChargeRefunded: listens,
            };
          });
      } catch (err) {
        req.log.warn({ err }, "Could not list Stripe webhook endpoints");
      }

      // Poll the audit row for end-to-end webhook delivery. The handler
      // sets webhookReceivedAt when the matching charge.refunded event
      // arrives. We give it up to ~10s; if it hasn't landed by then we
      // surface that to the operator instead of falsely reporting OK.
      const POLL_DEADLINE_MS = Date.now() + 10_000;
      let webhookReceivedAt: string | null = null;
      let webhookEventId: string | null = null;
      while (Date.now() < POLL_DEADLINE_MS) {
        const [row] = await db
          .select({
            webhookReceivedAt: paymentTestChargesTable.webhookReceivedAt,
            webhookEventId: paymentTestChargesTable.webhookEventId,
          })
          .from(paymentTestChargesTable)
          .where(eq(paymentTestChargesTable.paymentIntentId, intent.id));
        if (row?.webhookReceivedAt) {
          webhookReceivedAt = row.webhookReceivedAt.toISOString();
          webhookEventId = row.webhookEventId ?? null;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      res.json({
        ok: true,
        livemode,
        amount: intent.amount,
        currency: intent.currency,
        paymentIntentId: intent.id,
        chargeId,
        refundId: refund.id,
        refundStatus: refund.status,
        paymentMethodId,
        webhook: {
          endpoints: webhookEndpoints,
          chargeRefundedListenerCount,
          configuredOk: chargeRefundedListenerCount > 0,
          // True end-to-end delivery: did the webhook actually land?
          delivered: webhookReceivedAt !== null,
          deliveredAt: webhookReceivedAt,
          eventId: webhookEventId,
        },
      });
    } catch (err) {
      const stripeErr = err as { message?: string; code?: string; type?: string };
      req.log.error({ err }, "Admin test charge failed");
      res.status(500).json({
        error: stripeErr.message ?? "Test charge failed",
        code: stripeErr.code,
        type: stripeErr.type,
      });
    }
  },
);

export default router;
