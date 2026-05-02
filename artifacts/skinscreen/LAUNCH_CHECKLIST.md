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
