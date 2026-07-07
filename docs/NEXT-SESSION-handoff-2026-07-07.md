# Chimiq — handoff 2026-07-07 (SS-090/091)

Claude did four things this session. **Two are already live** (database). **Two need you to run
commands on your Mac** (code commit + one TestFlight build).

## ✅ Already live — nothing to do (Supabase writes take effect immediately)
1. **Store scans in Swedish shops now hit far more products.** Merged your June harvest
   (Lyko/Apotea/Kicks/The Ordinary) from the staging table into the live catalog.
   `cached_products`: 2 463 → **2 704** (476 retailer rows). Also cleaned 15 old rows where a Lyko
   review comment had been scraped as if it were the ingredient list.
2. **Encyclopedia data** lives in code, see below (ships with the backend commit).

## ⚠️ Needs you: commit + push the code (backend auto-deploys on Railway — NO TestFlight needed)
There's a leftover git lock from the sandbox. In Terminal:

```bash
cd ~/PiasVentures/chimiq-code
rm -f .git/index.lock                 # clear the stuck lock
git reset git 2>/dev/null || true     # unstage the stray 0-byte file named "git"
git add artifacts/ harvest_lyko.py skinscreen/DECISIONS.md docs/
git commit -m "SS-090/091/092: routine-check citation grounding; ingredient encyclopedia 88->130; square 1:1 product-image capture; Lyko scraper rewrite"
git push origin main
```
Railway rebuilds the backend automatically from `main`. That ships:
- **Routine-check citation fix (SS-090).** You asked "is the routine analysis real or a hallucination?"
  It IS real — it reads your actual saved products and sends real ingredient lists to Claude. The one
  weak spot: it used to let the AI invent its own research citations. Now it injects our curated,
  verified conflict database (same as the single-product analysis) and blanks any citation link that
  isn't from a trusted research domain (PubMed, DOI, ECHA, EUR-Lex…). No more made-up PubMed links.
- **Encyclopedia expansion (SS-091): 88 → 130 harmful ingredients**, each with name, risk, plain-language
  sv+en explanation and a real source. New: phthalates, Lilial & Zinc Pyrithione (EU-banned 2022), PFAS,
  hair-dye allergens (PPD), nail toxins (toluene, TPHP), synthetic musks, aluminium salts, boron
  (reprotoxic), illegal mercury lighteners, heavy-metal contaminants, and more.

## NEW (SS-092): square product-image frame + Lyko scraper rewrite
- **Square 1:1 packshot capture** (`ProductImageCapture.tsx`, `imageUtils.ts`, `i18n.tsx`): the front
  photo is now padded to a 1:1 white square (same format Lyko/Apotea/Kicks use — verified they all
  display 1:1 on white). Empty state shows a square frame with corner guides + hint "Center the
  product, fill the frame, plain background". Never crops the bottle; pads short edges white. OCR still
  runs on the full-res original. Ships in the **same TestFlight build** as the 2-photo flow below.
- **Lyko scraper rewrite** (`harvest_lyko.py`, runs on Stina): robust accordion open + waits for the
  INCI panel to actually fill + scoped extraction (no more whole-page fallback that leaked reviews).
  New diagnostic per line: `INCI:–(rubrik fanns)` = Lyko has no INCI for that product (enrich via OBF),
  vs a real miss. Old version saved in `_files-to-delete/`. Run the 5-item test first, send me counts.

## ⚠️ Needs you: the 2-photo add flow (your other request) — ONE TestFlight build
Good news: the "one front photo + one ingredients photo → save → analyze or add to routine" flow you
asked for was **already built** (commit `0c62760`, SS-083) but **never shipped to TestFlight**. That's
why it still felt clunky on your phone. To finally get it on the device:

```bash
cd ~/PiasVentures/chimiq-code \
  && rm -rf artifacts/skinscreen/dist \
            artifacts/skinscreen/mobile/capacitor/ios/App/App/public \
  && pnpm build:mobile \
  && cd artifacts/skinscreen/mobile/capacitor \
  && npx cap open ios
```
Then in Xcode: **Product → Archive → Distribute → TestFlight**.

## Left for a future round (noted, not blocking)
- **Lyko INCI scraper is weak** — only ~17 clean lists out of 434; the rest was page noise (Lyko hides
  INCI in a JS-expanded tab). Apotea/Kicks scraped much cleaner. A better Lyko pass would add a few
  hundred more products. Next harvest.
- **Full EU banned list (bilaga II, 1 600+ substances):** deliberately NOT dumped in — most are obscure
  industrial chemicals never used in cosmetics, and they'd bury the useful entries in noise. The curated
  130 covers what actually shows up in real products. Can add the full list as a separate searchable
  layer later if you want it.
