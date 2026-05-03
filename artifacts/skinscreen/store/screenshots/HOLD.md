# Store screenshot capture — automated

Status: **unblocked** (May 2026). Demo account credentials live in
`../reviewer-notes.md` and the capture pipeline is now scripted.

Real device screenshots are produced by the Playwright capture script
at `./capture.mjs`. The script logs in to the live web app as the
demo account and renders each required screen at the exact App Store /
Play Store viewport sizes, then writes PNGs into `ios/iphone-6.7/`,
`ios/iphone-6.5/`, and `android/phone/`.

## Run it

```bash
# one-time
npm i -D playwright
npx playwright install chromium

# every refresh
DEMO_EMAIL=review@chimiq.com \
DEMO_PASSWORD='chimiq-review-2026' \
node artifacts/skinscreen/store/screenshots/capture.mjs
```

## Why a Playwright capture, not Xcode Simulator?

Apple and Google accept any PNG that matches the required pixel
dimensions and accurately represents the app. The Capacitor shell loads
the same web app the script captures — pixel-identical output, runs in
seconds on Linux or CI, no Mac required. If you later need a Simulator
capture for marketing reasons, run it on a Mac per the original
runbook in `BUILD-RELEASE.md`.

## What's still manual

- Adding the marketing headline overlays from the Figma template (we
  ship raw screens; the design team layers the headlines on top before
  upload).
- Final selection — `capture.mjs` produces 5 screens per device; the
  store pages typically show 3-5 of them. Pick the strongest set
  before uploading.
