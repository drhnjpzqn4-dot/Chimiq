# Chimiq harvest — briefing inför fortsättning

## Bakgrund
Vi bygger en produktskördare som hämtar hudvårdsprodukter från kicks.se (och framöver apotea.se) till Chimiq-appen. Stina (Mac mini M4, ai_stina@Pias-Mac-mini.local) är dedikerad skördemaskin. Skriptet `/Users/ai_stina/harvest/harvest.py` skriver till Supabase staging-tabellen `scraped_products`. Inget når live-appen utan manuell granskning.

## Vad som är gjort och fungerar
- `harvest.py` kör på Stina och skördar produkter med EAN + bild + pris ✅
- `--offset`-flagga tillagd (kan återuppta halvfärdiga körningar) ✅
- `fast_extract` omskriven: använder Apify CF_SCRAPER + proxy istället för direktanrop från Stinas IP (kicks.se blockerade IP:n) ✅
- `scrape_product` omskriven: använder CF_SCRAPER + JS istället för AI_SCRAPER (AI_SCRAPER fick timeout efter 3–5 anrop pga kicks.se rate-limiting) ✅
- 76 produkter i `scraped_products` (staging), 2 219 i `cached_products` (live, OBF-import) ✅

## Problem som INTE är lösta
- **APIFY_TOKEN saknas på Stina** — sätts inte permanent, försvinner mellan sessioner. Finns inte i `~/.zshrc` eller `~/.zprofile`. Måste sättas manuellt varje session eller läggas in permanent.
- **CF_SCRAPER-patchen är inte testad** — scrape_product är omskriven men en riktig batch har inte körts med den nya koden. Okänt om timeouts är lösta.
- **Staging-dashboard visar "Inga rader"** — buggen i `extractRows` (Supabase-svar tolkas fel) är fixad i koden men inte bekräftad fungera.
- **Apify-budget: $5 av $10 förbrukad** — bör räcka för tester och måttliga batchar, men inte för 300-produkt-körningar med dålig träff-ratio.

## Rekommenderad ordning imorgon

### Steg 1 — Sätt env-variabler permanent på Stina (2 min)
SSH in till Stina och kör:
```bash
echo 'export APIFY_TOKEN="din-token"' >> ~/.zprofile
echo 'export SUPABASE_URL="https://wzzoipnaucqxnasubljk.supabase.co"' >> ~/.zprofile
echo 'export SUPABASE_SERVICE_KEY="din-nyckel"' >> ~/.zprofile
source ~/.zprofile
env | grep -E "APIFY|SUPABASE"
```

### Steg 2 — Testa CF_SCRAPER-patchen (5 min)
```bash
cd ~/harvest
screen -S test
source ~/.zprofile && python3 harvest.py --store kicks --filter serum --limit 3 --no-ollama --delay 5
```
Ctrl+A, D för att detacha. Kolla efter 3–5 min med `screen -r test`.
- Om 3/3 lyckas utan timeout → CF_SCRAPER fungerar, kör stor batch
- Om timeouts kvarstår → installera Playwright lokalt på Stina (gratis, permanent fix)

### Steg 3a — Om CF_SCRAPER fungerar: kör 300-batch
```bash
screen -S natt
source ~/.zprofile
python3 harvest.py --store kicks --filter serum    --limit 60 --no-ollama --delay 5
python3 harvest.py --store kicks --filter spf      --limit 60 --no-ollama --delay 5
python3 harvest.py --store kicks --filter cleanser --limit 60 --no-ollama --delay 5
python3 harvest.py --store kicks --filter toner    --limit 40 --no-ollama --delay 5
python3 harvest.py --store kicks --filter booster  --limit 40 --no-ollama --delay 5
```

### Steg 3b — Om timeout kvarstår: installera Playwright (10 min)
Playwright kör en riktig Chrome-webbläsare — kicks.se kan inte skilja den från en människa. Gratis, obegränsat.
```bash
pip install playwright --break-system-packages
playwright install chromium
```
Sedan skriver vi om scrape_product att använda Playwright istället för Apify.

### Steg 4 — Fixa staging-dashboard
Dashboarden "Chimiq Staging Review" i Cowork visar "Inga rader" trots att data finns. Claude har uppdaterat extractRows-funktionen men det behöver bekräftas med en Reload.

## Teknisk arkitektur (snabbref)
- Stina: `~/harvest/harvest.py` — skördaren
- Supabase projekt: `wzzoipnaucqxnasubljk`
- Staging-tabell: `scraped_products` (76 rader)
- Live-tabell: `cached_products` (2 219 rader)
- Apify-actors: `ecomscrape~cloudflare-web-scraper-ppe` (CF_SCRAPER, allt nu)
- Screen-sessions: alltid använda `screen -S namn` för bakgrundskörningar
- Patch-filer skickas via `scp` från Mac till Stina (inte via SSH-inklistring)

## Om Playwright-vägen väljs
Playwright kör lokalt på Stina, kostar inget, och ser ut som en riktig människa för kicks.se. Kan kombineras med `playwright-stealth` för extra osynlighet. Kräver omskrivning av `scrape_product` (ca 30 raders kod, Claude kan göra det direkt).
