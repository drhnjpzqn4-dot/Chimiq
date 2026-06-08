# Chimiq — pickup / deploy notes (SS-081, 2026-06-09)

You're Pia's technical co-founder on **Chimiq** (iOS skincare app). Repo `~/PiasVentures/chimiq-code`.
The iOS app **bundles** its web files (väg B) → client changes need `pnpm build:mobile` → Xcode Archive
→ TestFlight. Backend (api-server) is on **Railway**, auto-deploys from `main`. DB is Supabase
**Chimiq-prod** (`wzzoipnaucqxnasubljk`). Full detail: `docs/DECISIONS.md` **BESLUT-SS-081**.

## What got done this session (SS-081)
Fixed the broken "complete a CHIMIQ_ placeholder product" flow + The Ordinary data quality.

**Code (needs deploy):**
- `artifacts/api-server/src/routes/contribute.ts` — new `placeholderBarcode` path: completes the
  existing `cached_products` row **in place** (no duplicate), handles EAN-collision with an OBF row.
- `artifacts/skinscreen/src/components/ProductDetailSheet.tsx` — EAN field no longer prefilled with the
  `CHIMIQ_` string; client pre-validates (EAN **or** INCI) instead of hitting a 400; camera-OCR
  (`IngredientsCapture`) wired into the card; prose-junk no longer prefilled; toast/error reconciled.
- `artifacts/skinscreen/src/lib/i18n.tsx` — new key `complete.needEanOrIngredients` (sv/en/fr/es).
- `harvest_theordinary.py` — rejects spec-tables/nav as INCI, strips label+disclaimer, picks a real
  gallery image (not the shared og:image), known single-ingredient INCI map.

**Data (already LIVE in `cached_products`, no deploy needed):**
- 45 rows label/disclaimer-stripped · 5 bogus nav rows removed · 18 spec-table rows emptied (Marula got
  known INCI) · 2 names fixed. Catalog 2 466 → **2 461**.

## ⚠️ DO THIS to ship (on your Mac)
1. **Deploy backend (Railway)** — the `placeholderBarcode` path lives in api-server, the flow won't work
   until this is live:
   ```bash
   cd ~/PiasVentures/chimiq-code \
     && git add -A \
     && git commit -m "SS-081: complete-placeholder flow, card camera-OCR, The Ordinary data + scraper" \
     && git push origin main
   ```
2. **Build + bundle + archive (TestFlight)** — client changes:
   ```bash
   cd ~/PiasVentures/chimiq-code \
     && rm -rf artifacts/skinscreen/dist \
               artifacts/skinscreen/mobile/capacitor/ios/App/App/public \
     && pnpm build:mobile \
     && cd artifacts/skinscreen/mobile/capacitor \
     && npx cap open ios
   ```
   Then Xcode: **Product → Archive → Distribute → TestFlight** (bump build number).
   - `pnpm build:mobile` runs `tsc` — if it reports a type error, paste it back to me (I couldn't run
     tsc in the sandbox; the mount blocks pnpm's store).

## Still open (follow-ups)
- **#5 product images:** 63 The Ordinary placeholders still show the flask placeholder. Re-run the
  hardened scraper on **Stina** to refill `image_url`:
  `scp harvest_theordinary.py stina:~ && ssh stina 'source ~/.zprofile && caffeinate -i python3 harvest_theordinary.py --locale en_SE'`
  → lands in `scraped_products`; ask me to promote `image_url` into `cached_products`.
- **Production review gate:** completions currently go live instantly (Pia's choice for testing). Before
  launch, gate the catalog write behind admin approval (`AUTO_APPROVE_ENABLED`).
- **OBF label prefix:** ~17 non-Ordinary rows have "INGREDIENTS (INCI):" prefix + OCR noise — fix in the
  OBF importer, not row-by-row.

## How to verify the fix (TestFlight)
Open a The Ordinary search-only product (e.g. "Salicylic Acid 2% Anhydrous Solution"), enter its real
EAN + photo-scan/paste INCI, tap **Spara produkten** → should succeed, become scannable, no duplicate
row, and **no** contradictory "Tack!"-toast on error.
