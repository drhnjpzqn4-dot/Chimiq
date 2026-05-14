import type { Logger } from "pino";
import { supabaseAdmin } from "./lib/supabase-admin.js";

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
 * onto our `users.plan` / `users.stripe_subscription_id` columns so the rest of
 * the app (paywall, shelf limit, badges, etc.) reflects the user's true
 * billing state.
 *
 * Important: we never clear `users.premium_until` here — that field is owned
 * by the gamification flow (contribution rewards) and is independent of the
 * paid subscription. `getUserPlan` already grants premium when EITHER
 * `plan === "premium"` OR `premium_until > now`, so a downgrade here just
 * removes the paid grant and leaves any earned-premium time intact.
 */
export async function applyStripeEventToUser(
  event: StripeEvent,
  log: Logger,
): Promise<void> {
  const supabase = supabaseAdmin;

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

      const patch: Record<string, unknown> = { plan: "premium" };
      if (subscriptionId) patch.stripe_subscription_id = subscriptionId;
      if (customerId) patch.stripe_customer_id = customerId;

      const { error: upErr } = await supabase.from("users").update(patch).eq("id", userId);
      if (upErr) {
        log.warn({ err: upErr, userId }, "Failed to update user after checkout");
        return;
      }

      if (subscriptionId && customerId) {
        const { error: evErr } = await supabase.from("subscription_events").insert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
          event_type: "checkout.session.completed",
        });
        if (evErr) {
          log.warn({ err: evErr, userId }, "Failed to record subscription event from checkout");
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
      const isActive = sub.status === "active" || sub.status === "trialing";
      const trialEndsAt =
        typeof sub.trial_end === "number" ? new Date(sub.trial_end * 1000).toISOString() : null;

      const patch = isActive
        ? {
            plan: "premium",
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            trial_ends_at: trialEndsAt,
          }
        : {
            plan: "free",
            stripe_subscription_id: null,
            subscription_status: sub.status,
            trial_ends_at: trialEndsAt,
          };

      const { error: upErr } = await supabase
        .from("users")
        .update(patch)
        .eq("stripe_customer_id", customerId);
      if (upErr) {
        log.warn({ err: upErr, customerId }, "Failed to sync subscription to user");
        return;
      }

      if (isActive) {
        const { data: user, error: selErr } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!selErr && user?.id) {
          const { error: evErr } = await supabase.from("subscription_events").insert({
            user_id: user.id as string,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            event_type: event.type,
          });
          if (evErr) {
            log.warn({ err: evErr, customerId }, "Failed to record subscription event");
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
      const { error } = await supabase
        .from("users")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          subscription_status: sub.status,
        })
        .eq("stripe_customer_id", customerId);
      if (error) {
        log.warn({ err: error, customerId }, "Failed to downgrade user on subscription delete");
        return;
      }
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

      let auditMatched = false;
      const orParts: string[] = [];
      if (paymentIntentId) {
        orParts.push(`payment_intent_id.eq.${paymentIntentId}`);
      }
      if (charge.id) {
        orParts.push(`charge_id.eq.${charge.id}`);
      }
      if (orParts.length > 0) {
        const { data: updatedRows, error: audErr } = await supabase
          .from("payment_test_charges")
          .update({
            webhook_received_at: new Date().toISOString(),
            webhook_event_id: event.id,
            ...(charge.id ? { charge_id: charge.id } : {}),
          })
          .or(orParts.join(","))
          .select("payment_intent_id");
        if (!audErr && updatedRows && updatedRows.length > 0) {
          auditMatched = true;
        }
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
      const { error: downErr } = await supabase
        .from("users")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          subscription_status: "canceled",
        })
        .eq("stripe_customer_id", customerId);
      if (downErr) {
        log.warn({ err: downErr, customerId }, "Failed to downgrade after refund");
        return;
      }
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
