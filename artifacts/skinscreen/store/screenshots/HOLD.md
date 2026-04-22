# On hold — waiting on App Store / Play Store credentials

Status: **paused** (April 2026)

Real device screenshots have not been captured yet. Per the product owner, this
work is on hold until App Store Connect and Google Play Console login details
are available.

## Why this can't be done from the Replit container
- Xcode Simulator is macOS-only.
- Android Studio Emulator does not run reliably in the Linux container.
- The `/app/*` routes require a live OIDC login as the demo account
  (`review@chimiq.com`) against the hosted backend; there is no local bypass.

## When credentials are available, do this on a Mac
1. Pull the repo, run `pnpm install`, then `pnpm build:mobile`.
2. `cd mobile/capacitor && npm run sync`.
3. Log in to the running app as `review@chimiq.com` (see `../reviewer-notes.md`).
4. iOS — Xcode Simulator:
   - iPhone 15 Pro Max → capture 5 screens with ⌘S → save to
     `ios/iphone-6.7/01-scan.png` … `05-profile.png`.
   - iPhone 11 Pro Max → same → save to `ios/iphone-6.5/`.
5. Android — Android Studio Emulator:
   - Pixel 8 Pro → Volume Down + Power → save to `android/phone/`.
6. Screen order (all devices): Scan empty → Scan result → Browse →
   Routine cross-check → Profile. See `README.md`.
