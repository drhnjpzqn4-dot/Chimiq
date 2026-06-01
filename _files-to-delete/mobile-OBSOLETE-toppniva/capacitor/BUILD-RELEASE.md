# SkinScreen — first signed release build runbook

This is the **one-time** procedure for producing the first signed `.ipa` (App
Store Connect) and `.aab` (Play Console internal testing track) on a developer
machine. After this, day-to-day rebuilds are just `pnpm build:mobile` + an
Xcode archive / `npm run build:android`.

> **Android automation**: After the one-time keystore step below, every
> subsequent `.aab` is built automatically by GitHub Actions on `v*`
> tag pushes. See [`.github/workflows/README.md`](../../.github/workflows/README.md)
> for the required secrets (`ANDROID_KEYSTORE_BASE64` etc.) and how to
> trigger a build. The local `npm run build:android` flow below is still
> the authoritative reference and is what the CI workflow executes
> internally.

> The Replit container cannot run Xcode or the Android SDK, so every step
> below must be executed on a developer machine. macOS 14+ with Xcode 15+ is
> required for iOS; Android can be built on macOS / Linux / Windows.

---

## 0. Prerequisites

- macOS 14+ with **Xcode 15+** and command-line tools (`xcode-select --install`)
- **JDK 17** (`brew install --cask temurin@17`)
- **Android Studio Hedgehog (2023.1.1)** or newer
- Apple Developer Program membership (`com.seafari.skinscreen` bundle id reserved)
- Google Play Console account (app listing created, package `com.seafari.skinscreen`)
- Node 20 (`nvm use 20`) and a clone of this repo

---

## 1. Bootstrap the native projects

```bash
# from repo root
pnpm install
pnpm build:mobile          # builds the web app once so cap sync has a webDir

cd mobile/capacitor
npm install
npx cap add ios            # creates mobile/capacitor/ios/      (macOS only)
npx cap add android        # creates mobile/capacitor/android/

# Idempotent — registers skinscreen:// in Info.plist + AndroidManifest.xml
npm run configure:deeplinks

# Generate per-density icons + splashes from the masters in
# artifacts/skinscreen/store/{icons,splash}/
npx @capacitor/assets generate \
  --iconBackgroundColor '#FAF7F2' \
  --iconBackgroundColorDark '#1F2937' \
  --splashBackgroundColor '#FAF7F2' \
  --splashBackgroundColorDark '#1F2937' \
  --assetPath ../../artifacts/skinscreen/store
```

Sanity check:

```bash
npm run doctor             # cap doctor — should show ios + android healthy
```

---

## 2. iOS — code sign and archive

1. Open the project in Xcode:
   ```bash
   npm run open:ios
   ```
2. Select the **App** target → **Signing & Capabilities**.
   - Team: your Apple Developer team
   - Bundle Identifier: `com.seafari.skinscreen` (must match `capacitor.config.ts`)
   - Check **Automatically manage signing** for the first build. Xcode will
     fetch / create the iOS Distribution certificate and an App Store
     provisioning profile.
3. In **General**, bump **Version** (marketing) and **Build** (integer) if
   needed. First submission can stay at `1.0.0` / `1`.
4. Pick the **Any iOS Device (arm64)** destination (top bar).
5. **Product → Archive**. Wait for the build (~3-8 min cold).
6. In the Organizer that pops up, click **Distribute App** →
   **App Store Connect** → **Upload**. Accept the defaults; Xcode signs with
   the App Store distribution profile and uploads.
7. In App Store Connect, wait ~5-15 min for the build to finish processing,
   then attach it to a TestFlight internal tester group and install on a
   real iPhone.

> If signing fails with "no matching profiles", manually create an
> **App Store** distribution profile for `com.seafari.skinscreen` in the Apple
> Developer portal and re-download.

---

## 3. Android — keystore, signing, and `.aab`

```bash
cd mobile/capacitor

# 3a. Create the upload keystore (ONE TIME EVER — back it up after).
bash scripts/create-android-keystore.sh
# → android/keystores/skinscreen-upload.jks  (gitignored)

# 3b. Drop in the passwords for Gradle to read.
cp android-templates/gradle.properties.example android/gradle.properties
$EDITOR android/gradle.properties     # fill in the two passwords

# 3c. Wire the signing config into android/app/build.gradle (idempotent).
bash scripts/configure-android-signing.sh

# 3d. Build the signed bundle.
npm run build:android
# → android/app/build/outputs/bundle/release/app-release.aab
```

Upload `app-release.aab` to **Play Console → Internal testing → Create new
release**. Add at least one tester email under **Testers**, save, review,
roll out. The opt-in URL appears under **Testers**; open it on a real Pixel,
install, and proceed to the smoke test.

> **CRITICAL**: back up `android/keystores/skinscreen-upload.jks` *and* the
> passwords from `android/gradle.properties` to a password manager. Losing
> the upload key requires a multi-day reset request with Google.

---

## 4. Smoke test (do this on both devices before promoting the build)

Run on a real iPhone (TestFlight) and a real Pixel (Play internal testing):

- [ ] App launches, splash matches `#FAF7F2`, no white flash
- [ ] Home → Sign in opens the **system browser** (not an in-app webview)
- [ ] After Clerk login, browser closes and the app shows the signed-in profile
      (deep-link `skinscreen://auth/callback` round-trip works)
- [ ] **No "Subscribe / Upgrade" button is visible inside the native shell**
      (reader-app rule — Premium upgrade should only appear on web)
- [ ] Profile shows the "Manage subscription on the web" row (visible only
      inside the native shell)
- [ ] If the test account has Premium: `/api/payments/status` returns
      `entitled: true` and the Premium badge renders
- [ ] Barcode scanner opens and reads a known EAN (e.g. any cosmetic in the
      seed DB) — uses the native `@capacitor-mlkit/barcode-scanning` plugin
- [ ] Force-quit and relaunch — the auth state persists (read from
      `@capacitor/preferences`)

If any item fails, fix on the web side, re-run `pnpm build:mobile`, then
`npm run sync` and rebuild the relevant platform. The native shell almost
never needs to change.

---

## 5. Where the long-term docs live

- `mobile/capacitor/README.md` — daily build flow + plugin reference
- `MOBILE.md` — architectural overview (why Capacitor, why reader pattern)
- `artifacts/skinscreen/store/reviewer-notes.md` — submit-with-this note
- `artifacts/skinscreen/store/{listing-en,listing-sv}.md` — storefront copy
- `artifacts/skinscreen/store/privacy.md` — App Privacy / Data Safety answers
