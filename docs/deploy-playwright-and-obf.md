# Deploy: Playwright + OBF-berikning på Stina

## Steg 1 — Skicka filer till Stina (kör på din Mac)
```bash
scp /Users/pia/PiasVentures/chimiq-code/patch_playwright.py ai_stina@Pias-Mac-mini.local:~/harvest/
scp /Users/pia/PiasVentures/chimiq-code/obf_enrich.py      ai_stina@Pias-Mac-mini.local:~/harvest/
```

## Steg 2 — SSH in till Stina
```bash
ssh ai_stina@Pias-Mac-mini.local
```

## Steg 3 — Installera Playwright (en gång, tar ~2 min)
```bash
pip install playwright --break-system-packages
playwright install chromium
```
Klart när du ser: `Chromium ... downloaded to ...`

## Steg 4 — Applicera Playwright-patchen på harvest.py
```bash
cd ~/harvest && source ~/.zprofile && python3 patch_playwright.py
```
Ska skriva: `✅ Klart — harvest.py uppdaterad med Playwright-variant`

## Steg 5 — Testa Playwright med 3 produkter
```bash
screen -S pwtest
source ~/.zprofile && python3 harvest.py --store kicks --filter serum --limit 3 --no-ollama --delay 3
```
- Ctrl+A, D för att detacha
- `screen -r pwtest` för att kolla resultat
- Förväntat: 3/3 sparade, inga timeouts

## Steg 6 — Kör OBF-berikning (hämtar INCI för ~200 produkter i staging)
```bash
screen -S obf
source ~/.zprofile && python3 obf_enrich.py
```
Tar ca 3–4 min (200 anrop × 1 sek delay). Inga API-kostnader.

## Steg 7 — Kör nästa skörd med Playwright (Apify används EJ längre)
```bash
screen -S skörd
source ~/.zprofile
python3 harvest.py --store kicks --filter moisturizer --limit 60 --no-ollama --delay 3
python3 harvest.py --store kicks --filter eye-cream   --limit 40 --no-ollama --delay 3
python3 harvest.py --store kicks --filter mask        --limit 40 --no-ollama --delay 3
```

---
**Notera:** Efter Playwright-patchen används Apify INTE längre. Budget-spenderingen på $8.17/$10 stannar där.

---

## Steg 8 — Lyko-skörd (ny butik med INCI!)

Lyko har INCI-ingredienser bakom en "Ingredienser"-flik — värt att köra!

### Skicka skript
```bash
scp /Users/pia/PiasVentures/chimiq-code/harvest_lyko.py ai_stina@Pias-Mac-mini.local:~/harvest/
```

### Kör på Stina
```bash
ssh ai_stina@Pias-Mac-mini.local
cd ~/harvest && source ~/.zprofile

# Testa 5 produkter:
python3 harvest_lyko.py --category serum --limit 5

# Full körning (kör i screen):
screen -S lyko
python3 harvest_lyko.py --category serum --limit 200
python3 harvest_lyko.py --category ansiktskram --limit 200
python3 harvest_lyko.py --category ansiktsrengoring --limit 150
python3 harvest_lyko.py --category toner --limit 100
# Ctrl+A, D för att detacha
```

### Tillgängliga kategorier
`serum`, `ansiktskram`, `ansiktsrengoring`, `toner`, `ogon`, `ansiktsolja`, `peeling`, `ansiktsmask`, `solskydd`

---

## Steg 9 — Apotea-skörd

Apotea är JS-renderad (kräver Playwright för allt, inkl. URL-discovery).

### Skicka skript
```bash
scp /Users/pia/PiasVentures/chimiq-code/harvest_apotea.py ai_stina@Pias-Mac-mini.local:~/harvest/
```

### Kör på Stina
```bash
# Testa 5 produkter:
python3 harvest_apotea.py --category serum --limit 5

# Full körning:
screen -S apotea
python3 harvest_apotea.py --category serum --limit 200
python3 harvest_apotea.py --category dagkram --limit 150
python3 harvest_apotea.py --category ansiktsrengoring --limit 150
```

### Tillgängliga kategorier
`serum`, `dagkram`, `nattkram`, `ansiktsrengoring`, `toner`, `ansiktsmask`, `ogonkram`, `solskydd`, `k-beauty`

---

## INCI API — ej värd att prenumerera
- Bara 43,920 produkter totalt, fortfarande i "growth phase"
- Ingen bulk-nedladdning — bara API-anrop per EAN
- Gratisnivån (20,000 req/mån) räcker för testning om vi vill prova
- Bättre strategi: scrapa Lyko + Apotea direkt
