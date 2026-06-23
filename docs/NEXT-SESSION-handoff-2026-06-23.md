# Chimiq — TODO for next session (paste this to start)

You're Pia's technical co-founder on **Chimiq** (iOS skincare app). Repo `~/PiasVentures/chimiq-code`.
iOS app **bundles** its web files → client changes need `pnpm build:mobile` → Xcode Archive → TestFlight.
Backend (api-server) on **Railway**, auto-deploys from `main`. DB = Supabase **Chimiq-prod**
(`wzzoipnaucqxnasubljk`). History: `docs/DECISIONS.md` (SS-081 … SS-081e). Always `pnpm typecheck`
before building.

## Priority order for tomorrow

### 1. Fix the chat (small + diagnosed) 🔴
Symptom: "Något gick fel" on every send; no "Chat failed" in Railway logs.
**Root cause (confirmed by reasoning):** a **400 Invalid input**, not a 500 — the chat sends the whole
shelf as `shelfContext`, and `ChatBodySchema` rejects `shelfContext > 4000 chars`. Pia has many shelf
products → context exceeds 4000 → 400 → generic error (400 isn't logged as "Chat failed").
**Pia's instruction: the chat should NOT preload anything.**
- `ChatPanel.tsx`: stop auto-sending `shelfContext` (or only send a short, capped summary on explicit
  opt-in). Simplest: don't send it at all by default.
- Also reset state when the panel opens/closes — it currently reopens with the OLD question + error
  still showing. Clear `messages` + `error` + `input` on open (and/or close).
- (Already done, pending build: `ChatPanel` now surfaces the server's real error text instead of the
  generic one — keep that.)
- Chat is **premium-only** (`requirePremium`). Confirm the test account is Premium, or add an
  admin/tester bypass for testing.
- "API overloaded" Pia saw = Anthropic 529 (transient) — separate from the 400.

### 2. Product upload flow — fewer photos, clearer order 🟠
**Current:** scan barcode → photo for name/brand → another front-of-bottle photo for the product image
→ photo of ingredients. (3 photos; the name/brand photo and the product-image photo are the same thing.)
**Wanted:**
- **One** front-of-bottle photo that captures BOTH the product image AND the name/brand (merge the two).
  → flow becomes: scan barcode → 1 front photo (image + name/brand OCR) → 1 ingredients photo.
- Files to look at: `ScanEntry.tsx`, `ProductCapture.tsx`, `ProductNameCapture.tsx`,
  `ProductImageCapture.tsx`, `IngredientsCapture.tsx`. Likely: use the front photo for both
  `imageDataUrl` (product image) and name/brand extraction (`extractProductNameFromImage`).

### 3. Save button order: DB save → Analyze → Add to shelf 🟠
**Current:** the "Save" button (above Analyze) saves the product straight to the user's **routine/shelf**
— confusing.
**Wanted ordering:**
1. **Save to database/catalog** (contribute) — NOT to the personal shelf.
2. Once saved to DB, the **Analyze** button becomes available.
3. THEN, separately, an explicit **"Add to my routine/shelf"** action.
- Files: `ProductDetailSheet.tsx` (handleSaveEdits / saveCompletion / contributeToCatalog / addToShelf),
  and the button block. Separate "save to catalog" from "add to shelf"; gate Analyze on having INCI in
  the catalog; show "Add to shelf" as a distinct step.

### 4. Safety Gate poller — point at the live feed 🟡
The poller hits the old RAPEX XML URL (`…/RAPEX_ALERTS_1_3.xml`) which now returns HTML
(`non_xml_response`) → recall monitoring ingests nothing. Fails gracefully (no crash). The `SIGTERM`
logs were just Railway redeploys, not crashes.
**Task:** research the EU Safety Gate **current machine-readable feed** (RSS/XML/API) and update
`DEFAULT_FEED_URL` in `lib/safetyGatePoller.ts` (parser is regex-based, dependency-free — may need
small tweaks for the new format). Verify one successful poll inserts into `recalls`.

### 5. Resend email (Pia's task) 🟢
Pia is verifying **chimiq.com DNS at websupport** (her domain provider) tomorrow. Once Resend shows the
domain **verified**, report emails to **hello@chimiq.com** will send (code already deployed in SS-081e:
`report.ts` `notifyReportInbox`, needs `RESEND_API_KEY` in Railway Variables). No code needed.

## Already shipped this session (SS-081 → SS-081e) — for context
Placeholder-complete flow, camera-OCR in card, shared analysis persistence (pay once), false-"Trygg"
fixes, "Granskad/Värt att veta/Granska noga" labels (no safe/dangerous claims; red only for
combinations), routine caching + free-tier gate + AM/PM-aware pairing + max-10 note, brand-name
collapse, pink bottle placeholder, search interstitial removed, product-reports admin view + email,
barcode-lookup `created_at`→`submitted_at` fix.

## ⚠️ Deploy state to confirm first
Check `git status` / last commit — some of the above (e.g. barcode-lookup fix, ChatPanel error-surfacing)
may be committed but **not yet built to TestFlight / pushed to Railway**. Run `git log --oneline -5`,
then push (Railway) + `pnpm build:mobile` (TestFlight) as needed before testing.
