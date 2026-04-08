import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log("Checking for existing SkinScreen Premium product...");

    const existingProducts = await stripe.products.search({
      query: "name:'SkinScreen Premium' AND active:'true'",
    });

    if (existingProducts.data.length > 0) {
      const existing = existingProducts.data[0];
      const prices = await stripe.prices.list({ product: existing.id, active: true });
      console.log("SkinScreen Premium already exists:", existing.id);
      if (prices.data.length > 0) {
        console.log("Price ID:", prices.data[0].id);
        console.log("\nSet this environment variable:");
        console.log(`STRIPE_PREMIUM_PRICE_ID=${prices.data[0].id}`);
      }
      return;
    }

    console.log("Creating SkinScreen Premium product...");
    const product = await stripe.products.create({
      name: "SkinScreen Premium",
      description: "Unlimited shelf products, full routine cross-check, AI Chat, and PDF Safety Reports.",
      metadata: {
        tier: "premium",
      },
    });
    console.log("Created product:", product.id);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 499,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log("Created price:", price.id, "($4.99/month)");

    console.log("\nSet this environment variable:");
    console.log(`STRIPE_PREMIUM_PRICE_ID=${price.id}`);
    console.log("\nProducts created successfully!");
  } catch (error: unknown) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

createProducts();
