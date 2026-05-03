import type Stripe from "stripe";
import type { Logger } from "pino";
import { eq, or } from "drizzle-orm";
import { db, usersTable, paymentTestChargesTable } from "@workspace/db";

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
  event: Stripe.Event,
  log: Logger,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
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
      log.info(
        { userId, subscriptionId, customerId },
        "Upgraded user to premium after successful checkout",
      );
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // active or trialing => keep / grant premium; anything else => downgrade
      const isActive = sub.status === "active" || sub.status === "trialing";
      await db
        .update(usersTable)
        .set(
          isActive
            ? { plan: "premium", stripeSubscriptionId: sub.id }
            : { plan: "free", stripeSubscriptionId: null },
        )
        .where(eq(usersTable.stripeCustomerId, customerId));
      log.info(
        { customerId, subscriptionId: sub.id, status: sub.status, isActive },
        "Synced subscription status to user.plan",
      );
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await db
        .update(usersTable)
        .set({ plan: "free", stripeSubscriptionId: null })
        .where(eq(usersTable.stripeCustomerId, customerId));
      log.info(
        { customerId, subscriptionId: sub.id },
        "Subscription deleted — downgraded user to free",
      );
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const customerId =
        typeof charge.customer === "string"
          ? charge.customer
          : (charge.customer?.id ?? null);
      if (!customerId) return;

      // Skip the operator's go-live verification charges (#107). The admin
      // "Test live charge" button inserts a payment_test_charges audit row
      // BEFORE issuing the refund, so any matching charge.refunded event is
      // a verification ping — not a real cancellation. We mark the audit
      // row as "delivered" so the UI can confirm true end-to-end webhook
      // delivery, then early-return without touching user.plan.
      //
      // We also accept charge.metadata.purpose as a belt-and-suspenders
      // fallback in case the audit insert raced the webhook.
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
            metadataMatched:
              charge.metadata?.purpose === "go_live_test_charge",
          },
          "Ignoring go-live test charge refund — leaving user.plan unchanged",
        );
        return;
      }
      // Only downgrade on full refunds. Partial refunds may be promo credits
      // or partial-period adjustments and shouldn't kick a paying user off.
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
        .set({ plan: "free", stripeSubscriptionId: null })
        .where(eq(usersTable.stripeCustomerId, customerId));
      log.info(
        { customerId, chargeId: charge.id },
        "Charge fully refunded — downgraded user to free",
      );
      return;
    }

    default:
      // Other event types (invoice.*, payment_intent.*, etc.) are mirrored by
      // stripe-replit-sync but do not require user-state changes here.
      return;
  }
}
