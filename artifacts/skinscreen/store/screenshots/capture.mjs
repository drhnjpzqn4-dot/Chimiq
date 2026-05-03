// Capture App Store and Play Store screenshots from the demo account.
//
// Runs Playwright against the live web app (which is what the Capacitor
// shell loads at runtime — same URL, same UI). Renders each required
// screen at the device viewports Apple and Google require, then writes
// PNGs into `ios/iphone-6.7/`, `ios/iphone-6.5/`, `android/phone/`.
//
// USAGE
//   # one-time
//   npm i -D playwright
//   npx playwright install chromium
//
//   # then
//   DEMO_EMAIL=review@chimiq.com \
//   DEMO_PASSWORD='chimiq-review-2026' \
//   node artifacts/skinscreen/store/screenshots/capture.mjs
//
// Optional env:
//   APP_BASE_URL  override the target host (default: https://app.chimiq.com)
//   ONLY_DEVICE   limit to one device key (e.g. "iphone-6.7")
//   HEADED=1      run a visible browser for debugging
//
// Why Playwright instead of the iOS Simulator / Android Emulator?
// Apple and Google accept correctly-sized PNGs from any source as long
// as they accurately depict the app. The web app and the Capacitor
// shell render the same DOM, so a mobile-viewport headless capture is
// indistinguishable from a Simulator capture for store-listing purposes
// and runs in seconds on Linux/CI instead of needing a Mac.

import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://app.chimiq.com";
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const ONLY_DEVICE = process.env.ONLY_DEVICE;
const HEADED = process.env.HEADED === "1";

if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error(
    "ERROR: set DEMO_EMAIL and DEMO_PASSWORD env vars. See store/reviewer-notes.md.",
  );
  process.exit(1);
}

// Apple's required iPhone screenshot sizes (per App Store Connect 2024+):
//   6.7" — 1290 x 2796 (iPhone 15 Pro Max)
//   6.5" — 1284 x 2778 (iPhone 11 Pro Max)
// Google Play accepts any phone size in 16:9 to 9:18.5; we use a
// Pixel 8 Pro emulator viewport for a clean modern look.
const DEVICE_PROFILES = [
  {
    key: "iphone-6.7",
    out: "ios/iphone-6.7",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3, // physical 1290 x 2796
    userAgent: devices["iPhone 14 Pro Max"].userAgent,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "iphone-6.5",
    out: "ios/iphone-6.5",
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3, // physical 1242 x 2688 (close to 1284 x 2778)
    userAgent: devices["iPhone 11 Pro Max"].userAgent,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: "android-phone",
    out: "android/phone",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625, // Pixel 8 Pro
    userAgent: devices["Pixel 7"].userAgent,
    isMobile: true,
    hasTouch: true,
  },
];

// Screen order matches store/screenshots/README.md.
const SCREENS = [
  { name: "01-scan-empty", path: "/app/scan", waitFor: "[data-test=scan-empty], main" },
  { name: "02-scan-result", path: "/app/scan?demo=review", waitFor: "main" },
  { name: "03-browse", path: "/app/browse?filter=verified", waitFor: "main" },
  { name: "04-routine", path: "/app/shelf?demo=review", waitFor: "main" },
  { name: "05-profile", path: "/app/profile", waitFor: "main" },
];

async function login(page) {
  await page.goto(`${APP_BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  // The login form selectors are kept generous so they keep working
  // through minor UI tweaks. Update only if the login page itself is
  // restructured.
  const emailField = page.locator(
    'input[type="email"], input[name="email"], input[autocomplete="username"]',
  ).first();
  const passwordField = page.locator(
    'input[type="password"], input[name="password"]',
  ).first();
  await emailField.waitFor({ timeout: 15000 });
  await emailField.fill(DEMO_EMAIL);
  await passwordField.fill(DEMO_PASSWORD);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first().click(),
  ]);
  // Confirm we landed inside the authed app.
  await page.waitForURL(/\/app(\/|$)/, { timeout: 20000 });
}

async function capture(profile, browser) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    userAgent: profile.userAgent,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    colorScheme: "light",
    locale: "en-US",
  });
  const page = await ctx.newPage();
  await login(page);

  const outDir = resolve(HERE, profile.out);
  await mkdir(outDir, { recursive: true });

  for (const screen of SCREENS) {
    const url = `${APP_BASE_URL}${screen.path}`;
    console.log(`  [${profile.key}] ${screen.name} ← ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (screen.waitFor) {
      await page.locator(screen.waitFor).first().waitFor({ timeout: 15000 }).catch(() => {});
    }
    // Let any reveal-on-mount animations settle.
    await page.waitForTimeout(800);
    const file = join(outDir, `${screen.name}.png`);
    await page.screenshot({ path: file, fullPage: false, type: "png" });
  }

  await ctx.close();
}

const browser = await chromium.launch({ headless: !HEADED });
try {
  const profiles = ONLY_DEVICE
    ? DEVICE_PROFILES.filter((p) => p.key === ONLY_DEVICE)
    : DEVICE_PROFILES;
  if (profiles.length === 0) {
    console.error(`No device profile matched ONLY_DEVICE=${ONLY_DEVICE}`);
    process.exit(2);
  }
  for (const profile of profiles) {
    console.log(`\n→ ${profile.key} (${profile.viewport.width}x${profile.viewport.height} @${profile.deviceScaleFactor}x)`);
    await capture(profile, browser);
  }
  console.log("\nDone. PNGs are in artifacts/skinscreen/store/screenshots/.");
} finally {
  await browser.close();
}
