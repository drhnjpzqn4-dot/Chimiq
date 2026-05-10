import type { Logger } from "pino";
import sgMail from "@sendgrid/mail";

interface FeedbackNotifyPayload {
  message: string;
  email: string | null;
  locale: string | null;
  pageUrl: string | null;
  userId: string | null;
}

const DEFAULT_TO = "hello@chimiq.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fire-and-forget email notification when new feedback arrives.
 * Requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL env vars.
 * Silently no-ops if not configured so local dev works without email.
 */
export function notifyNewFeedback(
  payload: FeedbackNotifyPayload,
  log: Logger,
): void {
  const to = process.env.FEEDBACK_NOTIFY_TO || DEFAULT_TO;

  void (async () => {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;

      if (!apiKey || !fromEmail) {
        log.debug("SendGrid env vars not configured; skipping feedback email");
        return;
      }

      sgMail.setApiKey(apiKey);

      const subjectFrom = payload.email ?? "anonymous";
      const subject = `[Chimiq feedback] from ${subjectFrom}`;

      const lines = [
        `From: ${payload.email ?? "(anonymous)"}`,
        payload.userId ? `User ID: ${payload.userId}` : null,
        payload.locale ? `Locale: ${payload.locale}` : null,
        payload.pageUrl ? `Page: ${payload.pageUrl}` : null,
        "",
        payload.message,
      ]
        .filter((l): l is string => l !== null)
        .join("\n");

      const html = [
        `<p><strong>New feedback received</strong></p>`,
        `<ul>`,
        `<li><strong>From:</strong> ${escapeHtml(payload.email ?? "(anonymous)")}</li>`,
        payload.userId ? `<li><strong>User ID:</strong> ${escapeHtml(payload.userId)}</li>` : "",
        payload.locale ? `<li><strong>Locale:</strong> ${escapeHtml(payload.locale)}</li>` : "",
        payload.pageUrl ? `<li><strong>Page:</strong> <a href="${escapeHtml(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a></li>` : "",
        `</ul>`,
        `<blockquote style="border-left:3px solid #ccc;padding-left:12px;white-space:pre-wrap;">${escapeHtml(payload.message)}</blockquote>`,
      ].join("\n");

      await sgMail.send({
        to,
        from: fromEmail,
        replyTo: payload.email ?? undefined,
        subject,
        text: lines,
        html,
      });

      log.info({ to }, "Feedback notification email sent");
    } catch (err) {
      log.warn({ err }, "Feedback notification email failed");
    }
  })();
}
