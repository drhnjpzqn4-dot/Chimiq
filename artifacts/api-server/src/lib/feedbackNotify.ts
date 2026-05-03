import type { Logger } from "pino";

interface FeedbackNotifyPayload {
  message: string;
  email: string | null;
  locale: string | null;
  pageUrl: string | null;
  userId: string | null;
}

/**
 * Fire-and-forget Slack notification when new feedback arrives.
 *
 * Configured via the `FEEDBACK_SLACK_WEBHOOK_URL` env var (a Slack
 * incoming-webhook URL). When the env var is unset we silently no-op,
 * so local dev and tests do not need Slack configured.
 *
 * Failures are logged but never thrown — the caller's response to the
 * user must not depend on Slack being reachable.
 */
export function notifyNewFeedback(
  payload: FeedbackNotifyPayload,
  log: Logger,
): void {
  const webhook = process.env.FEEDBACK_SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const lines = [
    "*New feedback received*",
    payload.email ? `• *From:* ${payload.email}` : "• *From:* (anonymous)",
    payload.userId ? `• *User ID:* ${payload.userId}` : null,
    payload.locale ? `• *Locale:* ${payload.locale}` : null,
    payload.pageUrl ? `• *Page:* ${payload.pageUrl}` : null,
    "",
    "> " + payload.message.replace(/\n+/g, "\n> ").slice(0, 3500),
  ]
    .filter(Boolean)
    .join("\n");

  // Detached; never await. Any failure is logged and discarded so the
  // user's POST /api/feedback response is unaffected.
  void fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines }),
  })
    .then((res) => {
      if (!res.ok) {
        log.warn(
          { status: res.status },
          "Slack feedback notification returned non-2xx",
        );
      }
    })
    .catch((err: unknown) => {
      log.warn({ err }, "Slack feedback notification failed");
    });
}
