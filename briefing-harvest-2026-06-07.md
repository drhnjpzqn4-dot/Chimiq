# Chimiq harvest — briefing 2026-06-07 (uppdaterad kväll)

## Status just nu

### Supabase staging
| Källa | Rader | INCI-täckning |
|-------|-------|---------------|
| kicks.se (Playwright) | ~249 | 17% |
| lyko.com (Playwright) | **+94 nya** | ~54% |
| **Totalt staging** | **~343** | — |

### Live (cached_products)
2 227 rader — OBF-import, orört.

### Kvalitet per källa
| Fält | kicks.se | lyko.com |
|------|----------|----------|
| EAN | 84% | ~90% |
| Bild | 89% | ~100% |
| INCI | **17%** | **~54%** |

**Lyko är klart bättre INCI-källa** — tre gånger högre täckning än kicks.se.

---

## Vad som gjordes 2026-06-07

### Morgon: kicks.se-batch (Playwright)
- Playwright ersätter Apify (budget $8.17/$10 förbrukad — stannar där)
- 159/200 sparade: SPF (42), Cleanser (49), Toner (34), Booster (34)
- OBF-lookup: 0/175 träffar (OBF täcker inte hudvård)

### Kväll: Lyko-skörd (ny butik)
Lyko är server-side renderad (enkel URL-discovery) + Playwright för produktsidor.
Klickar "Ingredienser"-fliken automatiskt.

| Kategori | Sparade | EAN | INCI |
|----------|---------|-----|------|
| serum | 19+5 test | ~80% | ~63% |
| ansiktskram | 25 | ~92% | ~56% |
| ansiktsrengoring | 24 | ~92% | ~46% |
| toner | 26 | ~96% | ~54% |
| **Totalt** | **99** | | **~54%** |

**Begränsning:** Server-side rendering ger bara ~24 produkter/kategori (toppsäljare).
Lyko har totalt 15 649 hudvårdsprodukter — för fler behövs Playwright för URL-discovery också.

---

## INCI-täckning — varför inte 100%?

Lyko visar INCI bakom en "Ingredienser"-flik. Inklickning fungerar för ~54%.
De ~46% som saknar INCI beror troligen på:
- Produkter utan ingrediensflik (tillbehör, kit, set)
- Fliknamn som inte matchas (t.ex. andra språk)
- Lazy-loading som inte hunnit

**Lösning nästa steg:** Playwright med längre väntetid + fler selector-varianter.

---

## Nästa steg (prioritetsordning)

### 1. Fler Lyko-kategorier (hög prioritet)
Kör fler kategorier — solskydd och ögon har ofta komplett INCI:
```bash
python3 harvest_lyko.py --category solskydd --limit 100
python3 harvest_lyko.py --category ogon --limit 100
python3 harvest_lyko.py --category peeling --limit 100
python3 harvest_lyko.py --category ansiktsmask --limit 150
```

### 2. Lyko med Playwright URL-discovery (för full katalog)
Steg för att gå från ~24 → hundratals per kategori:
- Playwright scrollar kategorisidan, klickar "Visa fler"
- Samlar alla produktlänkar
- Samma produktsida-logik som nu

### 3. Apotea (apotek → INCI är obligatorisk på EU-förpackningar)
`harvest_apotea.py` klar, ej testad ännu.
Apotea är JS-renderad (Playwright för allt). Bra källa för:
- Farmaceutiska märken (La Roche-Posay, CeraVe, ACO, Eucerin)
- Garanterad INCI-täckning (apotek måste lista ingredienser)

### 4. Merge till live
Kör merge-skriptet för granskade staging-produkter.
Inget ska mergeas utan godkännande.

---

## Teknisk snabbref
- Stina: `~/harvest/` — alla skördare
- `harvest.py` — kicks.se (Playwright, Apify används EJ längre)
- `harvest_lyko.py` — lyko.com (ny, testad, fungerar)
- `harvest_apotea.py` — apotea.se (ny, ej testad ännu)
- Supabase projekt: `wzzoipnaucqxnasubljk`
- Staging: `scraped_products` (~343 rader)
- Live: `cached_products` (2 227 rader)
- Apify-budget: **$8.17/$10 — fryst, används ej**
