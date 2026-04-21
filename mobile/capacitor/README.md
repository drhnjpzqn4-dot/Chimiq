# SkinScreen — Capacitor mobile wrapper

This folder wraps the existing **`artifacts/skinscreen`** React/Vite PWA as native iOS and Android shells using [Capacitor 6](https://capacitorjs.com).

It is **not** part of the pnpm workspace. The Replit Linux container cannot run Xcode or Android Studio, so this directory is bootstrapped and built from your developer machine (macOS for iOS, macOS/Linux/Windows for Android).

---

## What this is (and is not)

SkinScreen is shipped to the App Store and Play Store as a **reader app**:

* The native shell loads the live web app (`server.url` in `capacitor.config.ts`).
* All Premium upgrades happen on the web via Stripe — there is **no IAP**.
* The mobile app reads entitlement from `/api/payments/status` (already implemented in `useUserPlan.ts`).
* Sign-in uses the system browser + deep-link callback `skinscreen://auth/callback` (handled in `artifacts/skinscreen/src/hooks/useNativeAuthDeepLink.ts`).

This pattern is explicitly allowed by Apple §3.1.3(a) (Reader Apps) and Google's Play Billing exceptions for digital content purchased outside the app.

---

## One-time bootstrap (macOS for iOS, any OS for Android)

```bash
cd mobile/capacitor
npm install
npx cap add ios       # macOS only, requires Xcode 15+
npx cap add android   # requires Android Studio Hedgehog+ / JDK 17
```

These commands generate the `ios/` and `android/` folders containing the native projects. They are intentionally **not** committed to the repo because they are platform-specific and easy to regenerate.

After `cap add`, copy the icon and splash assets. Run from inside `mobile/capacitor` so the relative `--assetPath` resolves correctly:

```bash
# from mobile/capacitor (the relative paths below are resolved from here)
npx @capacitor/assets generate \
  --iconBackgroundColor '#FAF7F2' \
  --iconBackgroundColorDark '#1F2937' \
  --splashBackgroundColor '#FAF7F2' \
  --splashBackgroundColorDark '#1F2937' \
  --assetPath ../../artifacts/skinscreen/store
```

Master assets live in `artifacts/skinscreen/store/icons/` and `artifacts/skinscreen/store/splash/`.

---

## Daily build flow

```bash
# 1. From repo root: build the web app
pnpm build:mobile

# 2. From mobile/capacitor: sync into native projects
cd mobile/capacitor
npm run sync

# 3. Open in IDE
npm run open:ios       # opens Xcode
npm run open:android   # opens Android Studio
```

For a release Android `.aab`:

```bash
npm run build:android
# output: android/app/build/outputs/bundle/release/app-release.aab
```

For a release iOS `.ipa`: archive and distribute from Xcode (Product → Archive).

---

## Configuration

Override the served URL for staging or local LAN testing:

```bash
CAP_SERVER_URL=https://staging.skinscreen.chimiq.com npm run sync
```

To bundle the offline web shell instead of pointing at a server, comment out `server.url` in `capacitor.config.ts`. The wrapper will then load `webDir` (`../../artifacts/skinscreen/dist`).

---

## Native plugins used

| Plugin | Why |
| --- | --- |
| `@capacitor/app` | Deep-link `appUrlOpen` events for auth callback |
| `@capacitor/browser` | System browser for OAuth (cookie sharing, App Store compliant) |
| `@capacitor/preferences` | Auth-state persistence between app launches |
| `@capacitor/splash-screen` | Branded launch screen |
| `@capacitor/status-bar` | Match status bar to brand background |
| `@capacitor-mlkit/barcode-scanning` | Native barcode scanner (web fallback uses `BarcodeDetector`) |

The web side dynamically imports these via `artifacts/skinscreen/src/lib/native.ts` so the web build never bundles native packages.

---

## Store submission checklist

See `artifacts/skinscreen/store/reviewer-notes.md` for the App Review note we send with each submission, and `listing-en.md` / `listing-sv.md` for the storefront copy.
