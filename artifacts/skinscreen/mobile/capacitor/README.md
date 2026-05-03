# Chimiq Mobile (Capacitor)

This directory wraps the Chimiq web app inside a native iOS + Android shell using [Capacitor 6](https://capacitorjs.com). It is **not** a pnpm workspace member — it has its own `node_modules` and uses plain `npm` so the `@capacitor/*` packages never leak into the web bundle.

The web app stays the source of truth. Capacitor copies the built static site (`artifacts/skinscreen/dist/public`) into `mobile/capacitor/www`, then `cap sync` injects it into the native projects.

---

## App identity

| Field          | Value                                           |
| -------------- | ----------------------------------------------- |
| App name       | **Chimiq**                                      |
| Bundle id      | **`se.seafari.chimiq`** (iOS + Android)         |
| Deep-link URI  | `skinscreen://auth/callback` (kept for server compatibility) |
| Min iOS        | 14.0                                            |
| Target Android | SDK 35 (Android 15)                             |
| Min Android    | SDK 24 (Android 7.0)                            |

> **Bundle id is permanent once you ship.** If you want a different one, change `appId` in `capacitor.config.ts` *before* you run `npx cap add ios` / `npx cap add android` for the first time.

---

## One-time setup (do this on your Mac)

This Replit Linux environment cannot build native iOS or Android binaries — Apple requires Xcode (macOS only) and Android requires the Android SDK. You will perform the build steps below on your Mac.

### Prerequisites

- macOS 14+ with Xcode 15+
- Android Studio Hedgehog (2023.1.1) or newer
- Node 20+ and npm 10+
- CocoaPods (`sudo gem install cocoapods`)

### Install JS dependencies

```bash
cd artifacts/skinscreen/mobile/capacitor
npm install
```

### Build the web app first

Capacitor's `webDir` points directly at `../../dist/public` (the Vite production output), so there is **no copy step**. From the repo root:

```bash
pnpm --filter @workspace/skinscreen build
```

Or use `pnpm build:mobile` from the repo root, which builds the web app and runs `cap sync` in one shot.

### Add the native platforms (first run only)

```bash
cd artifacts/skinscreen/mobile/capacitor
npx cap add ios       # creates ios/App/App.xcodeproj
npx cap add android   # creates android/ Gradle project
```

After this, commit the generated `ios/` and `android/` folders so future syncs don't rescaffold them.

### Sync after every web change

```bash
cd artifacts/skinscreen/mobile/capacitor
npm run sync
```

This copies `www/` into both native projects, runs `pod install` on iOS, and updates Gradle on Android.

---

## Generating app icons + splash screens

Capacitor Assets generates every required size from a single source image.

```bash
cd artifacts/skinscreen/mobile/capacitor
npm run assets
```

The script reads `artifacts/skinscreen/public/images/logo-chimiq-long.png` (and falls back to `icon-1024.png` in `store/icons/` if you prefer a square source).

If you want fully manual control, drop the following sources into `mobile/capacitor/resources/` before running `npx capacitor-assets generate`:

- `icon.png` — 1024×1024, **no** transparency, full bleed.
- `icon-foreground.png` — 1024×1024, transparent background, the symbol only (Android adaptive).
- `icon-background.png` — 1024×1024, solid color, no symbol (Android adaptive).
- `splash.png` — 2732×2732, brand color background with the logo centered in a 50% safe zone.
- `splash-dark.png` — same dimensions, dark variant.

---

## Mandatory post-install steps

Capacitor does **not** auto-write everything you need. Run the verification script after every `cap sync` to catch missing entries:

```bash
cd artifacts/skinscreen/mobile/capacitor
bash scripts/verify-native-config.sh
```

It exits non-zero if any of the four required entries below are missing.

### iOS — `ios/App/App/Info.plist`

Add **two** entries inside the top-level `<dict>`:

**1. Camera usage description** (REQUIRED — without this, iOS will crash on first camera access and Apple App Review will reject the build):

```xml
<key>NSCameraUsageDescription</key>
<string>Chimiq uses the camera to scan ingredient labels and barcodes on your skincare products.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Chimiq needs access to your photos so you can pick an existing photo of a label to scan.</string>
```

**2. URL scheme for auth deep-link return** (REQUIRED — without this, sign-in returns to Safari instead of the app):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>se.seafari.chimiq.auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>skinscreen</string>
    </array>
  </dict>
</array>
```

### Android — `android/app/src/main/AndroidManifest.xml`

The `<uses-permission android:name="android.permission.CAMERA" />` line is auto-added by `@capacitor/camera` during `cap sync` — verify it's present.

You must manually add this `<intent-filter>` inside the `<activity android:name=".MainActivity">` block (REQUIRED — without it, sign-in returns to Chrome instead of the app):

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="skinscreen" android:host="auth" />
</intent-filter>
```

### Why `skinscreen://` and not `chimiq://`?

The server's allowed redirect URIs and the `useNativeAuthDeepLink` hook already use `skinscreen://`. Switching schemes requires coordinated server-side changes that are out of scope for this task. The user-facing brand stays "Chimiq" — the URL scheme is invisible to end users.

---

## Running on simulators / devices

### iOS Simulator

```bash
cd artifacts/skinscreen/mobile/capacitor
npm run open:ios
# → Xcode opens. Pick a simulator (iPhone 15 Pro recommended) → Cmd+R.
```

### Android Emulator

```bash
cd artifacts/skinscreen/mobile/capacitor
npm run open:android
# → Android Studio opens. Pick an AVD → Run.
```

### Physical device

Same as above. For iOS you must sign with your Apple Developer team in Xcode → Signing & Capabilities. For Android, enable USB debugging on the device.

---

## Releasing

### iOS → TestFlight

1. Bump `version` and `CFBundleShortVersionString` in `ios/App/App/Info.plist`.
2. `npm run sync:ios`
3. `npm run open:ios`
4. In Xcode: Product → Archive. Wait for the Organizer.
5. Distribute App → App Store Connect → Upload.
6. In App Store Connect: assign the build to your TestFlight group.

### Android → Play Console internal testing

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
2. `npm run sync:android`
3. `npm run build:android` — produces `android/app/build/outputs/bundle/release/app-release.aab`.
4. (First time only) Generate an upload key: `keytool -genkey -v -keystore chimiq-upload.keystore -alias chimiq -keyalg RSA -keysize 2048 -validity 10000`. Configure signing in `android/app/build.gradle` and store the keystore *outside* the repo.
5. Upload the `.aab` to Play Console → Internal testing.

---

## Troubleshooting

- **"Pod install failed"** — make sure you're on macOS, run `cd ios/App && pod install --repo-update`.
- **"Gradle build failed: SDK location not found"** — set `ANDROID_HOME` (e.g., `export ANDROID_HOME=$HOME/Library/Android/sdk`).
- **Camera permission denied on iOS** — confirm `NSCameraUsageDescription` is set in `Info.plist` (Capacitor writes it from `capacitor.config.ts → plugins.Camera.permissions.camera`).
- **Sign-in returns to web instead of the app** — confirm the deep-link scheme is registered in both platforms (see above) and that `MANAGE_SUBSCRIPTION_WEB_URL` in `src/lib/native.ts` points at `https://app.chimiq.com`.

---

## Why this is a separate package

This `mobile/capacitor/` package is what Capacitor's CLI consumes: `capacitor.config.ts` plus the `@capacitor/*` deps in its `package.json` are how `npx cap sync` discovers plugins to register on the native (iOS / Android) side.

The **same** `@capacitor/*` JS packages are also installed in the web app's own `package.json` (`artifacts/skinscreen/package.json`). Capacitor's design is "one JS bundle runs on web and native": the web shims of each plugin no-op (or use standard browser APIs) when `Capacitor.isNativePlatform()` is `false`, and the native bridge takes over when it's `true`. Static imports in `src/lib/native.ts`, `src/hooks/useNativeAuthDeepLink.ts`, and `src/components/BarcodeScanButton.tsx` are therefore the correct pattern.

Why two `package.json`s? `cap sync` reads the package.json next to `capacitor.config.ts` to discover which native plugins to register. Keeping `mobile/capacitor/` outside the pnpm workspace (it lives two levels under `artifacts/`, outside the `artifacts/*` workspace glob) avoids pulling iOS/Android-only dependencies (e.g. `@capacitor/cli`) into the web `node_modules`.

## Auth flow on native — current state and limitations

The current wiring is the **v1 shared-cookie** approach:

1. App calls `useAuth().login()` → opens the system browser at
   `https://app.chimiq.com/api/login?returnTo=skinscreen://auth/callback`.
2. Server's `getSafeReturnTo()` allows this exact URL via
   `NATIVE_RETURN_TO_ALLOWLIST` in `artifacts/api-server/src/routes/auth.ts`.
3. After OIDC completes, server sets the session cookie on `app.chimiq.com`
   and 302s to `skinscreen://auth/callback`.
4. The OS routes that URL into the app, fires `appUrlOpen`, the in-app
   browser closes, and the SPA re-fetches `/api/auth/user`.

**Known limitation:** the session cookie is set in the system browser's
cookie jar (Safari on iOS via `SFSafariViewController`, Chrome Custom Tabs
on Android), not in the WebView's cookie jar. Whether the WebView sees the
cookie depends on platform plumbing — this is acceptable for a v1
TestFlight / internal-testing build but is not the production-grade
solution.

The production solution is to call the existing
`/api/mobile-auth/token-exchange` endpoint from the native client (the
endpoint already exists in `artifacts/api-server/src/routes/auth.ts`).
Wiring the client side of that exchange — generating PKCE, opening the
authorize URL directly, posting the resulting code to the exchange
endpoint, and persisting the returned session id in the WebView — is task
**#68** ("native session-cookie reconciliation"). Do not duplicate it
here.

## API base URL on native

The Capacitor WebView loads bundled assets from `capacitor://localhost` (iOS) or `https://localhost` (Android). Any `fetch("/api/...")` call would otherwise hit that local origin and fail. `src/lib/native.ts` exports `installNativeFetchInterceptor()` (called once from `src/main.tsx`) which transparently rewrites relative `/api/*` requests to `https://app.chimiq.com/api/*` whenever the app is running natively. **If you change the production backend host, update `NATIVE_API_BASE_URL` in `src/lib/native.ts`.**
