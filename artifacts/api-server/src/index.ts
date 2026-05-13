import app from "./app.js";
import { logger } from "./lib/logger.js";
import { pollSafetyGate } from "./lib/safetyGatePoller.js";
import { startTesterPromoAlertJob } from "./lib/testerPromoAlert.js";

const SAFETY_GATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

let safetyGateInterval: NodeJS.Timeout | null = null;

/** EU Safety Gate / RAPEX poller — idempotent start, skips under tests. */
function startSafetyGatePollerJob(log: typeof logger): void {
  if (safetyGateInterval) return;
  if (process.env.NODE_ENV === "test") return;

  const run = (): void => {
    log.info("Safety Gate poller: starting initial fetch");
    void pollSafetyGate()
      .then((result) => {
        if (result.ok) {
          log.info({ inserted: result.inserted }, "Safety Gate poller: done");
        } else {
          log.error(
            { reason: result.reason, feedUrl: result.feedUrl },
            "Safety Gate poller: failed",
          );
        }
      })
      .catch((err) => {
        log.error({ err }, "Safety Gate poller: failed");
      });
  };

  run();
  safetyGateInterval = setInterval(run, SAFETY_GATE_INTERVAL_MS);
  safetyGateInterval.unref?.();

  log.info(
    { intervalMs: SAFETY_GATE_INTERVAL_MS },
    "Safety Gate poller scheduled",
  );
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startTesterPromoAlertJob(logger);
  startSafetyGatePollerJob(logger);
});
