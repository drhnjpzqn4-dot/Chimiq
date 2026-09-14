# ADR 2026-09-14 — Var ska Chimiq bo? (hosting & skalning)

Status: **Förslag — väntar på Pias beslut**
Bakgrund: Railway-trialen gick ut, api-server stängdes av, appen blev obrukbar
(se `NEXT-SESSION-handoff-2026-09-14.md`).

## Det egentliga problemet
Inte "vilken hosting är billigast", utan att **appen är hårt bunden till en
leverantörsspecifik URL**:

- `src/lib/native.ts` → `NATIVE_API_BASE_URL = "https://workspaceapi-server-production-58f9.up.railway.app"`
- Den URL:en är **inbyggd i iOS-binären** (väg B, bundlat).

Byter vi backend-värd måste vi bygga om appen och gå via App Store-review igen.
Det är merarbetet vi vill bort ifrån.

## Beslut 1 (viktigast): egen domän framför backend
Lägg backend på **`api.chimiq.app`** och låt appen peka dit. Då blir varje
framtida flytt en DNS-ändring på 5 minuter i stället för en ny TestFlight-release.
Gör detta oavsett vilken värd vi väljer.

## Beslut 2: håll api-server som en vanlig container
Express-appen körs som en container mot valfri värd (Railway / Fly / Render /
Hetzner). Ingen leverantörsspecifik kod. Portabilitet = förhandlingsläge.

## Beslut 3: färre leverantörer
- Supabase (betalas redan): databas, auth **och storage** — filerna ligger redan
  i Supabase-bucketen `chimiq-uploads` (se `lib/objectStorage.ts`). Rättelse:
  `@google-cloud/storage` ligger kvar i `package.json` men används inte i koden
  — ta bort beroendet så ingen tror att det finns en GCS-faktura.
- Webben: Vercel Hobby **tillåter inte kommersiell användning** (fair use).
  Chimiq har Stripe → antingen Vercel Pro (20 USD/mån) eller Cloudflare Pages
  (gratis, kommersiellt OK) för en statisk SPA.

## Kostnadsbild
### ~1 000 kunder
| Post | USD/mån |
|---|---|
| Supabase Pro | 25 |
| api-server (Railway Hobby / Fly liten instans) | 2–5 |
| Webb (Cloudflare Pages 0 / Vercel Pro 20) | 0–20 |
| AI-anrop (med cache) | 20–60 |
| **Totalt** | **~50–110** |

### ~100 000 kunder
Hosting är fortfarande småpengar (~150–500). **AI-kostnaden per skanning är hela
skalningsfrågan:**

- Utan cache: ~1 M analyser/mån × ~0,02 USD ≈ **20 000 USD/mån**.
- Med delad analys per INCI-hash och 95 % träff: ≈ **1 000 USD/mån**.

Det vill säga: en produkt ska analyseras **en gång för alla användare**, aldrig
en gång per användare. Grunden finns redan (SS-081b "shared analysis persistence")
— den ska hårdras och mätas.

## Vad som faktiskt går sönder vid 100 000 (i ordning)
1. AI-kostnad per skanning (se ovan) — enda posten som kan bli farlig.
2. Bild-bandbredd: skala ner i telefonen före uppladdning, CDN framför storage.
3. Postgres-kopplingar: kör via Supabas poolern (transaction mode), inte direkta.
4. En enda API-instans: kör 2+ instanser. Appen är redan tillståndslös (JWT).
5. Supabase-plan: Pro → större compute-instans när den blir trång.

## Guardrails så det inte händer igen
- Leverantörslista med plan, kostnad och förnyelsedatum (nedan).
- Uppsatt hälsokoll mot `/api/health` som larmar när backend är nere.
- Budgetlarm hos varje leverantör.

## Leverantörer (fyll i och håll uppdaterad)
| Tjänst | Vad | Plan | Kostnad | Förnyas | Status |
|---|---|---|---|---|---|
| Supabase | DB, auth, storage | Pro | ~25 USD/mån | löpande | Betalas |
| Railway | api-server | Trial → **utgången** | — | — | **Nere** |
| Vercel | webben | Hobby (ej kommersiellt tillåtet) | 0 | — | Se över |
| Apple Developer | TestFlight/App Store | — | 99 USD/år | ? | ? |
| Websupport | domänen chimiq.app + DNS | — | ? | ? | Pias registrar |
| Anthropic / OpenAI | analys | pay-as-you-go | rörlig | — | ? |

---

## Tillägg 2026-09-14 — mätning av analys-cachen

Läst i Chimiq-prod (`public.analysis_cache`) och `src/lib/analysis-cache.ts`:

| Mått | Värde |
|---|---|
| Cache-poster | 49 |
| Totala användningar | 71 |
| **Träffprocent** | **31 %** |
| Distinkta hudprofiler i cachen | 1 |
| Data från | 2026-05-16 → 2026-06-22 |

Det som redan finns och är bra: normalisering av INCI (procent bortstädat,
parenteser bort, synonymtabell aqua→water, vitamin b3→niacinamide …), sorterad
ingredienslista före hashning, och Anthropic prompt-caching på systemprefixet.

### Strukturfelet: hudprofilen ingår i cache-nyckeln
```ts
const key = `${normalized}|||${skinProfile ?? ""}|||${productType ?? ""}|||single`;
```
Med fem hudtyper splittras cachen i fem delar. Samma produkt analyseras om från
noll för varje hudtyp — trots att kemin är identisk.

### Förslag: två lager
1. **Objektivt lager (dyrt, delat).** Vad produkten innehåller och vilka
   kombinationer som krockar. Identiskt för alla användare.
   Cache-nyckel = **enbart INCI-hash** (+ produkttyp). Analyseras en gång, för alltid.
2. **Personligt lager (billigt).** Vilka av fynden som lyfts fram för just den
   hudtypen och det hudmålet. Regelbaserat eller ett litet anrop — aldrig en ny
   fullanalys.

Effekt vid 100 000 användare: skillnaden mellan ~20 000 och ~1 000 USD/mån.

### Småfel att ta samtidigt
- `saveCacheEntry()` skriver `created_at: now` vid varje upsert → 180-dagars
  färskhetsklockan nollställs varje gång posten sparas om. Ska bara sättas vid insert.
- `app.ts` CORS: sista raden är `callback(null, origin)` — alla origins släpps
  igenom, trots att listan ser restriktiv ut. Med `credentials: true` är det
  slarvigt. Auth går på Bearer-JWT så risken är låg, men listan bör faktiskt gälla.

---

## Tillägg 2026-09-14 (2) — var kunskapen faktiskt bor

Mätt i Chimiq-prod:

| Tabell | Rader |
|---|---|
| cached_products | 2 704 |
| scraped_products | 2 008 |
| cached_pubchem | 367 |
| user_submitted_products | 36 |
| scan_events | 27 |
| users | 6 |
| recalls | **0** |
| cosing_ingredients | **0** |

Bilder ligger i Supabase Storage (`chimiq-uploads`). Google Cloud Storage används
**inte** — beroendet i package.json är dött och bör tas bort.

**Men själva kunskapen ligger i kod, inte i databasen:**
- `api-server/src/lib/conflict-pairs.ts` — 611 rader kurerade ingredienskonflikter
- `api-server/src/lib/risky-ingredients.ts` — 1 788 rader ingrediensencyklopedi
- `cosing_ingredients` (EU:s INCI-register) är en tom tabell som aldrig fylldes

### Konsekvens för agent-arbete
En agent som ska svara på kundfrågor behöver läsa konfliktdatan. Ligger den som
TypeScript kan bara den deployade API-servern använda den. Flyttas den till
Supabase blir den:
- läsbar för vilken agent/verktyg som helst,
- redigerbar utan ny deploy,
- sökbar med pgvector (RAG) i stället för nyckelordsmatchning.

Det, inte valet av hostingleverantör, är det som avgör om agent-funktioner blir bra.

## Beslutat och gjort 2026-09-14
- `NATIVE_API_BASE_URL` → `https://api.chimiq.app` (egen domän, DNS hos Websupport)
- `vercel.json` rewrite → `https://api.chimiq.app/api/:path*`
- `.env.production`: `VITE_API_URL` tömd — webben går via same-origin-rewriten
- `saveCacheEntry()` nollställer inte längre `created_at`
- CORS-listan i `app.ts` gäller på riktigt (+ `CORS_EXTRA_ORIGINS` som ventil)
- Daglig hälsokoll av backend uppsatt (07:00 svensk tid, push till Pia)

**Kvar innan detta fungerar:** välj värd, peka CNAME `api` hos Websupport dit,
lägg till domänen hos värden. Sedan commit + `pnpm build:mobile` + Xcode-arkiv.

---

## Beslut: värd = Railway Hobby

5 USD/mån inkl. 5 USD användning. Skälet är inte att den är bäst utan att den är
*tråkigast*: tjänsten finns redan uppsatt, ingenting behöver migreras, och med
`api.chimiq.app` framför är vi inte längre inlåsta — byter vi åsikt om ett halvår
är det en DNS-ändring, inte ett projekt. Fly.io blir aktuellt när crawlers behöver
egna muskler, inte tidigare.

## Etapp 1 KLAR 2026-09-14: kunskapen till Supabase

Migration `company_knowledge_ingredients_and_conflicts` körd mot Chimiq-prod:

- `public.ingredient_risks` — encyklopedin (nyckel, slug, kategori, allvarlighet,
  profilöverstyrningar, hint/hint_se, källa, alias, beskrivningar, commonIn)
- `public.ingredient_conflicts` — reaktionerna mellan ingredienser
  (sida A, sida B, allvarlighet, profilöverstyrningar, hint, källa)
- Extensions `vector` och `pg_trgm` påslagna. Båda tabellerna har en
  `embedding vector(1536)`-kolumn som står tom tills RAG byggs — då behövs
  ingen ny migration.
- GIN-index på alias och på båda konfliktsidorna; trigram-index på display
  för suddig INCI-matchning.
- RLS på utan policies = bara service_role (api-server) kommer åt. Ingen
  klient kan läsa tabellerna direkt.

Seedskript: `artifacts/api-server/scripts/seed-knowledge.ts` (idempotent upsert,
kollar dubbletter innan skrivning). Pia kör en gång från repo-roten:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  pnpm tsx artifacts/api-server/scripts/seed-knowledge.ts
```

TS-filerna ligger kvar tills etapp 2 kopplar in läsningen — inget kan gå sönder
av att tabellerna finns.

## Etapp 2: två lager + cache-nyckel (nästa pass)
Kräver att backend är uppe, för resultatet måste jämföras mot dagens svar.

1. `lib/knowledge.ts` läser från Supabase med minnescache, faller tillbaka på
   TS-filerna om tabellen är tom. TS-filerna tas bort först när utfallet är lika.
2. Cache-nyckeln: `skinProfile` UT ur hashen (`computeSingleHash`, `computeCompareHash`).
3. Lager 1 (objektivt) svarar med `relevantFör: {hudtyper, mål}` per fynd — data,
   inte prosa.
4. Lager 2 (personligt) filtrerar och rangordnar i kod. Etiketterna
   Granskad / Värt att veta / Granska noga sätts av kod, aldrig av modellen.
5. Promptgreppen: statiskt systemblock först med `cache_control`, normaliserad
   sorterad INCI som indata, kurerade fakta före modellen (`needsAnalysis` finns
   redan), kompakt JSON med korta nycklar, en cachebar analys per produkt vid
   hyllskanning.

**Verifieringskrav innan etapp 2 går ut:** kör 20 kända produkter genom både gamla
och nya vägen och jämför fynd och etiketter. Riskspråket från SS-081e får inte glida.

## Etapp 3: mätning på /admin
Ny panel på den befintliga admin-dashboarden (`pages/AdminPage.tsx`, som redan har
undersidor för users och funnel): cache-träffprocent per dag, AI-kostnad per dag
och per skanning, antal poster i kunskapstabellerna, backend-status.
Datan finns redan i `analysis_cache` (use_count, last_used_at) och `scan_events`.

---

## Byggfel 2026-09-14 15:15 — pnpm-versionen

Första deployen efter att Railway betalats föll med:

```
using build driver railpack-v0.39.0
↳ Detected Node  ↳ Using pnpm package manager  ↳ Found workspace with 9 packages
✖ Failed to resolve version 10.4.0 of pnpm
railpack prepare exited with an error
```

Två saker hade ändrats medan projektet stod stilla:

1. Railway bygger nu med **Railpack 0.39.0**, inte Nixpacks. Loggen säger
   "Found workspace with 9 packages" → bygget sker från repo-roten, vilket
   betyder att `artifacts/api-server/railway.toml` (`builder = "NIXPACKS"`) och
   `artifacts/api-server/nixpacks.toml` inte är i spel. Kontrollera tjänstens
   **Root Directory** i Railway.
2. Railpack kan inte längre lösa upp **pnpm 10.4.0** (samma fel drabbar yarn 1
   hos andra, se railwayapp/railpack#210). Versionen är från början av 2026.

**Åtgärd:** `packageManager` i rotens package.json bumpad `10.4.0` → `10.17.0`.
Samma major, och lockfilen är `lockfileVersion: '9.0'` som hela pnpm 10-serien
skriver — alltså ingen omskrivning av låsfilen. (Senaste pnpm är 12.4.1, men att
hoppa dit mitt i en incident vore att byta lockfile-format i onödan.)

**Reservplan om bygget faller igen:** sätt byggaren till Nixpacks i Railway
(Settings → Build → Builder) så återgår den till den väg som fungerade i juni.
