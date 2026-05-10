import type { Logger } from "pino";
import sgMail from "@sendgrid/mail";
import { getUncachableStripeClient } from "../stripeClient";
import {
  ALERTED_PROMO_ID_KEY,
  ALERTED_THRESHOLDS_KEY,
  COUPON_ID,
  fetchPromoFromStripe,
  parseAlertedThresholds,
} from "./testerPromo";
import { SUPER_ADMIN_EMAIL } from "./admin";

// Thresholds (percent of cap consumed) at which Pia gets a heads-up.
// Each threshold fires at most once per active promotion code — when a
// new code is minted (or the cap is raised, which mints a new code under
// the hood) the slate resets automatically because we key the throttle
// state by the promotion code id.
const ALERT_THRESHOLDS = [80, 100] as const;

// Throttle state lives on the COUPON's metadata as two fixed keys (so
// we stay well within Stripe's 40-char metadata key cap):
//   - `alerted_promo_id`     : the promotion code id these thresholds belong to
//   - `alerted_thresholds`   : CSV of thresholds already emailed for that promo
// When the active promotion code id changes (raise-cap or mint both
// create a new id), the recorded id no longer matches, so the slate
// resets automatically and Pia gets fresh alerts on the new code.
// Keys + parser are defined in `./testerPromo` so the admin payload can
// surface this state to the widget without a circular import.

// How often the scheduled job runs. 15 minutes is a good balance: long
// enough to keep Stripe API calls negligible, short enough that Pia gets
// the alert well before the cap is exhausted at typical signup rates.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

interface SendGridCreds {
  apiKey: string;
  fromEmail: string;
}

async function getSendGridCredentials(): Promise<SendGridCreds | null> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendAlertEmail(args: {
  threshold: number;
  code: string | null;
  timesRedeemed: number;
  maxRedemptions: number;
  remaining: number;
  log: Logger;
}): Promise<boolean> {
  const { threshold, code, timesRedeemed, maxRedemptions, remaining, log } = args;
  const to = process.env.TESTER_PROMO_ALERT_TO || SUPER_ADMIN_EMAIL;

  const creds = await getSendGridCredentials();
  if (!creds) {
    log.debug(
      "SendGrid connector not configured; skipping tester-promo alert email",
    );
    return false;
  }
  sgMail.setApiKey(creds.apiKey);

  const codeLabel = code ?? "(unknown code)";
  const isFull = threshold >= 100;
  const subject = isFull
    ? `[Chimiq] Tester promo ${codeLabel} is FULL (${timesRedeemed}/${maxRedemptions})`
    : `[Chimiq] Tester promo ${codeLabel} is ${threshold}% used (${timesRedeemed}/${maxRedemptions})`;

  const action = isFull
    ? "Testers will start hitting redemption errors at checkout. Raise the cap or mint a new code from the admin page."
    : `You may want to raise the cap soon — only ${remaining} redemption${remaining === 1 ? "" : "s"} left before testers start hitting errors at checkout.`;

  const text = [
    `Tester promo ${codeLabel} is at ${threshold}% of its cap.`,
    ``,
    `Used: ${timesRedeemed} / ${maxRedemptions}`,
    `Remaining: ${remaining}`,
    ``,
    action,
    ``,
    `Manage it from the admin page in the Chimiq app.`,
  ].join("\n");

  const html = [
    `<p><strong>Tester promo ${escapeHtml(codeLabel)} is at ${threshold}% of its cap.</strong></p>`,
    `<ul>`,
    `<li><strong>Used:</strong> ${timesRedeemed} / ${maxRedemptions}</li>`,
    `<li><strong>Remaining:</strong> ${remaining}</li>`,
    `</ul>`,
    `<p>${escapeHtml(action)}</p>`,
    `<p>Manage it from the admin page in the Chimiq app.</p>`,
  ].join("\n");

  await sgMail.send({
    to,
    from: creds.fromEmail,
    subject,
    text,
    html,
  });

  log.info(
    { to, threshold, code: codeLabel, timesRedeemed, maxRedemptions },
    "Tester promo alert email sent",
  );
  return true;
}

/**
 * Run one check: read the active tester promo, and for any threshold
 * (80%, 100%) that has been crossed but not yet alerted on for this
 * promotion code, send Pia an email and record the threshold on the
 * coupon metadata so we don't re-send on subsequent runs.
 *
 * Safe to call repeatedly. Throttle state lives on the Stripe coupon
 * (keyed by promotion code id) so process restarts and multi-instance
 * deploys don't double-fire.
 */
export async function checkAndAlertTesterPromo(log: Logger): Promise<void> {
  let snapshot: Awaited<ReturnType<typeof fetchPromoFromStripe>>;
  try {
    snapshot = await fetchPromoFromStripe();
  } catch (err) {
    log.warn({ err }, "Tester promo alert check: failed to fetch from Stripe");
    return;
  }
  const { payload, coupon, promo } = snapshot;
  const { maxRedemptions, timesRedeemed, remaining } = payload;

  // Without a cap there's nothing to alert on (uncapped promo can never fill).
  if (maxRedemptions == null || maxRedemptions <= 0) return;

  const usagePct = (timesRedeemed / maxRedemptions) * 100;
  // Reset throttle when the active promotion code has changed (raise-cap
  // / mint both create a new id), so Pia gets a fresh 80% / 100% alert
  // on the new code instead of inheriting state from the old one.
  const recordedPromoId = coupon.metadata?.[ALERTED_PROMO_ID_KEY] ?? null;
  const alreadyAlerted = new Set<number>(
    recordedPromoId === promo.id
      ? parseAlertedThresholds(coupon.metadata?.[ALERTED_THRESHOLDS_KEY])
      : [],
  );

  const newlyTriggered = ALERT_THRESHOLDS.filter(
    (t) => usagePct >= t && !alreadyAlerted.has(t),
  );
  if (newlyTriggered.length === 0) return;

  // Send emails sequentially. Failures stop us from recording the
  // threshold so the next run will retry.
  const sentThresholds: number[] = [];
  for (const threshold of newlyTriggered) {
    try {
      const sent = await sendAlertEmail({
        threshold,
        code: payload.code,
        timesRedeemed,
        maxRedemptions,
        remaining: remaining ?? 0,
        log,
      });
      if (sent) sentThresholds.push(threshold);
    } catch (err) {
      log.warn(
        { err, threshold, promoId: promo.id },
        "Tester promo alert email failed; will retry on next check",
      );
    }
  }

  if (sentThresholds.length === 0) return;

  const updated = new Set([...alreadyAlerted, ...sentThresholds]);
  const csv = [...updated].sort((a, b) => a - b).join(",");
  try {
    const stripe = await getUncachableStripeClient();
    await stripe.coupons.update(COUPON_ID, {
      metadata: {
        [ALERTED_PROMO_ID_KEY]: promo.id,
        [ALERTED_THRESHOLDS_KEY]: csv,
      },
    });
  } catch (err) {
    // If we can't persist the throttle, the next run will re-send the
    // same email. Log loudly so we notice the duplicate alerts.
    log.error(
      { err, promoId: promo.id, sentThresholds },
      "Failed to persist tester-promo alert throttle on Stripe coupon metadata; alerts may repeat",
    );
  }
}

let initialTimer: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;

/**
 * Start the recurring tester-promo alert check. Idempotent — calling
 * twice is a no-op. Skips automatically when running under tests.
 */
export function startTesterPromoAlertJob(log: Logger): void {
  if (initialTimer || intervalTimer) return;
  if (process.env.NODE_ENV === "test") return;

  // Run shortly after boot so a freshly deployed server picks up an
  // already-full promo without waiting a full interval, but defer a few
  // seconds so we don't compete with startup work.
  const initialDelayMs = 30_000;

  const run = (): void => {
    void checkAndAlertTesterPromo(log).catch((err) => {
      log.warn({ err }, "Tester promo alert check threw");
    });
  };

  initialTimer = setTimeout(() => {
    initialTimer = null;
    run();
    intervalTimer = setInterval(run, CHECK_INTERVAL_MS);
    // Don't keep the event loop alive just for this timer.
    intervalTimer.unref?.();
  }, initialDelayMs);
  initialTimer.unref?.();

  log.info(
    { intervalMs: CHECK_INTERVAL_MS, initialDelayMs },
    "Tester promo alert job scheduled",
  );
}

/** Test/teardown helper — clears both the boot delay and the interval. */
export function stopTesterPromoAlertJob(): void {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
