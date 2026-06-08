# Chimiq — next session pickup (paste this to start)

You're Pia's technical co-founder on **Chimiq** (iOS skincare app; ingredient scan/analysis + routine
conflicts). Repo: `~/PiasVentures/chimiq-code`. The iOS app **bundles** its web files (väg B) so client
changes need `pnpm build:mobile` → Xcode Archive → TestFlight. Backend (api-server) is on **Railway**,
auto-deploys from `main`. DB is Supabase **Chimiq-prod** (`wzzoipnaucqxnasubljk`). Read
`docs/DECISIONS.md` (SS-079, SS-080) first.

## Where we are (2026-06-08, end of day)
- Catalog `cached_products` = **2,466 products**, all run through a strict INCI filter.
- Source strategy: **Apotea** = primary (sitemap-based scraper, clean), **OBF** = brands missing EAN
  in shops, **theordinary.com** = The Ordinary (no EAN → search-only placeholder). **Lyko retired**
  (doesn't expose INCI).
- Scrapers in repo root: `harvest_apotea.py`, `harvest_obf.py`, `harvest_theordinary.py`,
  `harvest_lyko.py` (dead). They run on Stina (Mac mini): `scp` up, `source ~/.zprofile`,
  `caffeinate -i python3 <script> ...`. Data lands in `scraped_products` (staging); ask to promote.
- SS-079 app fixes are LIVE (Railway deployed, TestFlight archived): analysis persists on card,
  add→searchable, round-bottle notice, flag button.

## PRIORITY for this session — fix the "complete a product" flow (from Pia's TestFlight test)
The Ordinary search-only products (placeholder barcode `CHIMIQ_<hash>`) surfaced real app bugs when a
user opens one and tries to complete it:

1. **Save fails: "Inskickning misslyckades. Försök igen."** Likely root cause: `POST /api/contribute/manual`
   (`artifacts/api-server/src/routes/contribute.ts`) — `ManualContributionBody.barcode` has
   `.refine(isValidGtin)`, so a `CHIMIQ_` placeholder barcode → 400; and emptying both EAN + INCI trips
   the `.refine(ingredients || barcode)` → 400. Need a path to **complete a placeholder product**:
   accept the real EAN the user enters, replace the `CHIMIQ_` row's barcode, attach their INCI/photo.
   Also a contradictory "Tack! Vi sparade din komplettering" shows at the same time — reconcile the
   success/error states in `ProductDetailSheet.tsx` (`handleSaveEdits`).
2. **No camera to add ingredients in the product card.** The card's ingredient edit is a plain
   `<textarea>`; the camera OCR (`IngredientsCapture`, with `useScanLabel`) lives only in
   ScanEntry/ContributeModal. Add photo-scan of the ingredient list into the product-card edit flow.
3. **Ingredient field pre-filled with description text** for some products (see #4). When INCI is
   missing/garbage, the field should be empty with the round-bottle/scan affordance, not prefilled junk.

## Data quality follow-ups (The Ordinary)
4. **Single-ingredient products** ("The Ordinary 100% Plant-Derived Squalane", "...Argan Oil", etc.):
   `harvest_theordinary.py` grabbed the marketing description instead of the one-line INCI. 12 such rows
   were deleted on 2026-06-08. Either special-case single-ingredient INCI in the scraper, or set known
   values (Squalane → "Squalane"; Argan Oil → "Argania Spinosa Kernel Oil"; etc.).
5. **The Ordinary all share a generic image** (site og:image was a shared default) — images were nulled,
   so cards show the flask placeholder. Get product-specific images (The Ordinary product page gallery,
   or OBF image_url where a real EAN exists).
6. Two cosmetic slug-derived names remain: "The Ordinary Glycolic Acid 7 Exfoliating Toner" (missing %),
   "The Ordinary Volufiline 92 Pal Isoleucine 1pct …".

## Useful facts
- Promotion pattern (run by the assistant via Supabase MCP): insert from `scraped_products` →
  `cached_products` only where `barcode ~ '^[0-9]{8,14}$'` AND INCI passes strict filter (reject
  `www.|http|köp|rabatt|kampanj|relaterade|recension|frakt|pris:|key ingredient|how to use|Discover|
  Build My Regimen|Product Details`), dedupe by barcode, `source` in (retailer|obf|user|chimiq).
- Placeholder barcodes use prefix `CHIMIQ_`; the app treats `barcode.startsWith("CHIMIQ_")` as
  "no real barcode" → shows the contribute/complete prompt.
- Search reads `cached_products` only (`artifacts/api-server/src/routes/products.ts`, `GET /products`).
- Key client file: `artifacts/skinscreen/src/components/ProductDetailSheet.tsx`.
- To scrape more The Ordinary / other brands, see the run commands in `docs/cursor-prompts/2026-06-08-SS-079-deploy.md`.

## Start by
Reproduce bug #1 (open a `CHIMIQ_` The Ordinary product in the app, enter a real EAN + paste INCI, hit
Spara produkten) and trace the failing request in `contribute.ts`; then design the "complete a
placeholder product" path. Confirm scope with Pia before changing the contribution data model.
