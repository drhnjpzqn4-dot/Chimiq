# Chimiq harvest — briefing 2026-06-08

## Status just nu

### Supabase staging (`scraped_products`)
| Källa | Rader (approx) | INCI-täckning |
|-------|----------------|---------------|
| kicks.se | ~249 | 17% |
| lyko.com | ~148+ | ~54% |
| **Totalt** | **~400+** | — |

### Live (`cached_products`)
2 227 rader — OBF-import, orört. Inget har mergeats.

---

## Vad som gjordes 2026-06-08

### Stora arkitekturändringen: sitemap-baserad URL-discovery

**Problemet vi löste:** Lyko renderar kategorisidor med JavaScript — SSR ger bara ~24
produkter per kategori (toppsäljare). Playwright hittade aldrig "Visa fler"-knappen
(JS-renderad, ej tillgänglig via Playwright). Flera försök misslyckades.

**Lösningen:** Lykos sitemap innehåller ALLA produkters URLs, uppdateras dagligen.

```
https://lyko.com/ext/sitemapindex.xml
  → sitemap-sv-1.xml … sitemap-sv-8.xml
  → 74 320 svenska URLs totalt
```

Sitemapen cacheas lokalt på Stina: `~/harvest/lyko_sitemap_cache.txt` (12h TTL).
Nästa körning laddar om cache om den är >12h gammal.

### Ny filtreringslogik: CATEGORY_FILTERS (nyckelordsmatchning)

**Viktigt att förstå:** Lykos sitemap-URLs är brand-first, INTE kategori-first:
```
✗ /sv/hudvard/ansikte/serum/product-name   ← finns ej i sitemapen
✓ /sv/algologie/ansiktsvard/serum          ← brand/algologie, kategori serum
✓ /sv/hickap/hudvard/serum                 ← brand/hickap, produkt heter "serum"
```

Prefixmatchning på kategori-sökvägar (gamla `CATEGORY_PATHS`) ger alltid 0 träffar.
Lösning: nyckelordsmatchning med include/exclude-listor (`CATEGORY_FILTERS`).

Exempel för serum:
```python
"serum": {
    "include": ["serum"],
    "exclude": ["body-serum", "/kropp/", "/har/", "brynserum", "/nagel/", "shampoo"]
}
```

Resultat efter fix: **2 154 serum-URLs** (från 0).

### OBS: Sitemapen innehåller både listsidor och produktsidor

Vissa URLs är brand+kategori-listsidor, inte individuella produktsidor:
```
https://lyko.com/sv/algologie/ansiktsvard/serum  ← listsida (alla Algologies serumer)
https://lyko.com/sv/algologie/ansiktsvard/algologie-anti-ageing-serum  ← produktsida
```

Listsidor ger `name="Serum", EAN=null, INCI=null`. Sparas med null-fält, kraschar ej.
Är acceptable noise — filtrera bort tomma poster vid analys.

### Nya kategorier tillagda

```python
CATEGORIES = [
    # Hudvård
    "serum", "dagkram", "nattkram", "ansiktsrengoring", "toner",
    "ogon", "ansiktsolja", "peeling", "ansiktsmask", "solskydd",
    # Dermatologisk (farmaceutiska märken: La Roche-Posay, CeraVe, ACO, Eucerin, Avène...)
    "derm-kram", "derm-rengoring", "derm-serum",
    # Smink
    "cc-bb", "foundation", "concealer", "contouring",
    "bronzer", "blush", "ogonskugga", "mascara",
]
```

Derm-kategorier filtrerar på brand-slugs: `la-roche-posay`, `cerave`, `eucerin`,
`avene`, `bioderma`, `vichy`, `uriage`, `svr`, `ducray`, `aco-`.

### Nattjobb igång (Stina)

```bash
screen -S lyko-natt
caffeinate -i python3 -c "
import subprocess, os
os.chdir('/Users/ai_stina/harvest')
cats = [
    ('serum',300),('dagkram',300),('nattkram',200),('ansiktsrengoring',200),
    ('toner',200),('ansiktsmask',200),('peeling',200),('ogon',200),
    ('ansiktsolja',100),('solskydd',200),
    ('derm-kram',300),('derm-rengoring',200),('derm-serum',200),
    ('cc-bb',150),('foundation',400),
    ('concealer',300),('bronzer',150),('blush',150),('ogonskugga',400),
    ('mascara',300),
]
for cat, lim in cats:
    print(f'\n=== {cat} ===', flush=True)
    subprocess.run(['python3','harvest_lyko.py','--category',cat,'--limit',str(lim)], check=False)
print('\n=== KLAR ===')
"
```

Koppla loss med `Ctrl+A D`. Visa resultat med `screen -r lyko-natt`.

---

## Teknisk snabbref

### Stina (Mac mini M4)
- Host: `ai_stina@Pias-Mac-mini.local`
- Harvest-mapp: `~/harvest/`
- Sitemap-cache: `~/harvest/lyko_sitemap_cache.txt` (12h TTL)
- SSH + scp från MacBook (ALDRIG scp från Stina-terminalen)
- Använd alltid `caffeinate -i` för nattjobb

### Filer (MacBook: `/Users/pia/PiasVentures/chimiq-code/`)
| Fil | Status | Källa |
|-----|--------|-------|
| `harvest_lyko.py` | ✅ Klar, testad | lyko.com |
| `harvest_apotea.py` | ⚠️ Skriven, ej testad | apotea.se |
| `harvest.py` | ✅ Klar (kicks.se) | kicks.se |

### Supabase
- Projekt: `wzzoipnaucqxnasubljk`
- Staging: `scraped_products`
- Live: `cached_products` (rör ej utan godkännande)

### Lyko sitemap
```
https://lyko.com/ext/sitemaps/sitemap-sv-{1..8}.xml
74 320 svenska URLs (per 2026-06-08)
```

### URL-kategorier i sitemapen (bekräftade träffar)
| Kategori | Antal URLs |
|----------|-----------|
| serum | ~2 154 |
| dagkram | okänt (ej testat ännu) |
| mascara | okänt |
| … | … |

Uppdatera tabellen efter nattjobb.

---

## Nästa steg

1. **Granska nattjobb-resultatet** — `screen -r lyko-natt` imorgon bitti
   - Hur många produkter per kategori?
   - Vilka kategorier gav 0 (filter behöver justeras)?
   - INCI-täckning?

2. **Finjustera CATEGORY_FILTERS** för kategorier med 0 träffar
   - Kör `grep -c "dagkram" ~/harvest/lyko_sitemap_cache.txt` för att testa
   - Justera include/exclude-nyckelord och scp ny fil till Stina

3. **Testa harvest_apotea.py** på Stina
   - Apotea = apotek → garanterad INCI (EU-krav)
   - Farmaceutiska märken som kompletterar derm-kategorierna

4. **Supabase backfill** av category-fältet för nya rader
   - Kördes för befintliga rader 2026-06-07 (SQL UPDATE baserat på source_url)
   - Nya rader från harvest_lyko.py sätter category automatiskt

5. **Merge staging → live** (deferred — behöver granskning)
