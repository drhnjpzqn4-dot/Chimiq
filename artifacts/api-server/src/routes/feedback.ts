import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, feedbackSubmissionsTable } from "@workspace/db";
import { ipRateLimit } from "../lib/rateLimit.js";
import { sanitizeText, SanitizationError } from "../lib/sanitize.js";
import { notifyNewFeedback } from "../lib/feedbackNotify.js";

const FeedbackBody = z.object({
  message: z.string().trim().min(1).max(4000),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  locale: z.string().trim().max(16).optional(),
  pageUrl: z.string().trim().max(2000).optional(),
});

const router: IRouter = Router();

const feedbackIpLimit = ipRateLimit({
  windowMs: 60_000,
  max: 5,
  key: "feedback",
});

router.post("/feedback", feedbackIpLimit, async (req, res) => {
  const parseResult = FeedbackBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid feedback data." });
    return;
  }

  const { message, email, locale, pageUrl } = parseResult.data;

  let safeMessage: string;
  try {
    safeMessage = sanitizeText(message, {
      fieldName: "Feedback",
      maxLength: 4000,
      minLength: 1,
      conversational: true,
    });
  } catch (err) {
    if (err instanceof SanitizationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const userId = (req as { user?: { id?: string } }).user?.id ?? null;
  const userAgent = req.headers["user-agent"]?.toString().slice(0, 500) ?? null;
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null;

  try {
    await db.insert(feedbackSubmissionsTable).values({
      userId,
      email: email && email.length > 0 ? email : null,
      message: safeMessage,
      locale: locale ?? null,
      pageUrl: pageUrl ?? null,
      userAgent,
      ip,
    });

    req.log.info(
      { userId, locale, hasEmail: !!email },
      "Feedback submission received",
    );

    // Non-blocking: fire Slack notification (or no-op when the webhook
    // env var isn't set). Failures inside notifyNewFeedback are logged
    // but never propagated, so the user's request always succeeds once
    // the row is persisted.
    notifyNewFeedback(
      {
        message: safeMessage,
        email: email && email.length > 0 ? email : null,
        locale: locale ?? null,
        pageUrl: pageUrl ?? null,
        userId,
      },
      req.log,
    );

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to store feedback submission");
    res.status(500).json({ error: "Could not save feedback. Please try again." });
  }
});

export default router;
