import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as pinoHttpModule from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { applyStripeEventToUser } from "./stripeUserSync.js";

// Derive the event type from the function we already import —
// avoids any Stripe namespace import issues across TypeScript versions.
type StripeEvent = Parameters<typeof applyStripeEventToUser>[0];

const pinoHttp = (pinoHttpModule as any).default ?? pinoHttpModule;

const app: Express = express();

// Trust the Replit edge proxy so `req.ip` and `req.protocol` reflect the
// real client, and so we don't blindly trust raw `x-forwarded-for` headers
// from the public internet (audit-trail integrity for #101 + general
// hardening). "1" = trust exactly one hop in front of us.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      // Sync verified the signature; safe to parse and apply our own
      // user-state updates (plan upgrade/downgrade on subscription lifecycle
      // and refunds). Do not let this throw fail the 2xx ack to Stripe — the
      // event is already mirrored in Postgres and can be reconciled later.
      try {
        const event = JSON.parse(
          (req.body as Buffer).toString("utf8"),
        ) as unknown as StripeEvent;
        await applyStripeEventToUser(event, logger);
      } catch (innerErr) {
        logger.error(
          { err: innerErr },
          "Failed to apply Stripe event to user state",
        );
      }
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err }, "Webhook processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
