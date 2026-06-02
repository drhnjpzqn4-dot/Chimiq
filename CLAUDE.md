# Chimiq — build & focus rules (repo-level)

## ⭐ MAIN FOCUS: the iPhone app is the product
The **mobile app (iOS / iPhone) is our primary product.** The webapp is only a backup.
Therefore **every code change must end up in the native iOS app, not just on the web.**

Pushing to GitHub / deploying the webapp is **not enough** — the iOS app **bundles** its own
web files (per BESLUT 2026-05-31 "väg B": `server.url` is intentionally unset for TestFlight/App
Store builds). So after every change you must:

1. Commit + push the code.
2. **Rebuild the web app and sync it into Capacitor** (`pnpm build:mobile` → `npx cap sync`).
3. Re-archive in Xcode and upload to TestFlight.

If you skip step 2, Xcode will archive the **old** bundled web files and the change won't appear on
the phone. This applies to ALL commits and builds.

---

## 🖥️ Terminal commands (copy-paste)

### A. Commit + push (run in repo root)
```bash
cd ~/PiasVentures/chimiq-code \
  && git add -A \
  && git commit -m "DESCRIBE THE CHANGE HERE" \
  && git push origin main
```
(or push a branch: `git push -u origin my-branch` and open a PR.)

### B. Clean rebuild → push to Capacitor → open Xcode
Run this after every code change you want on the phone. The `rm -rf` lines wipe stale build
output so no old assets get bundled:
```bash
cd ~/PiasVentures/chimiq-code \
  && rm -rf artifacts/skinscreen/dist \
            artifacts/skinscreen/mobile/capacitor/ios/App/App/public \
  && pnpm build:mobile \
  && cd artifacts/skinscreen/mobile/capacitor \
  && npx cap open ios
```
Then in Xcode: **Product → Archive → Distribute → TestFlight** (bump the build number if asked).

### C. Live preview on a real device/simulator WITHOUT archiving (dev only)
```bash
cd ~/PiasVentures/chimiq-code/artifacts/skinscreen \
  && CAP_SERVER_URL=http://<your-mac-LAN-ip>:5173 npx cap run ios
```
⚠️ Never upload a TestFlight/App Store build made with `CAP_SERVER_URL` set — it must be unset for
bundled builds.

---

## Notes
- `pnpm build:mobile` = build the skinscreen web app for Capacitor **and** `npx cap sync` into iOS.
  This is the "save to Capacitor" step.
- Pure JS/TS changes (no new native plugins) need **only** B + a new archive — no pod install,
  no Info.plist edits, no `cap add`.
- Decision log: `docs/DECISIONS.md`. Cursor build prompts: `docs/cursor-prompts/`.
