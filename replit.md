# Overview

This project is a pnpm workspace monorepo utilizing TypeScript, designed for building and deploying a comprehensive web application. The core purpose is to provide a platform with an Express API server, a database layer using PostgreSQL and Drizzle ORM, and various shared libraries and utilities. The project emphasizes a structured approach to development, leveraging monorepo benefits for shared code and consistent tooling.

# User Preferences

The user wants the entire project mirrored to GitHub for double-save safety.
- **GitHub Repository**: `https://github.com/drhnjpzqn4-dot/Chimiq` (branch `main`).
- **Push Command**: `git --no-optional-locks push "https://x-access-token:${GITHUB_TOKEN}@github.com/drhnjpzqn4-dot/Chimiq.git" master:main`
- **Automatic Push Conditions**:
    - After every `mark_task_complete` that produces commits.
    - After any direct commit made outside the task workflow.
- **On-Demand Push**: If the user explicitly says "push".
- **Skip Push Conditions**:
    - No new commits since the last push.
    - Push fails due to GitHub being down (note and retry next time).
- **Important Notes**:
    - Local branch is `master`, GitHub default is `main`; always push `master:main`.
    - Do not try to configure a credential helper; use the inline URL form for authentication.

# System Architecture

The project is structured as a pnpm monorepo with distinct `artifacts` for deployable applications and `lib` for shared libraries. TypeScript is used throughout, with composite projects configured for efficient type-checking and dependency management.

## Technical Stack:
- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **TypeScript**: 5.9
- **API**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (v4), drizzle-zod
- **API Codegen**: Orval (from OpenAPI spec)
- **Bundler**: esbuild (CJS bundle)

## Project Structure:
- `artifacts/`: Deployable applications (e.g., `api-server`).
- `lib/`: Shared libraries (e.g., `api-spec`, `api-client-react`, `api-zod`, `db`).
- `scripts/`: Utility scripts.

## TypeScript and Composite Projects:
- All packages extend `tsconfig.base.json` with `composite: true`.
- Root `tsconfig.json` lists all packages as project references.
- Type-checking is performed from the root using `pnpm run typecheck` (`tsc --build --emitDeclarationOnly`) to ensure correct cross-package import resolution.
- Only `.d.ts` files are emitted during type-checking; esbuild handles actual JS bundling.

## API Server (`@workspace/api-server`):
- Express 5 server.
- Routes in `src/routes/` use `@workspace/api-zod` for validation and `@workspace/db` for persistence.
- Includes setup for CORS, cookie parsing, authentication middleware, and JSON/urlencoded parsing.
- Authentication implemented with OIDC config, session management, and specific auth routes.
- Bundles an allowlist of dependencies with esbuild.
- **Admin email config**: `SUPER_ADMIN_EMAIL` env var (defaults to `pia@chimiq.com`). Exported from `src/lib/admin.ts` and used by `testerPromoAlert.ts` and tests. Frontend contact email uses `VITE_CONTACT_EMAIL` (same default).

## Database Layer (`@workspace/db`):
- Drizzle ORM with PostgreSQL.
- Exports a Drizzle client and schema models.
- Schema definitions include `drizzle-zod` insert schemas.
- Migrations are handled by Replit for production, `drizzle-kit` for development (`push` or `push-force`). Explicit SQL migrations are applied in filename order.

## API Specification and Codegen (`@workspace/api-spec`):
- Manages `openapi.yaml` and `orval.config.ts`.
- Generates React Query hooks and a fetch client into `lib/api-client-react/src/generated/`.
- Generates Zod schemas into `lib/api-zod/src/generated/`.

## Generated Zod Schemas (`@workspace/api-zod`):
- Contains Zod schemas generated from the OpenAPI spec, used for request and response validation in `api-server`.

## Generated API Client (`@workspace/api-client-react`):
- Provides React Query hooks and a fetch client generated from the OpenAPI spec.

## Replit Authentication (`@workspace/replit-auth-web`):
- Browser-side helper for Replit Auth, providing `useAuth()` hook for user authentication status, login, and logout functionalities.
- Redirects to `/api/login` for OIDC flow and `/api/logout`.

## OpenAI Integration (`@workspace/integrations-openai-ai-server`):
- Pre-configured OpenAI SDK client using Replit AI Integration credentials.
- Used by the API server's `/api/analyze` route for ingredient conflict analysis, specifically `gpt-5.2` with JSON object response format.

## Utility Scripts (`@workspace/scripts`):
- A package for miscellaneous utility scripts, run via pnpm.
- Example: `refresh:obf-images` script to re-resolve Open Beauty Facts image URLs.

## UI/UX and Feature Specifications:
- **SkinScreen Mobile Integration**: Capacitor wrapper for iOS and Android. Runtime `isNative()` adapter and deep link handling for authentication.
- **Tap-an-ingredient drawer**: Displays cached CosIng + PubChem data using a Radix bottom sheet.
- **Product ratings**: 1–5 star ratings stored in `product_ratings` table, with eligibility based on scanned barcode or shelf presence. Rate limits applied per IP and per user.
- **Product contribution**: `PATCH /api/products/:barcode/contribute` allows additive patching of `cached_products` and inserts into `user_submitted_products`. Photo uploads use base64 to GCS.
- **Discover ratings rate limit**: Implemented per-IP and per-voter limits for `POST /api/discover/ratings`.
- **Sanitization audit**: Ensures all user-text routes pass through dedicated sanitization functions.
- **Discover scanner pre-fills**: CTA payloads carry `seed` data for pre-filling scanner with single or compare modes. Seeds for alternatives CTAs are designed with flagged ingredients.
- **Marketing page OG previews**: `scripts/build-og.mjs` generates per-page share previews for marketing routes, including PNGs and static HTML with meta tags for bots.
- **Discover→scanner pre-fill contract test**: Vitest tests ensure data-shape contract for discover CTAs and scanner seeds.
- **Full Swedish coverage**: Comprehensive i18n support for EN/SV/FR across marketing and in-app pages, driven by `src/lib/i18n.tsx`. Locale resolution prioritizes URL param, then local storage, browser language, and finally English.
- **Legal pages and Consent Gate**: Added `/legal/privacy`, `/legal/terms`, `/legal/medical-disclaimer` pages with full i18n. A `ConsentGateProvider` intercepts sign-in CTAs with a required-checkbox modal, persisting acceptance in `localStorage` and forcing re-acceptance on `TERMS_VERSION` bump.
- **PWA icons**: Regenerated icons for various sizes and maskable formats from `public/images/logo-chimiq-long.png`.

## Web Analytics (chimiq.com only):
- GDPR-compliant analytics stack; scripts load only after user opts in via cookie banner.
- **Environment Variables**: `VITE_GA_MEASUREMENT_ID` for Google Analytics 4, `VITE_META_PIXEL_ID` for Meta (Facebook) Pixel.
- **Custom Events Tracked**:
    - `sign_up_complete`: On successful signup.
    - `login_complete`: On successful login.
    - `scan_complete`: On every successful ingredient scan (also persisted server-side to `scan_events` table via `POST /api/scan-events`).
    - `product_save`: When adding a product to the shelf.
    - `signup_page_view`, `signup_cta_click`: Pre-existing signup events.
- `checkout_start`: When starting a Stripe checkout (also persisted server-side to `checkout_events` table via `POST /payments/checkout`).
- `checkout_abandoned`: When a user returns from Stripe checkout without completing payment (persisted server-side to `checkout_abandonment_events` table via `POST /api/checkout-abandonment`, also fired as GA/Meta event).
- `subscription_activated`: Subscription activations are tracked server-side in the `subscription_events` table, populated by `stripeUserSync.ts` from Stripe webhook events (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`).
- **Scan Insights Admin Panel**: `ScanInsightsAdmin` component on the admin page shows top scanned products by count, filterable by verdict (safe/warning/high). Data from `scan_events` table aggregated via `GET /api/admin/scan-insights`.
- **Conversion Funnel Admin Dashboard**: `AdminFunnelPage` at `/admin/funnel` shows a 6-step conversion funnel (sign-ups → scans → shelf saves → checkout starts → checkout abandoned → subscriptions). Filterable by time period (7d, 30d, 90d, all). Data from `GET /api/admin/funnel` aggregating `users`, `scan_events`, `shelf_products`, `checkout_events`, `checkout_abandonment_events`, `subscription_events` tables. Includes stat cards, bar visualization, trend chart, and step-by-step breakdown table with conversion rates and drop-off counts.
- **Implementation**: `src/lib/cookie-consent.ts` (versioned localStorage, categories), `src/lib/analytics.ts` (idempotent loaders, helpers), `src/components/CookieBanner.tsx` (UI). Privacy Policy section 1.5 documents categories.

# External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **API Generation**: Orval (from OpenAPI spec)
- **Authentication**: `openid-client`
- **Cookie Handling**: `cookie-parser`
- **AI Integration**: OpenAI SDK (configured with Replit AI Integration credentials)
- **Cloud Storage**: Google Cloud Storage (for photo uploads via `uploadBufferToGcs`)
- **Payment Processing**: Stripe (for Premium subscriptions)
- **Mobile Development**: Capacitor 6 (for iOS/Android wrapper)
- **Analytics**: Google Analytics 4, Meta (Facebook) Pixel
- **UI Components**: Radix (e.g., `IngredientDetailSheet.tsx`)
- **Internationalization**: `i18n.tsx` with EN/SV/FR/ES dictionaries
- **Testing**: Vitest