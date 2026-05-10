import type { Logger } from "pino";
import { eq, or } from "drizzle-orm";
import { db, usersTable, paymentTestChargesTable, subscriptionEventsTable } from "@workspace/db";

// ---------------------------------------------------------------------------
// Minimal local interfaces — duck-typed to match the Stripe shapes we use.
// Avoids any dependency on Stripe's exported type namespace (which breaks
// under TypeScript 5.9 with `import type`).
// ---------------------------------------------------------------------------
interface StripeEvent {
  type: string;
  id: string;
  data: { object: Record<string, unknown> };
}

interface StripeCheckoutSession {
  metadata?: Record<string, string | undefined>;
  subscription?: string | { id: string } | null;
  customer?: string | { id: string } | null;
}

interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  trial_end?: number | null;
}

interface StripeCharge {
  id: string;
  customer?: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string | undefined>;
  amount?: number;
  amount_refunded?: number;
}

/**
 * Apply a (already-verified) Stripe webhook event to our internal user state.
 *
 * The Stripe sync library verifies the signature and mirrors raw Stripe
 * objects into Postgres. This layer maps the lifecycle events we care about
 * onto our `users.plan` / `users.stripeSubscriptionId` columns so the rest of
 * the app (paywall, shelf limit, badges, etc.) reflects the user's true
 * billing state.
 *
 * Important: we never clear `users.premiumUntil` here — that field is owned
 * by the gamification flow (contribution rewards) and is independent of the
 * paid subscription. `getUserPlan` already grants premium when EITHER
 * `plan === "premium"` OR `premiumUntil > now`, so a downgrade here just
 * removes the paid grant and leaves any earned-premium time intact.
 */
export async function applyStripeEventToUser(
  event: StripeEvent,
  log: Logger,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as unknown as StripeCheckoutSession;
      const userId = session.metadata?.userId;
      if (!userId) {
        log.warn(
          { eventId: event.id },
          "checkout.session.completed had no userId metadata — cannot upgrade",
        );
        return;
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null);
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null);

      await db
        .update(usersTable)
        .set({
          plan: "premium",
          ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        })
        .where(eq(usersTable.id, userId));

      if (subscriptionId && customerId) {
        try {
          await db.insert(subscriptionEventsTable).values({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            eventType: "checkout.session.completed",
          });
        } catch (err) {
          log.warn({ err, userId }, "Failed to record subscription event from checkout");
        }
      }

      log.info(
        { userId, subscriptionId, customerId },
        "Upgraded user to premium after successful checkout",
      );
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as StripeSubscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // active or trialing => keep / grant premium; anything else => downgrade
      const isActive = sub.status === "active" || sub.status === "trialing";
      // Always mirror Stripe's status + trial end onto the user row so the
      // admin Users dashboard can show "trial / paid / past_due / etc"
      // without a per-row Stripe API call.
      const trialEndsAt =
        typeof sub.trial_end === "number" ? new Date(sub.trial_end * 1000) : null;
      await db
        .update(usersTable)
        .set(
          isActive
            ? {
                plan: "premium",
                stripeSubscriptionId: sub.id,
                subscriptionStatus: sub.status,
                trialEndsAt,
              }
            : {
                plan: "free",
                stripeSubscriptionId: null,
                subscriptionStatus: sub.status,
                trialEndsAt,
              },
        )
        .where(eq(usersTable.stripeCustomerId, customerId));

      if (isActive) {
        const [user] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeCustomerId, customerId));
        if (user) {
          try {
            await db.insert(subscriptionEventsTable).values({
              userId: user.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              status: sub.status,
              eventType: event.type,
            });
          } catch (err) {
            log.warn({ err, customerId }, "Failed to record subscription event");
          }
        }
      }

      log.info(
        { customerId, subscriptionId: sub.id, status: sub.status, isActive },
        "Synced subscription status to user.plan",
      );
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as unknown as StripeSubscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await db
        .update(usersTable)
        .set({
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionStatus: sub.status,
        })
        .where(eq(usersTable.stripeCustomerId, customerId));
      log.info(
        { customerId, subscriptionId: sub.id },
        "Subscription deleted — downgraded user to free",
      );
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as unknown as StripeCharge;
      const customerId =
        typeof charge.customer === "string"
          ? charge.customer
          : (charge.customer?.id ?? null);
      if (!customerId) return;

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent?.id ?? null);
      const matchClauses = [];
      if (paymentIntentId) {
        matchClauses.push(
          eq(paymentTestChargesTable.paymentIntentId, paymentIntentId),
        );
      }
      if (charge.id) {
        matchClauses.push(eq(paymentTestChargesTable.chargeId, charge.id));
      }
      let auditMatched = false;
      if (matchClauses.length > 0) {
        const matchExpr =
          matchClauses.length === 1 ? matchClauses[0] : or(...matchClauses);
        const updated = await db
          .update(paymentTestChargesTable)
          .set({
            webhookReceivedAt: new Date(),
            webhookEventId: event.id,
            ...(charge.id ? { chargeId: charge.id } : {}),
          })
          .where(matchExpr!)
          .returning({
            paymentIntentId: paymentTestChargesTable.paymentIntentId,
          });
        auditMatched = updated.length > 0;
      }
      if (auditMatched || charge.metadata?.purpose === "go_live_test_charge") {
        log.info(
          {
            customerId,
            chargeId: charge.id,
            paymentIntentId,
            auditMatched,
            metadataMatched: charge.metadata?.purpose === "go_live_test_charge",
          },
          "Ignoring go-live test charge refund — leaving user.plan unchanged",
        );
        return;
      }
      const fullyRefunded =
        typeof charge.amount === "number" &&
        typeof charge.amount_refunded === "number" &&
        charge.amount_refunded >= charge.amount;
      if (!fullyRefunded) {
        log.info(
          {
            customerId,
            chargeId: charge.id,
            amount: charge.amount,
            refunded: charge.amount_refunded,
          },
          "Partial refund — leaving user.plan unchanged",
        );
        return;
      }
      await db
        .update(usersTable)
        .set({
          plan: "free",
          stripeSubscriptionId: null,
          subscriptionStatus: "canceled",
        })
        .where(eq(usersTable.stripeCustomerId, customerId));
      log.info(
        { customerId, chargeId: charge.id },
        "Charge fully refunded — downgraded user to free",
      );
      return;
    }

    default:
      return;
  }
}
