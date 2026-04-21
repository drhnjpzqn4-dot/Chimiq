# SkinScreen — App Review notes

Paste the relevant block into **App Store Connect → App Review Information → Notes** and **Play Console → App content → Reviewer comments**.

---

## Demo account (both stores)

```
Email:    review@chimiq.com
Password: skinscreen-review-2026
```

The account already has Premium enabled so reviewers can exercise every feature. Reviewers do **not** need a Stripe test card.

A reviewer-only deep link to a pre-loaded shelf with sample scans:
`https://app.skinscreen.chimiq.com/app/shelf?demo=review`

---

## Apple App Store — Review notes

> SkinScreen is a **reader app** per Guideline §3.1.3(a). All Premium subscriptions are sold and managed exclusively on the web at https://app.skinscreen.chimiq.com/pricing. The iOS app:
>
> * Contains **no in-app purchase**.
> * Contains **no buttons, links, language, or call-to-action** that direct users to a non-IAP purchase mechanism within the app itself.
> * Reads the user's existing entitlement from our backend (`/api/payments/status`) and unlocks Premium UI accordingly.
> * Account creation, sign-in and password recovery happen via Replit Auth in a system browser (`SFSafariViewController`), then return to the app via the `skinscreen://auth/callback` URL scheme registered in `Info.plist`.
>
> We have requested the **Account Deletion** flow inside Profile → Delete account. The deletion completes within 30 days; account data is purged from our PostgreSQL within that window.
>
> The Camera permission is only invoked when the user taps "Scan barcode" or "Snap a photo of the label" inside the Scan tab. It is never requested at launch.
>
> Languages supported: English, Swedish.
>
> Contact during review: hello@chimiq.com (response < 12 h, Stockholm CET).

### Section-by-section answers we provide on App Store Connect

* **Sign-in required to use the app?** Yes — explained above. Demo account provided.
* **Contains advertising?** No.
* **Uses encryption?** Yes — HTTPS only. Qualifies for the §740.17(b) ENC exemption (mass-market software using only standard cryptography). We have filed the annual self-classification report with BIS.
* **Content rights:** All flagged-ingredient citations link to publicly available sources (FDA, EWG, peer-reviewed papers). User-contributed ingredient lists are crowdsourced and moderated.
* **IDFA usage:** None.

---

## Google Play — Review notes

> SkinScreen is a "reader app" — all Premium subscriptions are sold on the web at https://app.skinscreen.chimiq.com/pricing. The Android app contains no in-app purchase and uses no Play Billing APIs.
>
> Per Google Play's External Offers / Reader App program, the app does not show any UI inside the Android app that links to or describes the web-only purchase flow. The Profile screen has a single "Manage subscription on the web" row that opens https://app.skinscreen.chimiq.com/pricing in a Custom Tab — this is permitted because the user has *already* subscribed and is managing an existing entitlement.
>
> Authentication uses Replit Auth via Chrome Custom Tabs (`@capacitor/browser`), then returns to the app via the `skinscreen://auth/callback` deep link registered in `AndroidManifest.xml`.
>
> Camera permission is only requested when the user taps "Scan barcode" or "Snap a photo of the label". No background location, no microphone, no Bluetooth, no foreground services.
>
> Account deletion is available in-app under Profile → Delete account, and remotely via hello@chimiq.com — both complete within 30 days.
>
> Target SDK: 35 (Android 15). Min SDK: 24 (Android 7.0).
>
> Contact: hello@chimiq.com (response < 12 h CET).

### Data Safety form — see `privacy.md` in this folder for the full answer matrix.

---

## Build & validation steps for our team (not for stores)

1. `pnpm build:mobile` from repo root.
2. `cd mobile/capacitor && npm run sync`.
3. iOS: `npm run open:ios` → Xcode → Product → Archive → Distribute.
4. Android: `npm run build:android` → upload `app-release.aab` to Play Console.

---

## Known points reviewers may ask about

* **Why does the app ask for camera permission?**
  Only and exclusively for barcode scanning and label OCR. Both are user-initiated.

* **Where do the "Premium" features actually unlock?**
  Inside the app, *after* the user has subscribed on the web. The native shell reads `/api/payments/status` and enables / disables Premium-only UI accordingly. No purchase happens inside the app.

* **Does the app collect health data?**
  No. We are a Health & Fitness category app because we help users avoid skin-irritating ingredients, but we do not collect HealthKit, Google Fit, or any biometric data.
