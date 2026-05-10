import Stripe from "stripe";

/**
 * Returns a fresh Stripe client using STRIPE_SECRET_KEY env var.
 * Call this per-request (not as a singleton) since the secret may rotate.
 */
export async function getUncachableStripeClient(): Promise<Stripe.Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  return Stripe(secretKey, { apiVersion: "2025-03-31.basil" });
}

export async function getStripePublishableKey(): Promise<string> {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error("STRIPE_PUBLISHABLE_KEY is not set");
  return key;
}

export async function getStripeSecretKey(): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

// stripe-replit-sync is not supported outside Replit.
export async function getStripeSync(): Promise<never> {
  throw new Error("getStripeSync is not supported outside Replit");
}
