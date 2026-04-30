# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm run build:mobile` — builds the SkinScreen web bundle for the Capacitor wrapper. Follow with `cd mobile/capacitor && npm run sync`. See `MOBILE.md`.

## Mobile (iOS + Android)

SkinScreen is shipped to the App Store and Play Store as a **reader-app Capacitor wrapper**:

- `mobile/capacitor/` — Capacitor 6 wrapper (NOT in pnpm workspace; bootstrap with `npm install` on a dev machine).
- `artifacts/skinscreen/src/lib/native.ts` — runtime `isNative()` adapter; dynamically imports `@capacitor/*` only when running inside the native shell. The web build is unaffected.
- `artifacts/skinscreen/src/hooks/useNativeAuthDeepLink.ts` — listens for `appUrlOpen` and routes the `skinscreen://auth/callback` deep link back into wouter.
- `artifacts/skinscreen/store/` — store-submission kit: 1024 icon master, 2732 splash master (light + dark), English + Swedish listings, App Privacy / Data Safety doc, App Review notes with reviewer demo account.
- `MOBILE.md` — top-level mobile build guide.

All Premium subscriptions remain web-only (Stripe). The native shell reads entitlement via `/api/payments/status` and contains no IAP.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS (credentials:true), cookieParser, authMiddleware, JSON/urlencoded parsing, routes at `/api`
- Auth: `src/lib/auth.ts` (OIDC config, session CRUD), `src/middlewares/authMiddleware.ts` (patches req.user + req.isAuthenticated()), `src/routes/auth.ts` (login/callback/logout/mobile-auth)
- Routes: `src/routes/index.ts` mounts sub-routers; includes shelf, auth, analyze, scan-label, product-lookup, suggest-alternatives
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openid-client`, `cookie-parser`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

Explicit SQL migrations (e.g. destructive drops that drizzle-kit would otherwise prompt about) live in `lib/db/migrations/*.sql` and are applied in filename order by `pnpm --filter @workspace/db run migrate`. Applied filenames are tracked in the `__migrations` table. The post-merge script runs `migrate` before `push`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

IMPORTANT: `src/index.ts` only exports from `./generated/api` — do NOT add `export * from "./generated/types"` as it causes duplicate export collisions. Codegen re-adds this line every time; always revert it after running codegen.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/replit-auth-web` (`@workspace/replit-auth-web`)

Browser-side Replit Auth helper. Exports `useAuth()` hook that fetches `/api/auth/user` and provides `login()` / `logout()` functions. Used by `@workspace/skinscreen`.

- `login()` redirects to `/api/login?returnTo=<BASE_URL>` (full OIDC flow)
- `logout()` redirects to `/api/logout`
- DO NOT use generated API client hooks for auth — always use this package

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

OpenAI SDK client pre-configured with Replit AI Integration credentials (`AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`). Used by the API server's `/api/analyze` route for ingredient conflict analysis.

- Import: `import { openai } from "@workspace/integrations-openai-ai-server";`
- Model used: `gpt-5.2` with `max_completion_tokens` and `response_format: { type: "json_object" }`

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## SkinScreen launch features (Apr 2026)

- **Tap-an-ingredient drawer** — `GET /api/ingredients/lookup?name=` returns
  cached CosIng + PubChem data; `IngredientDetailSheet.tsx` is a Radix bottom
  sheet wired into the result chip strip.
- **1–5 star product ratings** — `product_ratings` table keyed by `barcode`
  + `userId` (UNIQUE). Eligibility = scanned the barcode OR has the product
  on their shelf. Important: shelf match uses `lower(name) = lower(name)`,
  never `ILIKE`, to prevent `%` wildcard auth bypass. Per-IP (30/min) +
  per-user (10/min) rate limit.
- **Gap-fill PATCH** — `PATCH /api/products/:barcode/contribute` additively
  patches `cached_products` only on empty columns and inserts a row in
  `user_submitted_products`. Photo upload uses base64 → `uploadBufferToGcs`.
- **Discover ratings rate limit (#85)** — `POST /api/discover/ratings` now
  has per-IP (30/min) + per-voter (15/min) limits.
- **Sanitization audit (#74)** — all user-text routes confirmed routing
  through `sanitizeText` / `sanitizeProductName` / `sanitizeBrand` /
  `sanitizeIngredients`.
- **Discover scanner pre-fills (#88)** — every non-shelf Discover article
  CTA in `discover-content.ts` now carries a `seed` payload (single or
  compare mode, `autoRun: true`). `DiscoverDetail.tsx` writes the seed to
  `sessionStorage` under `SCANNER_SEED_STORAGE_KEY`; `IngredientScanner.tsx`
  reads it and calls `applySeed()` on mount. Seeds for `alternatives`-type
  CTAs are deliberately built with at least one flagged ingredient
  (fragrance, dye, hydroquinone, etc.) because the alternatives panel only
  renders when `singleResult.flags.length > 0`. Shelf-type CTAs (3 articles)
  intentionally have no seed because they navigate to `/app`, not the
  scanner.
- **Marketing page OG previews (#87)** — `scripts/build-og.mjs` now also
  generates per-page share previews for the SPA-only marketing routes:
  `/pricing`, `/discover`, `/recipes`. Each gets a 1200×630 PNG under
  `dist/public/og/marketing/<slug>.png` plus a static
  `dist/public/<slug>/index.html` with per-page `og:*` and `twitter:*`
  meta tags. Bots fetching these URLs see the right preview; the SPA
  fallback handles real users. Home (`/`) is left on the site-wide OG in
  the root `index.html` (the existing `/opengraph.jpg`).
- **Discover→scanner pre-fill contract test (#89)** — added vitest to the
  skinscreen artifact (`pnpm --filter @workspace/skinscreen test`) with a
  standalone `vitest.config.ts` that bypasses the dev-server `PORT`
  guard. `src/lib/discover-content.test.ts` locks down the data-shape
  contract: every non-shelf CTA carries a seed, shelf CTAs do not, single
  seeds have non-empty `ingredients` + `productName`, compare seeds have
  both products + names, and every `alternatives`-type CTA seeds at
  least one reliably-flagged ingredient token (fragrance / paraben /
  hydroquinone / dye / etc.) so the alternatives panel never renders
  empty. Removing or malforming a seed in the future fails CI.
- **Full Swedish coverage (Apr 2026)** — every marketing surface
  (`LandingPage`, `Home`/`StandaloneWelcome`, `Pricing`/`PricingSection`,
  `Discover`/`DiscoverDetail`, `Recipes`/`RecipeDetail`, not-found) and
  every in-app page (`Browse`, `BrowseDetail`, `Leaderboard`, `Problems`,
  `Rewards`, `RecipeSubmit`) is now driven from `src/lib/i18n.tsx` with
  EN / SV / FR dictionaries kept at strict key parity (~360 keys per
  locale). Admin pages (`AdminPage`, `AdminRecipesPage`) intentionally
  remain English-only. Variant-aware hero + scanner copy is now keyed
  via `landing-config.ts` (`headlineKey`, `subheadKey`,
  `scannerSubheadKey`, `scannerCtaLabelKey.{single,compare}`) so the
  three landing variants stay translatable without duplicating React
  components. `DangerCard` translates the `HIGH RISK` / `CAUTION` badge
  and the `Source:` label internally so existing call sites stay
  unchanged. Locale resolution priority is `?lang=` URL param →
  `localStorage["skinscreen.locale"]` → browser `navigator.language` →
  `en`; the URL-param hop makes spot-checks (e.g. `/?lang=sv`) trivial.
- **Launch readiness — legal pages, consent gate, real PWA icons
  (Apr 30 2026, Task #100)** — added `/legal/privacy`, `/legal/terms`,
  `/legal/medical-disclaimer` (`src/pages/legal/`) sharing a
  `LegalLayout` shell, fully i18n'd in en/sv/fr (~30 keys each).
  Footer of `LandingPage` and the `Profile` page both link to the three
  pages. A new `ConsentGateProvider` (`src/components/ConsentGate.tsx`)
  wraps the app, exposes `useLoginWithConsent().requestLogin()`, and
  intercepts every "Sign in" CTA with a required-checkbox modal before
  delegating to `useAuth().login()`. Acceptance is persisted in
  `localStorage` under `skinscreen.legal.consent` keyed by
  `TERMS_VERSION` (`src/lib/legal-consent.ts`); bumping the constant
  forces re-acceptance for all returning users. PWA icons (192, 512,
  512-maskable, apple-touch-icon-180, favicon.ico/svg/96) were
  regenerated from `public/images/logo-chimiq-long.png` (rose-gold
  molecule symbol) — 192/maskable/apple use symbol+wordmark, smaller
  sizes use symbol only. Pre-publish reference: `LAUNCH_CHECKLIST.md`
  in the skinscreen artifact (covers Stripe live-mode requirements,
  on-device test plan, Lighthouse, monitoring).

## GitHub Backup (Standing Instruction)

The user wants the entire project mirrored to GitHub for double-save
safety. Repo: `https://github.com/drhnjpzqn4-dot/Chimiq` (branch `main`).

**Push command** (token from Replit secret `GITHUB_TOKEN`, never written
to disk):

```bash
git --no-optional-locks push \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/drhnjpzqn4-dot/Chimiq.git" \
  master:main
```

**When to push automatically:**
- After every `mark_task_complete` that produces commits (the platform
  auto-commits at task end, so push immediately after the task is
  approved/merged).
- After any direct commit you make outside the task workflow.
- If the user explicitly says "push", do it on demand.

**Skip push when:**
- No new commits since the last push (`git log origin/main..master` is
  empty — but we don't have a tracking ref locally, so just check
  `git log -1 --format=%H` against the previous push's hash if you
  remembered it; otherwise just push, it's a no-op when up-to-date).
- The push fails due to GitHub being down — note it and retry next time.

**Notes:**
- Local branch is `master`, GitHub default is `main` — always push
  `master:main`.
- Replit's git config writes are blocked for the agent; do not try to
  configure a credential helper. Use the inline URL form above.
- The `subrepl-0vdlt063` remote already points to the GitHub repo but
  has no auth configured, so the inline URL form is the reliable path.
