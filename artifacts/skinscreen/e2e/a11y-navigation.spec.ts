import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Smoke test for the navigation chrome (sticky header + bottom tab bar +
 * floating chat panel) on the three primary in-app screens. We mock auth and
 * the data-fetching API endpoints so the test only exercises the chrome and
 * stays fast / hermetic — no real network or DB required.
 */

const FAKE_USER = {
  id: "test-user",
  email: "axe@example.com",
  firstName: "Axe",
  lastName: "Tester",
  profileImageUrl: null,
  plan: "free" as const,
  isAdmin: false,
};

const ROUTES = ["/app/scan", "/app/discover", "/app/profile"] as const;

async function jsonRoute(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page: Page) {
  // Playwright matches routes in reverse-registration order (LIFO), so the
  // generic catch-all is registered FIRST and the more specific overrides
  // come AFTER so they take precedence.
  await page.route("**/api/**", (route) => jsonRoute(route, {}));

  // Auth: pretend the user is logged in.
  await page.route("**/api/auth/user", (route) => jsonRoute(route, { user: FAKE_USER }));

  // Legal consent: server says the user already accepted the current version.
  await page.route("**/api/legal/consent", (route) =>
    jsonRoute(route, {
      acceptedVersion: "1.0",
      currentVersion: "1.0",
      acceptedAt: new Date().toISOString(),
      acceptedMedicalDisclaimerVersion: "medical_disclaimer_v1",
      acceptedMedicalDisclaimerAt: new Date().toISOString(),
      currentMedicalDisclaimerVersion: "medical_disclaimer_v1",
    }),
  );

  await page.route("**/api/recalls/recent", (route) =>
    jsonRoute(route, { recalls: [] }),
  );

  // Admin / billing checks return false-y so the badge renders without errors.
  await page.route("**/api/admin/check", (route) => jsonRoute(route, { isAdmin: false }));
}

test.describe("Navigation chrome accessibility", () => {
  for (const path of ROUTES) {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await installApiMocks(page);

      const consoleErrors: string[] = [];
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      // Seed legal consent so the ConsentGate modal doesn't block the chrome.
      // Keep this in sync with src/lib/legal-consent.ts.
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem(
            "skinscreen.legal.consent",
            JSON.stringify({
              version: "1.0",
              acceptedAt: new Date().toISOString(),
              medicalDisclaimerVersion: "medical_disclaimer_v1",
              medicalAcceptedAt: new Date().toISOString(),
            }),
          );
        } catch {
          // noop
        }
      });

      await page.goto(path, { waitUntil: "domcontentloaded" });

      // Wait for the primary nav landmark (bottom tab bar) to render — this
      // confirms auth gating let us through and the chrome is mounted.
      await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 15_000 });

      // Run axe-core scoped to the navigation chrome only. We deliberately
      // exclude page bodies so this test stays focused on the regression
      // surface called out in ACCESSIBILITY_AUDIT.md.
      // Wait for the floating chat trigger so its closed-state chrome is in
      // the DOM before we scope axe to it.
      const chatTrigger = page.locator('[aria-controls="chat-panel-dialog"]');
      await chatTrigger.waitFor({ state: "attached", timeout: 5_000 });

      const results = await new AxeBuilder({ page })
        .include('nav[aria-label="Primary"]')
        .include("header")
        .include('[aria-label="Chimiq home"]')
        .include('[aria-controls="chat-panel-dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (blocking.length > 0) {
        console.log(
          "Axe violations:\n" +
            JSON.stringify(
              blocking.map((v) => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.map((n) => n.html),
              })),
              null,
              2,
            ),
        );
      }

      expect(blocking, "navigation chrome must have zero serious/critical axe violations").toEqual([]);
      expect(consoleErrors, "no uncaught page errors while rendering chrome").toEqual([]);
    });
  }
});
