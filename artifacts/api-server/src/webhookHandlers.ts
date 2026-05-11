import { getUncachableStripeClient } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " + typeof payload + ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is not set. " +
          "Get it from Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.",
      );
    }

    const stripe = await getUncachableStripeClient();

    // Verifies signature — throws Stripe.errors.StripeSignatureVerificationError
    // if invalid. app.ts catches and responds 400.
    // app.ts then parses the body and calls applyStripeEventToUser() separately.
    stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
