# Chimiq — Launch Checklist

Last updated: April 30, 2026
Owner: User publishes manually after merge.

This document is the single source of truth for "is Chimiq ready to publish?".
It is split into four sections:

1. [What was verified in this task](#1-what-was-verified-in-this-task)
2. [Before you click Publish](#2-before-you-click-publish-required)
3. [On-device mobile test checklist (post-publish)](#3-on-device-mobile-test-checklist-post-publish)
4. [First 24 hours — monitoring](#4-first-24-hours--monitoring)

---

## 1. What was verified in this task

### Code & build

- [x] `pnpm --filter @workspace/skinscreen run typecheck` — passes
- [x] `pnpm --filter @workspace/api-server run typecheck` — passes
- [x] `pnpm --filter @workspace/skinscreen run test` — 5 passed
- [x] `pnpm --filter @workspace/api-server run test` — 36 passed
- [x] `pnpm --filter @workspace/skinscreen run build` — clean (PWA + 26 SW precache entries + OG images)
- [x] `pnpm --filter @workspace/api-server run build` — clean

### Legal & consent

- [x] `/legal/privacy`, `/legal/terms`, `/legal/medical-disclaimer` render at all three routes (HTTP 200, content visible).
- [x] Each page has a Back link, "Last updated" date, and i18n support for en/sv/fr.
- [x] Footer of `LandingPage` includes links to all three legal pages.
- [x] `Profile` (in-app) page also includes links to the same three legal pages.
- [x] `ConsentGate` modal intercepts every "Sign in" CTA. Continue button is disabled until the required checkbox is ticked. Acceptance is persisted in `localStorage` under key `skinscreen.legal.consent` with `version` = `"1.0"`.
- [x] Bumping `TERMS_VERSION` in `src/lib/legal-consent.ts` will force re-acceptance for all returning users.

### PWA assets

- [x] `public/icon-192.png` (symbol only, transparent — Android home screen)
- [x] `public/icon-512.png` (symbol + "Chimiq" wordmark, transparent — splash)
- [x] `public/icon-512-maskable.png` (symbol + wordmark on `#0d0d0d`, ~80% safe zone — Android adaptive)
- [x] `public/apple-touch-icon.png` (180×180, cream `#F5F1EB` bg — iOS adds rounded corners)
- [x] `public/favicon.ico`, `public/favicon-96.png`, `public/favicon.svg`
- [x] `public/manifest.webmanifest` references `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (purpose `maskable`).
- [x] All icon files are present in `dist/public/` after build.

### Deployment configs (unchanged, re-verified)

- `artifacts/skinscreen/.replit-artifact/artifact.toml`
  - `kind = "web"`, `serve = "static"`
  - `publicDir = "artifacts/skinscreen/dist/public"`
  - SPA rewrite `/* → /index.html`
  - `BASE_PATH = "/"`, `PORT = "19090"`
- `artifacts/api-server/.replit-artifact/artifact.toml`
  - `kind = "api"`
  - Build & run env both set `NODE_ENV = "production"`
  - Health check `path = "/api/healthz"`
  - Run: `node --enable-source-maps artifacts/api-server/dist/index.mjs` on port `8080`

---

## 2. Before you click Publish (required)

### A. Business-name placeholders in legal pages — DONE ✓

All three legal pages have been populated with the operating entity:

- **Entity:** Seafari AB
- **Address:** Tegnérgatan 13A, 11140 Stockholm, Sweden
- **Contact:** legal@chimiq.com
- **Governing law:** Sweden

Files updated:

```
artifacts/skinscreen/src/pages/legal/PrivacyPolicy.tsx
artifacts/skinscreen/src/pages/legal/TermsOfService.tsx
artifacts/skinscreen/src/pages/legal/MedicalDisclaimer.tsx
artifacts/skinscreen/src/lib/i18n.tsx (footer "Contact:" line, en/sv/fr)
```

A grep across `src/pages/legal/` and `src/lib/i18n.tsx` for `[Your Business`, `[Address`, `[email`, `[Country`, `[your-business`, `[din-företagsmejl`, `[votre-email-pro`, or `TODO` returns zero hits.

The Privacy Policy is GDPR-aware (lawful-basis section retained) and the Terms now declare Sweden as governing law. A CCPA notice is retained as a defensive shell — you do not currently sell data to California users, so no further work is required unless you open a US sales channel later.

### B. Stripe production keys (CRITICAL)

The API server uses the **Replit Stripe connector** with automatic environment switching:

```ts
const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
const targetEnvironment = isProduction ? "production" : "development";
```

→ When deployed (`REPLIT_DEPLOYMENT === "1"`), the server requests the **production** Stripe connection from Replit Connectors. Before publishing:

1. Open the Replit Stripe integration UI for this workspace.
2. Confirm you have connected the **production** Stripe environment (not just development). The connector must be present for `targetEnvironment === "production"` or `getStripeSync()` will throw `Stripe production connection not found`.
3. Confirm the secrets `STRIPE_PREMIUM_PRICE_ID_MONTHLY` and `STRIPE_PREMIUM_PRICE_ID_YEARLY` point to **live mode** Price IDs (they start with `price_…` regardless of mode — check in your Stripe dashboard top-right toggle that you're viewing live mode when you copied them).
4. In Stripe → Developers → Webhooks (live mode), confirm the webhook endpoint pointed at your published domain `https://<your-domain>/api/payments/webhook` is enabled and uses the live signing secret. (The secret is fetched via the connector at runtime — no env var to set.)

### C. Other required user-set secrets (already configured)

| Secret                              | Purpose                                          | Source                |
| ----------------------------------- | ------------------------------------------------ | --------------------- |
| `STRIPE_PREMIUM_PRICE_ID_MONTHLY`   | Stripe price for monthly Premium subscription    | User (Stripe live)    |
| `STRIPE_PREMIUM_PRICE_ID_YEARLY`    | Stripe price for yearly Premium subscription     | User (Stripe live)    |
| `ACUMBAMAIL_AUTH_TOKEN`             | Newsletter signup → Acumbamail                   | User                  |
| `ACUMBAMAIL_LIST_ID`                | Acumbamail target list                           | User                  |
| `ADMIN_EMAILS`                      | Comma-separated admin allowlist (optional)       | User                  |

### D. Auto-provided by Replit (do not set manually)

These appear in code as `process.env.…` but are populated automatically by the Replit runtime — you do **not** configure them yourself. They are listed here only so you understand the dependency chain:

- `DATABASE_URL` — Replit Postgres
- `REPL_ID`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL`, `REPLIT_CONNECTORS_HOSTNAME`, `REPLIT_DEPLOYMENT`, `ISSUER_URL` — Replit auth + connectors
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` — Replit App Storage
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Replit Anthropic AI Integration
- `NODE_ENV` — set to `production` in `artifact.toml` for both build & run
- `PORT` — assigned per artifact by Replit (skinscreen: 19090, api: 8080)

### E. Final pre-publish smoke

Run locally before clicking Publish:

```bash
pnpm --filter @workspace/skinscreen run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/skinscreen run test
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/skinscreen run build
pnpm --filter @workspace/api-server run build
```

All six should exit 0.

---

## 3. On-device mobile test checklist (post-publish)

Run these on a **real iPhone (Safari)** AND a **real Android phone (Chrome)**. The simulator/emulator does not exercise the home-screen install flow correctly.

### iOS Safari — install + first-run

- [ ] Visit `https://<your-domain>` in Safari.
- [ ] Verify the favicon (rose-gold molecule) appears in the tab.
- [ ] Tap the Share sheet → "Add to Home Screen".
- [ ] Confirm the home-screen icon shows **the molecule on cream background** with "Chimiq" beneath (this is `apple-touch-icon.png`).
- [ ] Launch from the home screen. The app should open standalone (no Safari chrome).
- [ ] Splash screen: cream/light background while loading is acceptable.
- [ ] Tap "Sign in" → consent modal appears with the required checkbox.
- [ ] Try to tap "Agree & continue" without ticking → button is disabled.
- [ ] Tick the box → button enables → tap → redirects to Replit OIDC. Complete sign-in.
- [ ] After redirect back, you land in the authenticated app and consent persists (close & relaunch, no modal).
- [ ] Close the app, **enable Airplane Mode**, relaunch from home screen → app should still open and show the offline page (or the cached shell).

### Android Chrome — install + first-run

- [ ] Visit `https://<your-domain>` in Chrome.
- [ ] Open the menu → "Install app" (or accept the install prompt if it auto-shows).
- [ ] Confirm the home-screen icon is the **maskable icon on dark background** (Android adaptively masks the icon — the molecule + "Chimiq" should be visible inside the shape).
- [ ] Launch from the home screen. Confirm standalone display (no URL bar).
- [ ] Repeat the consent-gate test: untick → disabled, tick → enabled → continue.
- [ ] Sign in via Replit OIDC, verify return into the app.
- [ ] Pull-to-refresh works without breaking the SPA shell.
- [ ] Toggle Airplane Mode → relaunch → confirm offline behavior.

### Cross-cutting

- [ ] Camera-based ingredient scanning works (Profile → Scan label).
- [ ] Stripe Premium upgrade flow:
  - Tap upgrade → Stripe Checkout opens with **live** prices (real currency, not "Test mode" banner).
  - Use a real card OR cancel out — verify cancel returns you to the app cleanly.
  - If you complete a real purchase: confirm webhook fires (`/api/payments/webhook` returns 200 in your Stripe webhook log) and the user's plan flips to Premium in the app.
- [ ] All three legal pages open correctly via the footer links and from inside the consent modal.
- [ ] Locale switcher (en / sv / fr) works on legal pages and on the consent modal.

### Lighthouse PWA audit (run yourself)

The agent cannot run Lighthouse. Run from Chrome DevTools on your published URL:

1. Open `https://<your-domain>` in Chrome.
2. DevTools → Lighthouse → check "Progressive Web App" + "Performance" + "Accessibility" + "Best Practices" + "SEO".
3. Run audit (Mobile, Slow 4G).

Expected outcomes:

- **PWA**: installable, valid manifest, service worker registered, icons valid (192 + 512 + maskable). Should be a green checkmark.
- **Performance**: ~70+ on mobile (the bundled JS is 950 kB before gzip → 274 kB gzipped; consider lazy-loading routes if you want >90).
- **Accessibility**: ~95+. The consent modal uses `role="dialog"`, `aria-modal`, focus trap, Escape-to-dismiss.
- **Best Practices**: ~95+ (HTTPS provided by Replit Deployments).
- **SEO**: ~95+ (OG meta + sitemap + manifest already in place).

If PWA shows "Does not respond with a 200 when offline", confirm the SW is registered (DevTools → Application → Service Workers) and that `dist/public/sw.js` was deployed.

---

## 4. First 24 hours — monitoring

### Server health

- Use the Replit deployment logs UI (or `fetch_deployment_logs` if iterating with the agent again) to watch for:
  - `ERROR`, `Exception`, `Stripe ... connection not found`, `unhandled rejection`
  - 5xx responses on `/api/auth/callback`, `/api/payments/*`, `/api/analyze*`, `/api/scan-label`
  - Anthropic rate-limit errors (`429`) on the analyze/scan/contribute endpoints
- Verify `/api/healthz` returns 200 from the public URL.

### Stripe

- Stripe Dashboard → Developers → Webhooks → confirm successful deliveries on `customer.subscription.*`, `invoice.*`, `checkout.session.completed`.
- Stripe Dashboard → Payments → confirm any real charges show as expected.

### Auth

- Look for repeated `401` on `/api/auth/user` from the same IP — usually benign (anonymous users), but a sudden spike post-launch can mean OIDC misconfiguration.

### Newsletter

- After any newsletter signup, confirm a new subscriber appears in the Acumbamail list (`ACUMBAMAIL_LIST_ID`).

### Rollback plan

- If a critical bug appears: in Replit Deployments, redeploy the previous successful deployment. Replit keeps deployment history.
- For data corruption: use Replit project checkpoints to restore the development DB; production DB has no automated rollback — take a manual `pg_dump` before publish if in doubt.

### Compliance follow-ups (within 7 days)

- [ ] Replace all `TODO:` placeholders in the legal pages (already required pre-publish, but double-check the live site).
- [ ] If you collect EU users, register a DPA / cookie banner if you add analytics later.
- [ ] Add a real `/sitemap.xml` review and submit to Google Search Console.
- [ ] Bump `TERMS_VERSION` whenever you make a material change to the Terms or Medical Disclaimer — this re-prompts every returning user for consent.

---

## 5. Mobile (iOS + Android via Capacitor)

The web app is wrapped in a native shell using **Capacitor 6**. The shell lives in `artifacts/skinscreen/mobile/capacitor/` and is **not** a pnpm workspace member — it has its own `npm` install so the `@capacitor/*` packages stay out of the web bundle.

See `artifacts/skinscreen/mobile/capacitor/README.md` for the full developer guide. Quick reference:

### App identity (locked in `capacitor.config.ts`)

- **App name:** Chimiq
- **Bundle id:** `se.seafari.chimiq` (iOS + Android)
- **Deep-link scheme:** `skinscreen://` (kept for server-side compatibility — the user-facing brand is still "Chimiq")

### One-time setup on your Mac

```bash
cd artifacts/skinscreen/mobile/capacitor
npm install
cd ../../../..        # back to repo root
pnpm build:mobile     # builds web → copies to www/ → cap sync
cd artifacts/skinscreen/mobile/capacitor
npx cap add ios       # first time only — creates ios/App/App.xcodeproj
npx cap add android   # first time only — creates android/ Gradle project
```

After `cap add`, follow the README to register the `skinscreen` URL scheme in `Info.plist` and `AndroidManifest.xml`. Commit the generated `ios/` and `android/` folders.

### Sync after every web change

```bash
pnpm build:mobile
```

This rebuilds the web app, copies it into `mobile/capacitor/www/`, and runs `cap sync` for both platforms.

### Before submitting to TestFlight / Play Console

- [ ] Verify the bundle id `se.seafari.chimiq` in Apple Developer (App IDs) and Google Play Console match the `appId` in `capacitor.config.ts`. Bundle id is permanent once shipped — change `appId` in `capacitor.config.ts` *before* the first `cap add` if you want a different one.
- [ ] App icons and splash screens generated via `npm run assets` from `mobile/capacitor/`.
- [ ] iOS: `Info.plist` has `NSCameraUsageDescription` (Capacitor writes it automatically from `capacitor.config.ts`) and `CFBundleURLTypes` includes the `skinscreen` scheme.
- [ ] Android: `AndroidManifest.xml` has the `skinscreen` deep-link `<intent-filter>` inside `MainActivity`.
- [ ] On simulator + device: cold start, sign-in via system browser, deep-link return, camera scan, Stripe checkout in in-app browser, offline mode (Airplane Mode + relaunch).
- [ ] Bump `CFBundleShortVersionString` (iOS) and `versionCode` + `versionName` (Android) before each release.
- [ ] iOS: archive in Xcode → Distribute → App Store Connect.
- [ ] Android: `npm run build:android` → upload `app-release.aab` to Play Console internal testing track.

### What was NOT done in this task (out of scope)

- The `ios/` and `android/` folders are not yet committed — they are generated by `npx cap add` on your Mac (the Replit Linux environment can't run Xcode or the Android SDK).
- Push notifications (future task).
- Native code-signing certificates and provisioning profiles (you manage these in Xcode).
- Final store metadata: store screenshots in `store/screenshots/` are placeholders; replace before submission.

---

## 6. Stripe live mode — go-live runbook

This section is the operational reference for taking (or keeping) Stripe in
live mode in production. Use it for the initial go-live, for key rotations,
and whenever you need to re-verify a real charge.

### 6.1 Where each Stripe value lives

| Value                                  | Where it comes from                                              | Where it is consumed                                                   |
| -------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Live publishable key                   | Replit **Stripe connector**, "production" environment            | `getStripePublishableKey()` in `artifacts/api-server/src/stripeClient.ts` |
| Live secret key                        | Replit **Stripe connector**, "production" environment            | `getUncachableStripeClient()` and `getStripeSync()`                    |
| Live webhook signing secret            | Replit **Stripe connector**, "production" environment (auto-fetched at runtime by `stripe-replit-sync`) | `WebhookHandlers.processWebhook` in `artifacts/api-server/src/webhookHandlers.ts` |
| `STRIPE_PREMIUM_PRICE_ID_MONTHLY`      | Set as a **deployment secret** on the API Server artifact         | `artifacts/api-server/src/routes/payments.ts` (`/api/payments/checkout`) |
| `STRIPE_PREMIUM_PRICE_ID_YEARLY`       | Set as a **deployment secret** on the API Server artifact         | `artifacts/api-server/src/routes/payments.ts` (`/api/payments/checkout`) |

The connector switches automatically based on `REPLIT_DEPLOYMENT === "1"`:

- Local dev (workflow) → `development` connector → Stripe **test mode**.
- Deployed (`REPLIT_DEPLOYMENT === "1"`) → `production` connector → Stripe **live mode**.

There is no separate "live keys" env var to set; the live publishable / secret
/ webhook secrets are all served by the Replit Stripe connector when you
connect the **production** Stripe environment in the Replit integration UI.

### 6.2 First-time go-live (one-shot)

Run these in order. Do not skip step 1 — if the connector is missing, the
deployed API server will throw `Stripe production connection not found` at the
first checkout request.

1. **Connect production Stripe in Replit Connectors.** Open the Replit Stripe
   integration → "Connect" → choose your **live** Stripe account (not the
   sandbox/test account). After connecting, the connector page should list a
   "production" environment alongside "development".

2. **Seed live products and prices.** From the repo root, run:

   ```bash
   STRIPE_TARGET_ENV=production pnpm --filter @workspace/scripts run seed:stripe
   ```

   The script is **idempotent**: it matches the product by metadata
   (`app=chimiq, tier=premium`) and matches each price by `lookup_key`
   (`chimiq_premium_monthly_sek`, `chimiq_premium_yearly_sek`). Re-running it
   will reuse existing entities instead of creating duplicates.

   Expected output (the IDs differ per account):

   ```text
   Seeding Stripe products against the "production (LIVE MODE)" connector.
   Created product → prod_xxx (Chimiq Premium)
   Created price   → price_xxx (49.00 SEK/month, lookup_key=chimiq_premium_monthly_sek)
   Created price   → price_yyy (490.00 SEK/year, lookup_key=chimiq_premium_yearly_sek)

   Done. Set these env vars on the deployment:
     STRIPE_PREMIUM_PRICE_ID_MONTHLY=price_xxx
     STRIPE_PREMIUM_PRICE_ID_YEARLY=price_yyy
   ```

   Sanity-check in the Stripe Dashboard (top-right toggle on **"Live mode"**):
   the product "Chimiq Premium" and both prices (49 SEK/month and 490 SEK/yr)
   should appear.

3. **Set the live price IDs on the deployment.** In the Replit Deployment for
   the API Server artifact, set the two secrets to the values printed above:

   - `STRIPE_PREMIUM_PRICE_ID_MONTHLY`
   - `STRIPE_PREMIUM_PRICE_ID_YEARLY`

   These must point at **live mode** prices. Both live and test price IDs
   start with `price_…`, so confirm by viewing the price in the Dashboard with
   the live-mode toggle on.

4. **Register the live webhook endpoint.** In Stripe Dashboard → Developers →
   Webhooks → **make sure the live-mode toggle is on** → "Add endpoint":

   - URL: `https://<your-production-domain>/api/payments/webhook`
   - Events: select the same set already used by the test webhook
     (`checkout.session.completed`, `customer.subscription.created/updated/deleted`,
     `invoice.paid`, `invoice.payment_failed`, `charge.refunded`).
   - Save. Click "Send test event" → pick `checkout.session.completed` → "Send".
     The endpoint should respond with HTTP 200. (`stripe-replit-sync` fetches
     the signing secret from the connector at runtime, so there is nothing to
     paste anywhere — the test event will verify the signature succeeds.)

5. **Redeploy** the API Server artifact so the new env vars are picked up.

6. **Real-charge smoke test** (see §6.4).

### 6.3 Rotating the live keys

If Stripe forces a key rotation (or you suspect a leaked secret):

1. In Stripe Dashboard → Developers → API keys (live mode) → roll the secret key.
2. In Replit Connectors → Stripe → production → **disconnect** then
   **reconnect** to the live Stripe account. This refreshes the publishable
   and secret keys cached in the connector.
3. No env var changes required — `getCredentials()` re-fetches on every call.
4. If the webhook signing secret was rotated, also re-confirm the live
   webhook endpoint in the Dashboard (the connector picks up the new secret
   automatically; no env var to update).
5. Smoke-test a real charge again per §6.4.

### 6.4 Verifying a real charge end-to-end

Do this with a real card (yours) on the published site, against live mode.
Refund yourself afterwards.

1. Sign in to the production app.
2. Open `/pricing` → confirm Stripe Checkout opens with **no "Test mode"
   banner** and the price displays as `49 SEK/mo` (or `490 SEK/yr`) in real
   currency.
3. Complete checkout with a real card.
4. Confirm in the Stripe Dashboard (live mode): the charge appears under
   Payments, and the customer has an active subscription on the Chimiq
   Premium product.
5. In the deployment logs (`fetch_deployment_logs` or the Replit UI), confirm
   the webhook delivery for `checkout.session.completed` and the
   `customer.subscription.created` events both responded with 200.
6. In the app, confirm the user's plan flipped to **Premium**
   (`/api/payments/status` returns `{ plan: "premium" }`, the Pricing page
   shows "You're on Premium").
7. **Cancel the subscription** through the customer portal (Profile → Manage
   billing). Confirm the webhook fires `customer.subscription.updated` with
   `cancel_at_period_end=true`; the user remains Premium until period end.
8. **Immediate downgrade test**: in the Stripe Dashboard, refund the charge.
   Confirm `charge.refunded` fires and the user is downgraded to Free
   immediately. (This path is exercised by the existing webhook handler from
   task #52.)

### 6.5 Re-registering the webhook (if you change domains)

If the production domain changes (custom domain swap, new deployment URL):

1. Stripe Dashboard → Developers → Webhooks (live mode) → open the existing
   endpoint → "Update details" → change the URL to the new
   `https://<new-domain>/api/payments/webhook`.
2. "Send test event" → confirm 200.
3. No code or env-var changes required.
