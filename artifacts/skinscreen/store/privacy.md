# SkinScreen — App Privacy / Data Safety form

This document mirrors the answers we provide in **App Store Connect → App Privacy** and **Play Console → Data safety**. Keep in sync with the public privacy policy at https://chimiq.com/privacy.

---

## Data we collect — App Store Connect taxonomy

### Contact Info
| Type | Linked to user | Used for tracking? | Purposes |
| --- | --- | --- | --- |
| **Email address** | Yes | No | App Functionality (account, login receipts) · Customer Support |
| **Name** (optional, only if user supplies) | Yes | No | App Functionality (display) |

### User Content
| Type | Linked to user | Used for tracking? | Purposes |
| --- | --- | --- | --- |
| **Photos / images** (label scans) | No | No | App Functionality. Images are sent to our OCR pipeline; we **do not store** the photo itself, only the extracted ingredient text. |
| **Other user content** (typed ingredient lists, contributed product entries) | No | No | App Functionality. Contributions are anonymised before being added to the public product database. |

### Identifiers
| Type | Linked to user | Used for tracking? | Purposes |
| --- | --- | --- | --- |
| **User ID** (account UUID) | Yes | No | App Functionality · Authentication |

### Usage Data
| Type | Linked to user | Used for tracking? | Purposes |
| --- | --- | --- | --- |
| **Product interaction** (scan counts, features used) | Yes | No | Analytics (aggregated) · App Functionality (free-tier limits) |

### Diagnostics
| Type | Linked to user | Used for tracking? | Purposes |
| --- | --- | --- | --- |
| **Crash data** | No | No | App Functionality |
| **Performance data** | No | No | App Functionality |

---

## Data we do NOT collect

* Precise or coarse location
* Health & fitness data (workouts, vitals, etc.)
* Financial info — payments are processed entirely by Stripe on the web; Stripe handles cardholder data per PCI-DSS Level 1
* Contacts, browsing history, search history outside the app
* Audio data
* Device advertising identifiers (we do **not** use IDFA/AAID)
* Sensitive info as defined by Apple (race, ethnicity, religion, etc.)

---

## Tracking

**SkinScreen does not track users across apps and websites owned by other companies.**
We do not call `App Tracking Transparency` (`ATTrackingManager.requestTrackingAuthorization`).

---

## Third-party SDKs / data shares

| Recipient | Data shared | Purpose | User consent |
| --- | --- | --- | --- |
| **Replit Auth** (OpenID provider) | Email, account ID | Authentication | Required to create account |
| **Stripe** | Email, billing address (web only) | Payment processing | Required to subscribe |
| **OpenAI / Gemini** (LLM providers) | Ingredient text only — no PII | Conflict analysis & alternative suggestions | App Functionality |
| **Acumbamail** (newsletter, opt-in) | Email | Marketing — only after explicit checkbox consent | Opt-in |

OCR (label-photo → text) runs through our managed Gemini pipeline. The image is processed in memory and discarded; only the extracted text is persisted (and only if the user contributes the product back to the database).

---

## Data retention & deletion

* Account data: retained while the account is active; deleted within 30 days of in-app account deletion (Profile → Delete account, or email hello@chimiq.com).
* Ingredient analyses: cached anonymously for up to 90 days for performance; user linkage is removed after 30 days.
* Payment receipts: retained 7 years per Swedish accounting law (Bokföringslagen).

A data-export download (JSON of your scans, contributions, and shelf) is available on request via hello@chimiq.com.

---

## Children

SkinScreen is not directed to children under 13 (under 16 in the EEA / UK). Account creation requires the user to confirm they meet the minimum age. We do not knowingly collect data from children below the threshold. If we discover such an account we delete it.

---

## Permissions requested by the app

| Permission | When asked | Why |
| --- | --- | --- |
| **Camera** | Only when the user taps "Scan barcode" or "Snap a photo of the label" | Reading EAN/UPC barcodes and OCR of ingredient panels. Photos are processed in memory and never uploaded raw. |
| **Photo Library — add only** (iOS) | Never asked unless user enables export | Saving ingredient analyses as images |

No background location, no microphone, no contacts, no Bluetooth, no HealthKit/Google Fit.

---

## Data Safety form — Google Play (summary)

| Section | Answer |
| --- | --- |
| Data collection | Yes — email, account ID, user content (ingredient text), product interaction |
| Data sharing | Yes — with Stripe (web payments) and Replit Auth (login), both for required app functions |
| Encryption in transit | Yes (HTTPS / TLS 1.2+) |
| Encryption at rest | Yes (AES-256 for user data in our managed PostgreSQL) |
| Data deletion | Users can request deletion in-app and via hello@chimiq.com |
| Family Policy compliant | Not directed at children (rated Everyone, not Teacher Approved) |
| Independent security review | Self-attested |
