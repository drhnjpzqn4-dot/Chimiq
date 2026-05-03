import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Idempotently seed (or re-confirm) the Chimiq Premium product and its
 * monthly + yearly SEK prices in the connected Stripe account.
 *
 * Targeting test vs live mode is controlled by the Replit Stripe connector:
 *   - Default (no env): targets the "development" connector → Stripe TEST mode.
 *   - STRIPE_TARGET_ENV=production (or "live"): targets the "production"
 *     connector → Stripe LIVE mode. Use this when seeding real prices for
 *     the deployed app.
 *
 * Idempotency is provided by Stripe price `lookup_key`s — re-running this
 * script will reuse existing matching prices instead of creating duplicates.
 * The product itself is matched by metadata.app=chimiq + metadata.tier=premium
 * so a stale "SkinScreen Premium" product (legacy name) won't be duplicated
 * either; it will be renamed in place.
 */

const PRODUCT_NAME = "Chimiq Premium";
const PRODUCT_DESCRIPTION =
  "Unlimited shelf products, full routine cross-check, AI Chat, and PDF Safety Reports.";
const PRODUCT_METADATA = { app: "chimiq", tier: "premium" } as const;

const MONTHLY_LOOKUP_KEY = "chimiq_premium_monthly_sek";
const YEARLY_LOOKUP_KEY = "chimiq_premium_yearly_sek";
const CURRENCY = "sek";
const MONTHLY_AMOUNT = 4900; // 49.00 SEK
const YEARLY_AMOUNT = 49000; // 490.00 SEK

async function findOrCreateProduct(stripe: Stripe): Promise<Stripe.Product> {
  // Prefer matching by metadata so we don't depend on the historical product
  // name ("SkinScreen Premium") being unchanged.
  const byMeta = await stripe.products.search({
    query: `active:'true' AND metadata['app']:'chimiq' AND metadata['tier']:'premium'`,
    limit: 2,
  });
  if (byMeta.data.length > 0) {
    const existing = byMeta.data[0];
    if (existing.name !== PRODUCT_NAME || existing.description !== PRODUCT_DESCRIPTION) {
      const updated = await stripe.products.update(existing.id, {
        name: PRODUCT_NAME,
        description: PRODUCT_DESCRIPTION,
        metadata: { ...PRODUCT_METADATA },
      });
      console.log(`Updated existing product → ${updated.id} (${updated.name})`);
      return updated;
    }
    console.log(`Reusing existing product → ${existing.id} (${existing.name})`);
    return existing;
  }

  // Fall back to a name-based lookup for the legacy product, then re-tag it.
  const byName = await stripe.products.search({
    query: `active:'true' AND name:'SkinScreen Premium'`,
    limit: 2,
  });
  if (byName.data.length > 0) {
    const legacy = byName.data[0];
    const updated = await stripe.products.update(legacy.id, {
      name: PRODUCT_NAME,
      description: PRODUCT_DESCRIPTION,
      metadata: { ...PRODUCT_METADATA },
    });
    console.log(`Renamed legacy product → ${updated.id} (${updated.name})`);
    return updated;
  }

  const created = await stripe.products.create({
    name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    metadata: { ...PRODUCT_METADATA },
  });
  console.log(`Created product → ${created.id} (${created.name})`);
  return created;
}

async function findOrCreatePrice(
  stripe: Stripe,
  product: Stripe.Product,
  lookupKey: string,
  amount: number,
  interval: "month" | "year",
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0) {
    const price = existing.data[0];
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const matches =
      productId === product.id &&
      price.currency === CURRENCY &&
      price.unit_amount === amount &&
      price.recurring?.interval === interval;
    if (matches) {
      console.log(`Reusing existing price → ${price.id} (lookup_key=${lookupKey})`);
      return price;
    }
    // Lookup key already in use but with different terms — free it up by
    // archiving the stale price and creating a fresh one. Stripe disallows
    // two active prices sharing a lookup key.
    console.log(
      `Existing price ${price.id} (lookup_key=${lookupKey}) does not match desired terms; archiving.`,
    );
    await stripe.prices.update(price.id, {
      active: false,
      lookup_key: `${lookupKey}_archived_${Date.now()}`,
    });
  }

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: CURRENCY,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { ...PRODUCT_METADATA, billing_interval: interval },
  });
  console.log(
    `Created price → ${created.id} (${(amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()}/${interval}, lookup_key=${lookupKey})`,
  );
  return created;
}

async function main() {
  const target = process.env.STRIPE_TARGET_ENV?.toLowerCase();
  const targetingLive = target === "production" || target === "live";
  console.log(
    `Seeding Stripe products against the "${targetingLive ? "production (LIVE MODE)" : "development (TEST MODE)"}" connector.\n` +
      (targetingLive
        ? "Real charges and real prices will be created in the live Stripe account.\n"
        : "Set STRIPE_TARGET_ENV=production to seed against the live account.\n"),
  );

  const stripe = await getUncachableStripeClient();
  const product = await findOrCreateProduct(stripe);

  const monthly = await findOrCreatePrice(
    stripe,
    product,
    MONTHLY_LOOKUP_KEY,
    MONTHLY_AMOUNT,
    "month",
  );
  const yearly = await findOrCreatePrice(
    stripe,
    product,
    YEARLY_LOOKUP_KEY,
    YEARLY_AMOUNT,
    "year",
  );

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("Done. Set these env vars on the deployment:");
  console.log(`  STRIPE_PREMIUM_PRICE_ID_MONTHLY=${monthly.id}`);
  console.log(`  STRIPE_PREMIUM_PRICE_ID_YEARLY=${yearly.id}`);
  console.log("────────────────────────────────────────────────────────────\n");

  if (targetingLive) {
    console.log(
      "Reminder: also configure a LIVE-mode webhook endpoint in the Stripe\n" +
        "Dashboard pointing at https://<your-domain>/api/payments/webhook with\n" +
        "the same event types as the test webhook. The signing secret is\n" +
        "fetched at runtime via the Replit Stripe connector — no env var to set.\n",
    );
  }
}

main().catch((error: unknown) => {
  console.error("seed-stripe-products failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
