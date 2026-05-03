import type { Logger } from "pino";
import sgMail from "@sendgrid/mail";

interface FeedbackNotifyPayload {
  message: string;
  email: string | null;
  locale: string | null;
  pageUrl: string | null;
  userId: string | null;
}

// Default destination for the team notification. Overridable via env
// `FEEDBACK_NOTIFY_TO` if we ever route to a different inbox/alias.
const DEFAULT_TO = "hello@chimiq.com";

// Pulls the SendGrid API key + verified sender from the Replit
// SendGrid connector (configured via the integrations skill). Never
// cache the result — access tokens expire, so a new fetch is required
// per send.
async function getSendGridCredentials(): Promise<{
  apiKey: string;
  fromEmail: string;
} | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;
  if (!hostname || !xReplitToken) return null;

  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=sendgrid`,
    {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: Array<{ settings?: { api_key?: string; from_email?: string } }>;
  };
  const settings = data.items?.[0]?.settings;
  if (!settings?.api_key || !settings.from_email) return null;
  return { apiKey: settings.api_key, fromEmail: settings.from_email };
}

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
 *
 * Sends to `FEEDBACK_NOTIFY_TO` (default `hello@chimiq.com`) via the
 * Replit SendGrid connector. When the connector is not configured we
 * silently no-op so local dev / tests don't need it. Failures are
 * logged but never thrown — the user's POST /api/feedback response
 * must not depend on email delivery succeeding.
 */
export function notifyNewFeedback(
  payload: FeedbackNotifyPayload,
  log: Logger,
): void {
  const to = process.env.FEEDBACK_NOTIFY_TO || DEFAULT_TO;

  // Detached promise — never await.
  void (async () => {
    try {
      const creds = await getSendGridCredentials();
      if (!creds) {
        log.debug(
          "SendGrid connector not configured; skipping feedback email",
        );
        return;
      }
      sgMail.setApiKey(creds.apiKey);

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
        payload.userId
          ? `<li><strong>User ID:</strong> ${escapeHtml(payload.userId)}</li>`
          : "",
        payload.locale
          ? `<li><strong>Locale:</strong> ${escapeHtml(payload.locale)}</li>`
          : "",
        payload.pageUrl
          ? `<li><strong>Page:</strong> <a href="${escapeHtml(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a></li>`
          : "",
        `</ul>`,
        `<blockquote style="border-left:3px solid #ccc;padding-left:12px;white-space:pre-wrap;">${escapeHtml(payload.message)}</blockquote>`,
      ].join("\n");

      await sgMail.send({
        to,
        from: creds.fromEmail,
        // When the user supplied an email, set it as Reply-To so the
        // team can hit Reply directly to respond.
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
