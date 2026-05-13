# Cimiq / SkinScreen — Beslutslogg

Cimiq är paraplyvarumärket. SkinScreen, HairScreen, MakeupScreen är produktlinjer.

**Numreringskonvention:** `BESLUT-SS-NNN` (chronologiskt, aldrig återanvänd nummer även om beslut ersätts).

**Status-fält:**
- **Aktiv** — fortfarande gällande
- **Reviderad** — uppdaterad sedan första versionen, men beslutet kvarstår i sin helhet
- **Ersatt av X** — superseded; det nya beslutet styr men det gamla är dokumenterat för historik
- **Historisk** — gällde då, gäller inte längre, men finns kvar för spårbarhet

**Backup-policy:** No-deletes. Tidigare versioner av denna fil sparas i `_archive/`. Reviderade/Ersatta/Historiska BESLUT flyttas (fulltext) till `_archive/DECISIONS_historical.md` och behåller kortform här som spårbarhetslänk.

> **Renumreringen 2026-05-03:** Den ursprungliga DECISIONS.md använde formatet `SS-BESLUT-NNN` (001-004). LOGGAR och projektets `CLAUDE.md` använde formatet `BESLUT-SS-NNN` med en överlappande men annan numrering. Detta dokument är nu konsoliderat. Översättningstabell finns i `BESLUT-MAPPING.md`. Snapshot av föregående version: `_archive/DECISIONS_pre-2026-05-03.md`.

---

## BESLUT-SS-001: Cimiq som varumärke, SkinScreen som första produkt
- **Datum:** 2026-03-28
- **Status:** Aktiv
- **Beslut:** Cimiq är säkrat varumärke och paraplynamn. Första produkt = SkinScreen. Senare: HairScreen, MakeupScreen.
- **Motivering:** Cimiq som umbrella ger expansionsmöjligheter utan att binda upp varumärket till bara hud. SkinScreen lanseras först eftersom skinmarknaden är störst och datan om ingrediensinteraktioner är tillgängligast.
- **Konsekvens:** Mappen heter `skinscreen/` (Buildathon-codename) men marknadsförs under `Cimiq`. CLAUDE.md hot cache reflekterar detta.
- **Källa:** CLAUDE.md hot cache, /Users/pia/PiasVentures/CLAUDE.md

## BESLUT-SS-002: Qwen 3:8b som dedikerad social media-agent (`chimiq-social`)
- **Datum:** 2026-04-14
- **Status:** Aktiv
- **Beslut:** Qwen 3:8b körs lokalt via Ollama som dedikerad social media-agent för Cimiq. Aktiveras med `ollama create chimiq-social -f Qwen_ChimiqSocial_Modelfile.txt`.
- **Motivering:**
  - Lokalt körd modell = ingen API-kostnad, full kontroll på prompt-tuning, ingen data lämnar Pias dator.
  - Qwen 3:8b är tillräckligt stark för strukturerat content (TikTok-script, captions, hashtags) men billig att köra.
  - Modelfile innehåller full brand voice + kemi-kunskap (8 farliga kombinationer) + 5 content-pelarna + TikTok-format-regler + output-schema.
- **Konsekvens:** Arkitektur: Cowork (strategi) → Claude Code (sub-agent-koordinering) → chimiq-social (produktion). Dokumenterat i `Qwen_ChimiqSocial_README.md`.
- **Källa:** LOGGAR/2026-04-14.md, skinscreen/Qwen_ChimiqSocial_Modelfile.txt
- **Tidigare nummer:** SS-BESLUT-002 (oförändrat)

## BESLUT-SS-003: TikTok-första content-strategi
- **Datum:** 2026-04-14
- **Status:** Aktiv
- **Beslut:** TikTok är primär kanal för SkinScreen launch. 20 första videos klara att producera (manus, bildanteckningar, CapCut-instruktioner, captions, thumbnails).
- **Motivering:**
  - TikTok är där skin-tok-publiken redan finns och letar efter ingredienskunskap.
  - Format passar Cimiqs styrka: visuella jämförelser, "ingrediens X + ingrediens Y = problem" hooks.
  - Mix av 5 content-pelarna säkerställer balans mellan utbildande och säljande.
- **Konsekvens:** `Chimiq_TikTok_20_Videos.md` skapat. Workflow: Cowork → Claude Code → Qwen → CapCut → TikTok. Pias roll: producerar (eller delegerar) videos enligt plan.
- **Källa:** LOGGAR/2026-04-14.md, skinscreen/Chimiq_TikTok_20_Videos.md
- **Tidigare nummer:** SS-BESLUT-003 (oförändrat)

## BESLUT-SS-004: Färghierarki — rosé-guld + lavendel primär, sage green sekundär
- **Status:** Reviderad — ersatt av **BESLUT-SS-015** (2026-05-11)
- **Flyttad till arkiv:** 2026-05-12 → `_archive/DECISIONS_historical.md`
- **Sammanfattning:** Originalbeslutet 2026-04-25 listade rosé-guld + lavendel som primärfärger med sage som sekundär. Verifiering av live-koden 2026-05-11 visade att lavendel aldrig importerades till CSS — sage är `--primary` i kod. BESLUT-SS-015 klargör verkligheten.
- **Fulltext:** Se `_archive/DECISIONS_historical.md`

## BESLUT-SS-005: Pre-computed knowledge layer + RAG-mönster för alla produkter
- **Datum:** 2026-04-26
- **Status:** Aktiv
- **Beslut:** Tre-lager-arkitektur används i alla Chimiq-produkter (SkinScreen, HairScreen, MakeupScreen) och i DoctorKompis (DinHälsodata).
  1. **Kunskapslager** (Supabase): pre-computed data + svenska förklaringar + citations. Genererat EN GÅNG av Claude Sonnet, sen permanent.
  2. **Sökning & svar** (Claude Haiku via Edge Function): cheap retrieval och formattering vid varje användarfråga.
  3. **Resonemang** (Claude Sonnet): endast för nya/okända fall. Resultatet sparas tillbaka i lager 1.
- **Konsekvenser:**
  - Kostnad växer logaritmiskt med katalogstorlek, inte linjärt med användartrafik
  - Samma motor återanvänds över alla 4 produkter (Skin/Hair/Makeup/DoctorKompis) — endast innehållet i kunskapslagret skiljer
  - Datapipelinen lever SEPARAT från användarappen (se BESLUT-SS-007)
- **Citation-krav:**
  - Chimiq: varje ingrediens måste ha källa (CosIng, PubChem, ECHA, PubMed). Visas för användaren.
  - DoctorKompis: STRÄNGARE krav. AI får ALDRIG generera medicinsk fakta. Källor: FASS, FASS Interaktion, Janusmed, SBU, Kloka Listan, Läkemedelsverket.
- **Källa:** LOGGAR/2026-04-26.md
- **Tidigare nummer:** BESLUT-SS-003 (i LOGGAR)

## BESLUT-SS-006: Bulk-generering av ingredienskatalog görs via API, inte via abonnemang
- **Datum:** 2026-04-26
- **Status:** Delvis ersatt av BESLUT-SS-011 (skip CosIng-bulkimport för 25k ingredienser; manuell utökning av curated TS-DB:er istället)
- **Beslut:** Claude-abonnemanget är byggt för konversation, inte för pipelines. Bulk-anrop kräver Anthropic Batch API + prompt caching.
- **Optimeringstekniker (kombinerade):**
  1. Prompt caching (~70–90% billigare input för system-prompt)
  2. Message Batches API (50% rabatt)
  3. Tier:ade modeller (Haiku 4.5 för triviala, Sonnet 4.6 för aktiva)
  4. Familjededuplicering via embeddings (25k → ~8k unika förklaringar)
  5. Output-cap 150 tokens
  6. Två-pass-strategi (Haiku klassificerar, Sonnet förklarar bara där det behövs)
  7. Template för helt triviala ingredienser (Aqua, Parfum)
- **Kostnadsestimat (då):** ~155 kr engångskostnad för full CosIng-katalog. Löpande drift ~0,01 kr/aktiv användare/månad.
- **Vad som ändrats:** EU CosIng-API är dött (verifierat 2026-05-03). Bulk-jobb mot 25 000 ingredienser har därmed marginell nytta. Vi pivoterar till curated-DB-utökning. Tekniken (Batch API, prompt caching, tier:ade modeller) återanvänds när vi gör bulk-svenska-översättningar i framtiden.
- **Källa:** LOGGAR/2026-04-26.md
- **Tidigare nummer:** BESLUT-SS-004 (i LOGGAR)

## BESLUT-SS-007: Datapipeline lever separat från app
- **Datum:** 2026-04-26
- **Status:** Aktiv (omdirigeras till Supabase via BESLUT-SS-010)
- **Beslut:** Pipeline körs i Cowork eller Claude Code (engångsjobb). Användarappen pratar BARA med databasen. Aldrig direkt med Claude för bulk.
- **Fördel:** Frontend kan bytas eller byggas om utan att röra datan. Datan kan uppdateras utan att röra appen.
- **Konsekvens efter BESLUT-SS-010:** Pipeline-mål blir Supabase EU-Frankfurt istället för Replit Postgres. Återanvänder `migration-kit/03_pipeline/bulk_populate.js` med uppdaterad target.
- **Källa:** LOGGAR/2026-04-26.md
- **Tidigare nummer:** BESLUT-SS-005 (i LOGGAR)

## BESLUT-SS-008: On-device tier som Lager 0
- **Datum:** 2026-04-26
- **Status:** Aktiv (planerad implementation Fas 4 av roadmap)
- **Beslut:** Lägg till en fjärde nivå i arkitekturen — användarens egen enhet ska göra så mycket arbete som möjligt.
- **Komponenter:**
  - **OCR:** Apple Vision Framework (iOS) / Google ML Kit (Android) — gratis, offline, sub-sekund
  - **Bundlad cache:** Top 200 vanligaste ingredienser ligger lokalt i appen → instant lookup utan nätverk
  - **On-device LLM:** Apple Intelligence Foundation Models (iOS 18+) och Gemini Nano (Android) för enkla förklaringar
  - **Server-fallback** endast för: nya ingredienser, komplex kombinationsanalys, äldre enheter utan AI-stöd
- **Strategiska konsekvenser:**
  - Privacy-vinst: speciellt kritiskt för DoctorKompis (medicinlistan lämnar aldrig telefonen)
  - Kostnadsmål: ~95% av frågor löses on-device → kostnaden växer logaritmiskt med katalogen
  - Latens: instant svar (ingen nätverksrundtur)
  - Offline: fungerar på tunnelbanan, utomlands, vid nätverksproblem
- **Tidsplan:**
  - Idag (Q2 2026): OCR + bundlad cache fungerar redan
  - Q4 2026: Apple Intelligence svenska förklaringar tillgängligt
  - 2027: Gemini Nano svenska + on-device kombinationsmotor
- **Implementation:** Tas in i FAS 4 av migrationsplanen (`Chimiq_Replit_Migration_Plan.md`).
- **Källa:** LOGGAR/2026-04-26.md
- **Tidigare nummer:** BESLUT-SS-006 (i LOGGAR)

## BESLUT-SS-009: Capacitor som native-paketering — ändring från Expo
- **Datum:** 2026-04-28
- **Status:** Aktiv
- **Beslut:** Vi byter teknisk paketeringsstrategi från React Native (Expo) till Capacitor. Webb-codebasen som byggts i Replit behålls och blir grunden för både webb-, iOS- och Android-versionen via Capacitors native-skal. Cursor blir primär utvecklingsmiljö framöver. GitHub-repo: `github.com/drhnjpzqn4-dot/Chimiq`.
- **Motivering:**
  - Replit-appen är nästan färdig och byggd som webb-codebase (PWA-baserad). Att skriva om i Expo skulle kosta veckor utan motsvarande nytta för MVP.
  - Capacitor lägger ett native-skal runt befintlig React-kod — en kodbas för webb + iOS + Android.
  - SkinScreens MVP-funktioner (kamera-OCR, ingrediens-lookup, kombinationsanalys, "min hylla") fungerar utmärkt i Capacitor-arkitekturen.
  - Lägre underhållsbörda för ett tvåpersonsteam — JavaScript/React istället för React Native-specifika quirks.
  - Capacitor är moget och används i tusentals produktionsappar.
- **Konsekvens — bra:**
  - Snabbare time-to-market: avsluta Replit, paketera, in i App Store / Play Store.
  - Webb-versionen blir kvar som landningssida/onboarding utan dubbelarbete.
  - Befintlig kod återanvänds rakt av — ingen UI-omskrivning.
- **Konsekvens — flaggas (svår att backa från):**
  - Framtida funktioner som AR-makeup-try-on, real-time avancerade kamerafilter eller djupa native-integrationer blir krångligare i Capacitor. Byte till Expo/native då = stor omskrivning.
  - Performance: Capacitor känns nästan som native, men inte 100%. Äldre Android-enheter kan ha längre starttider.
  - Apple-regel 4.2 ("Minimum Functionality"): SkinScreen klarar det med marginal, men UX MÅSTE kännas native för att inte avvisas i App Store-review.
- **Utvärderingspunkter — vi omprövar om:**
  1. Appen får 50k+ aktiva användare och konkurrerar på UX mot stora hudvårdsappar.
  2. Roadmapen kräver AR/avancerade kamerafunktioner som Capacitor inte stöder smidigt.
  3. Performance-klagomål dyker upp i recensioner.
- **Praktisk plan:** Stegen finns i CLAUDE.md (skinscreen/) under Roadmap.
- **Kopplade beslut:** Ersätter ursprungligt grundbeslut "App: React Native (Expo)" i tidig version av CLAUDE.md.
- **Källa:** Cowork-session 2026-04-28
- **Tidigare nummer:** SS-BESLUT-004 (i DECISIONS.md)

## BESLUT-SS-010: Migrera till Supabase EU-Frankfurt före betatest
- **Datum:** 2026-05-03 (reviderad samma dag — initialt utkast sa "stanna på Replit")
- **Status:** Aktiv
- **Beslut:** Replits managed Postgres + Replit Auth byts ut mot Supabase Postgres EU-Frankfurt + Supabase Auth, gradvis under vecka 2-5. Drizzle ORM behålls. Replit Storage / GCS för bilder behålls tills vidare. **Samma Supabase-org som DoctorKompis, separata projekt** (bekräftat 2026-05-03).
- **Motivering:**
  - **Vendor-portabilitet.** Replit har bytt affärsmodell flera gånger. Supabase är open-source under huven; värst-fall kan koden self-hostas (se BESLUT-SS-013).
  - **EU-data-residens (GDPR).** Pia är svensk, döttrarna kommer ha svenska användare 13–20 år, hudvårdsdata kan klassas som hälsodata-light. Supabase erbjuder Frankfurt-region. Replit hostar i USA.
  - **pgvector inbyggt.** Embeddings för fuzzy-matching (planerat sedan BESLUT-SS-005) fungerar out-of-the-box i Supabase.
  - **Migrationskostnad ökar exponentiellt med tiden.** Idag (1 användare) = ~4h. Om 6 mån = 2 dagar. Om 2 år = veckor.
  - **DoctorKompis-mönstret kan replikeras.** Auth-impl i DoctorKompis kan återanvändas direkt → FAS 3 (auth-byte, "kritiska fasen") blir betydligt mindre risk.
- **Konsekvens — bra:**
  - Ingen vendor-låsning. GDPR-kompatibel data-residens. pgvector tillgängligt direkt. Generös free-tier.
  - Vercel som hosting-mål framgent (matchar DoctorKompis-setup).
- **Konsekvens — flaggas:**
  - Auth-byte (Replit Auth → Supabase Auth) är största risken. Görs INNAN betatest.
  - Två vendors istället för en (Supabase + Vercel/Replit) = lite mer komplexitet.
- **Tidslinje:** Vecka 1 = curated TS-DB-utökning (vendor-neutralt). Vecka 2 = Supabase-projekt + schema-port. Vecka 3 = data-migration + pgvector. Vecka 4 = auth-byte. Vecka 5 = cutover.
- **Detaljerad plan:** `Chimiq_Supabase_Migration_Plan.md`
- **Kopplade beslut:**
  - Ersätter delvis BESLUT-SS-007: pipeline körs nu mot Supabase, inte Replit Postgres.
  - Återanvänder `migration-kit/03_pipeline/bulk_populate.js` med Supabase som mål.
  - `migration-kit/02_replit_fas1_agent_prompt.md` är obsolet (Replit byggde aldrig FAS 1) → arkiverat i `_archive/migration-kit/`.
- **Källa:** Cowork-session 2026-05-03, `LOGGAR/2026-05-03.md`
- **Tidigare nummer:** BESLUT-SS-007 (i LOGGAR/2026-05-03)

## BESLUT-SS-011: Skippa CosIng-bulkimport — fokus på curated TS-DB:er
- **Datum:** 2026-05-03
- **Status:** Aktiv
- **Beslut:** Vi importerar INTE EU CosIngs fulla 25 000-radskatalog. De 45 inbäddade auktoritativa entries i `seed-cosing.ts` täcker det som faktiskt syns i konsumenthudvård. Värdet ligger istället i att utöka `risky-ingredients.ts` (~30 → 80+), `conflict-pairs.ts` (13 → 30+), och `safe-ingredients.ts` (76 → 200+).
- **Motivering:**
  - EU CosIng-API:t är dött (båda URL:er i seed-skriptet returnerade fel 2026-05-03). EU flyttade portalen 2024.
  - 95%+ av CosIngs 25 000 entries är industrikemikalier som aldrig hamnar i en hudkräm. Marginalvärde ~ 0.
  - De 45 inbäddade entries täcker hela banned/restricted-listan som dyker upp i konsumentprodukter.
  - Open Beauty Facts ingredient-taxonomi (~5 000 entries) finns kvar som framtida upgrade-väg.
- **Konsekvens:**
  - 24h gratis Replit Agent-fönster används för curated TS-DB-utökning (vendor-neutralt, flyttar med till Supabase).
  - `Chimiq_Replit_Prompt_v3_Curated_DBs.md` skapad som copy-paste-prompt.
  - Delvis ersätter BESLUT-SS-006 (bulk via Batch API): tekniken sparas för framtida bulk-svenska-översättningar.
- **Källa:** Cowork-session 2026-05-03, `LOGGAR/2026-05-03.md`
- **Tidigare nummer:** BESLUT-SS-008 (i LOGGAR/2026-05-03)

## BESLUT-SS-012: Anti-hallucination-regel för citationer
- **Datum:** 2026-05-03
- **Status:** Aktiv
- **Beslut:** Curated DB-entries får INTE innehålla hallucinerade PubMed-PMID:er. Standard-prioritetsordning för citation-URL:
  1. Institutionell URL (SCCS, IARC, EFSA, FDA, EU-förordning) — alltid stabil och verifierbar
  2. PubMed-sök-URL: `https://pubmed.ncbi.nlm.nih.gov/?term=AUTHOR+TOPIC` — alltid giltig
  3. Specifik PMID — endast om 100% säker
  4. `// NEEDS_VERIFICATION`-kommentar för manuell uppföljning
- **Motivering:** LLM:er kan hitta på trovärdigt utseende PMID:er som inte existerar. Vi får INTE vilseleda användare med falska källor — det skadar trovärdigheten och kan klassas som vilseledande hälsoinformation.
- **Konsekvens:**
  - Replit Agent-prompten (`Chimiq_Replit_Prompt_v3_Curated_DBs.md`) instruerar uttryckligen om denna regel.
  - Befintliga PMID:er i `risky-ingredients.ts` och `conflict-pairs.ts` granskas i separat pass (KTH-systern).
- **Källa:** Cowork-session 2026-05-03, `LOGGAR/2026-05-03.md`
- **Tidigare nummer:** BESLUT-SS-009 (i LOGGAR/2026-05-03)

## BESLUT-SS-013: Self-host-readiness som design-constraint
- **Datum:** 2026-05-03
- **Status:** Aktiv
- **Beslut:** Vi undviker medvetet Supabase-specifika lock-in features där standard-Postgres räcker. Konkret:
  - Använd inte Supabase Realtime om vanlig polling/websocket räcker
  - Använd inte Supabase Edge Functions för affärslogik som kan ligga i api-servern
  - Auth-flöden ska kunna ersättas av annan OIDC-leverantör om nödvändigt
  - Keep schema-migration-historik i Drizzle (vendor-neutral) — INTE i Supabase migrations-systemet
- **Motivering:** Supabase är open-source men har lock-in i vissa managed features. Genom att begränsa oss till "Postgres + Auth + Storage" som är ren PostgREST/GoTrue-funktionalitet kan vi när som helst self-hosta eller migrera till annan Postgres-leverantör (Neon, Crunchy, RDS).
- **Konsekvens:**
  - Vissa Supabase-funktioner blir off-limits trots att de finns tillgängliga gratis
  - Migration till self-host eller annan provider blir alltid en option
  - Lite mer kod att skriva själv (men inte mycket — Postgres + standard-bibliotek räcker)
- **Källa:** Cowork-session 2026-05-03, bekräftat av Pia 2026-05-03

## BESLUT-SS-014: Embedding-leverantör för pgvector — Voyage AI voyage-4
- **Datum:** 2026-05-10
- **Status:** Aktiv
- **Beslut:** Vi använder **Voyage AI voyage-4** som embedding-modell för Chimiqs pgvector-setup i Supabase EU-Frankfurt. Separat `VOYAGE_API_KEY` skapas på voyageai.com.
- **Vad beslutet gäller:** Fuzzy matching av ingrediensnamn — hitta rätt ingrediens även vid felstavning eller ovanliga INCI-namn. Ingår i FAS 2 (data-migration + embeddings) enligt `Chimiq_Supabase_Migration_Plan.md`.

### Utredning (2026-05-10)

**Korrigering av felaktig info i task-beskrivningen:**
Anthropic äger INTE Voyage AI. Voyage AI köptes av **MongoDB** (inte Anthropic). Anthropic rekommenderar Voyage AI som föredragen partner och länkar till dem i sina embedding-docs — men det är två separata företag med separata API-konton och fakturering.

**Vad innebär det för Pia?**
- Inget Voyage-stöd inbyggt i Anthropic SDK eller Anthropic-faktura
- Kräver eget konto på voyageai.com + egen `VOYAGE_API_KEY` i miljövariablerna
- Kan däremot kombineras med befintligt Anthropic-konto utan konflikt

**Modellval — varför voyage-4 (inte lite, inte large):**

| Modell | Pris/MTok | Dimensioner | Kontext | Rekommenderas för |
|--------|-----------|-------------|---------|-------------------|
| voyage-4-lite | $0.02 | 1024 | 32K | Enkel engelska, hög volym |
| **voyage-4** | **$0.06** | **1024** | **32K** | **Generell + multilingual — vår nivå** |
| voyage-4-large | $0.12 | 1024 | 32K | Maxkvalitet, hög volym |

- **voyage-4** (mellannivå) ger bäst multilingual-kvalitet utan att betala för large
- Chimiq har en curaterad DB om ~80-200 ingredienser = ~10 000–50 000 tokens att embeda totalt
- **Gratis-tier: 200 miljoner tokens** för voyage-4-family — Chimiq överskrider aldrig denna gräns på lång tid
- Praktisk kostnad för FAS 2: **0 kr** (täcks av free tier)
- Voyage-4-serien (släppt jan 2026) har MoE-arkitektur och gemensamt embedding-space

**Varför inte OpenAI text-embedding-3:**
- Kräver separat OpenAI-konto + billing — en extra vendor-relation utan motiverat mervärde
- Voyage-4 är mer multilingual och ranked högre på MTEB multilingual benchmarks
- Anthropic rekommenderar explicit Voyage AI, inte OpenAI, för embedding + Claude-kombinationer

### Konsekvenser
- **Ny miljövariabel:** `VOYAGE_API_KEY` läggs till i Supabase Edge Function-konfigurationen och Vercel
- **Abstraktion (BESLUT-SS-013):** Embedding-anropet ska ligga i en egen funktion `embedText(text: string): Promise<number[]>` — byts ut om vi byter provider utan att röra annan kod
- **Supabase pgvector:** `ingredients`-tabellen får en kolumn `embedding vector(1024)` — matchar voyage-4s defaultdimensioner
- **FAS 2-tidslinje:** Kan påbörjas direkt. Steg: (1) skapa konto voyageai.com, (2) embed curated DB via pipeline-skript, (3) lagra i Supabase, (4) bygg sök-funktion i Edge Function

### Nästa konkreta steg
1. Pia skapar konto på [voyageai.com](https://www.voyageai.com) — tar 2 minuter
2. Kopiera API-nyckel → lägg in i Supabase Edge Function secrets + Vercel env vars
3. Uppdatera `Chimiq_Supabase_Migration_Plan.md` FAS 2 med embedding-steg
4. Skriv pipeline-skript (kan återanvända `migration-kit/03_pipeline/`) för att embeda `risky-ingredients.ts`, `conflict-pairs.ts`, `safe-ingredients.ts`

- **Källor:** [Anthropic Embeddings Docs](https://docs.claude.com/en/docs/build-with-claude/embeddings) · [Voyage AI Pricing](https://docs.voyageai.com/docs/pricing) · [Voyage AI Models](https://www.mongodb.com/docs/voyageai/models/)
- **Källa (session):** Scheduled task / Cowork 2026-05-10

## BESLUT-SS-015: Färgpalett-klargörande — lavendel borttaget, sage funktionell primär, rosé-guld brand-signature
- **Datum:** 2026-05-11
- **Status:** Aktiv (klargör BESLUT-SS-004, ersätter inte)
- **Bakgrund:** Vid djupanalys av live-appens kod (`artifacts/skinscreen/src/index.css`) 2026-05-11 verifierades att Replit-implementationen aldrig faktiskt importerade lavendel som CSS-variabel. Live-appen har sage som `--primary` och rosé-guld som accent. BESLUT-SS-004 listade lavendel som "sekundär primär" — i praktiken oanvänd.
- **Beslut:** Palett-hierarki klargjord till **5 färger** (lavendel borttaget):

  | Roll | Färg | Hex / HSL | Var det används |
  |---|---|---|---|
  | **Funktionell primär** | Sage Green | `#7BAF7A` / `hsl(119 26% 58%)` | CTA-knappar, links, active states, focus rings |
  | **Funktionell primär — text** | Sage Deep | `hsl(119 32% 30%)` | AA-säker text/ikoner på vit |
  | **Brand-signature** | Rosé-guld | `#C9967E` / `hsl(22 45% 65%)` | Logo, hero-rubriker, varma accent-kort |
  | **Premium-accent** | Gul/Guld | `#F4D8A2` → `#D29A55` (gradient) | Premium-kort, trial-CTA, billing-area |
  | **Bakgrund** | Cream | `#FAF6F2` + warm `#F5EFE8` | Standard sidbakgrund |
  | **Text + mörka kort** | Ink/Svart | `#1F1A17` + soft `#5E544C` | Body text, chat-card, AI-assistant |
  | ~~Lavendel~~ | ~~#C5A3C9~~ | — | **Borttagen — användes aldrig i kod** |

- **Konsekvenser:**
  - `artifacts/skinscreen/src/index.css` — ingen ändring krävs (live är redan rätt)
  - `remotion-cimiq/src/brand.ts` — uppdatera när Pia är klar med pågående Remotion-videos (brand.ts har lavendel i en tokens-fil; ta bort vid nästa video-pass)
  - Mockup-filer (UX_2026-05-11) — uppdaterad 2026-05-11
  - BESLUT-SS-004 markeras "Reviderad — se BESLUT-SS-015 för klargörande"
- **Källa:** Cowork-session 2026-05-11 eftermiddag, UX-djupanalys i `UX_2026-05-11/08-bonus-fynd-och-app-vs-web.md`

## BESLUT-SS-016: Top-bar redesign — logo + Chimiq vänster, varnings-slot höger
- **Datum:** 2026-05-11
- **Status:** Aktiv
- **Beslut:**
  - **Vänster:** logo-molekyl (`logotypes Chimiq/Chimiq logo/favicon/favicon.svg`) framför ord-märket "Chimiq". Logo ~22px hög, samma höjd som "C" i ord-märket.
  - **Höger:** reserverat slot för **varningstriangel** (lucide-react `<AlertTriangle />`, gul `#E0A042`). Visas BARA när det finns aktiv konflikt/recall på användarens hylla. Pulserar lätt för uppmärksamhet. Tap leder till `/app/shelf` eller relevant produkt. När inget — slot är tomt.
  - **Avatar borttagen från top-bar** — flyttas till Profile-tab där den hör hemma (redigerbar där).
  - Logo-källan i `logotypes Chimiq/Chimiq logo/` är single source of truth. När appen byggs i Cursor kopieras `favicon.svg` + `apple-touch-icon.png` till `artifacts/skinscreen/public/`.
- **Motivering:**
  - Top-bar har bara plats för 2 element. Avatar uppe ger ingen funktion (Profile-tab finns redan i nav).
  - Varningstriangel i top-bar är värdefull — användaren ser direkt att något kräver uppmärksamhet utan att behöva navigera.
  - Logo ökar brand-recall på varje skärm.
- **Konsekvenser:**
  - Komponenten `AppShell` i `artifacts/skinscreen/src/components/AppShell.tsx` ska uppdateras (header-sektion).
  - Ny komponent `<WarningIndicator />` som lyssnar på `/api/shelf/status` och visar triangeln vid `status === 'red'` eller batch-recall.
  - PWA-icons + Capacitor app-icons använder samma `favicon.svg` som master.
- **Implementation-plan:** Del av V2-sprint (bottom nav + top-bar refactor).
- **Källa:** Cowork-session 2026-05-11 eftermiddag, Pias direkt-feedback på mockup.

## BESLUT-SS-017: Community-tips ersätts av verifierad dermatolog-Q&A — dold tills aktiv
- **Datum:** 2026-05-11
- **Status:** Aktiv (UI dold tills vi har första dermatologen)
- **Bakgrund:** Nuvarande `Leaderboard.tsx` har "Best Tip of the Week"-mekanik med upvotes från användare. Discover-sidan har "Share a tip"-textarea + "Top tips"-feed. Pia identifierade credibility-risk: om okontrollerade tips från användare publiceras (även med upvotes) kan vi (a) sprida farlig information och (b) hållas juridiskt ansvariga, speciellt för minderåriga som ger eller följer dåliga råd.
- **Beslut:**
  - **Koncept-byte:** Istället för "Best Tip of the Week" från användare → **"Veckans fråga, besvarad"** av verifierad svensk dermatolog (eller forskare). Endast verifierade experter publicerar svar.
  - **UI-dölj-strategi:** Alla element som visar eller samlar in community-tips DÖLJS från UI tills första dermatolog är rekryterad och första content publicerad. Backend-mekaniken (tabeller, API:er) lämnas orörd för framtida återanvändning.
  - **Vad som ska döljas:**
    - "Share a tip"-textarea + "Top tips"-feed på Discover-sidan (`pages/app/Discover.tsx`)
    - "Best Tip of the Week"-sektionen på Leaderboard (`pages/app/Leaderboard.tsx`)
    - Eventuella "Share a DIY recipe"-länkar som leder till `RecipeSubmit.tsx` (DIY-recept behöver också pre-publish moderation)
  - **Placeholder copy där sektioner doldes (valfritt):** "Snart här: svenska hudläkare svarar på era frågor."
  - **Behåll synliga:** Hudläkare-sök (`FindDermatologist`), Discover Problems (kemikalie-DB), AI-chat (Premium), DIY-recept-bläddra (read-only kuraterade recept).
- **Långsiktigt:** När vi har 1+ verifierad dermatolog kan vi aktivera "Veckans fråga"-konceptet. Det blir en separat ny feature/route som ÅTERANVÄNDER befintlig leaderboard-API men med `verified_only`-filter på backend.
- **Rekrytering av dermatolog:** Separat track utanför teknisk roadmap. Pia tar in en svensk hudläkare (möjligen via Niclas Östlinds nätverk).
- **Konsekvens i V1-V6-planen:** En enkel "hide community-tips UI"-ändring läggs in i V1 eller V2 (snabbjobb, ~30 min Cursor-arbete).
- **Källa:** Cowork-session 2026-05-11 eftermiddag, Pias direkt-feedback efter djupanalys av Leaderboard.tsx.

## BESLUT-SS-018: Trial-längd 14 dagar (bekräftad)
- **Datum:** 2026-05-11
- **Status:** Aktiv
- **Beslut:** Premium-trial är **14 dagar** för alla nya användare. Inga kort krävs första 7 dagarna (sätts upp i Stripe-checkout-flödet).
- **Bakgrund:** Koden hade redan `TRIAL_DAYS = 14` i `hooks/useUserPlan.ts`. Pia övervägde att ändra till 7 dagar, men efter rekommendation från Claude (14 dagar = bättre konvertering, branschstandard för B2C-prenumerationsappar) bekräftades 14.
- **Konsekvens:** Inga kodändringar krävs. Marketing-copy och paywall-modaler ska visa "14 dagar fritt" konsekvent.
- **Källa:** Cowork-session 2026-05-11 eftermiddag, Pias direkt-bekräftelse.

## BESLUT-SS-019: Åldersgrupper i onboarding — medicinskt motiverade
- **Datum:** 2026-05-12
- **Status:** Aktiv
- **Beslut:** Onboarding frågar om ålder i 5 grupper baserade på när huden faktiskt förändras medicinskt:
  - **Under 18** — puberteten, ökad talgproduktion, akne vanligt, känslig för hormoner
  - **18–25** — huden fortfarande oljig/blandhy, akne kan kvarstå, börjar behöva mer fukt
  - **26–35** — huden börjar tappa elasticitet, first fine lines, mer återfuktning
  - **36–45** — kollagenproduktionen minskar märkbart, pigmentfläckar kan dyka upp
  - **46+** — klimakteriet påverkar huden kraftigt (torrhet, tunnare hud)
- **Bakgrund:** Tidigare förslag (13-15 / 16-19 / 20-29 / 30+) var inte medicinskt motiverade. Pia ville att förklaringstexterna visas i onboarding så användaren förstår varför vi frågar.
- **Konsekvens:** Onboarding-sprinten (V10) implementerar dessa grupper med förklaringstext under varje alternativ. Ingrediensvarningar och råd ska filtreras per åldersgrupp i backend.
- **Källa:** Cowork-session 2026-05-12, Pias beslut.

## BESLUT-SS-020: Dark chocolate `#2C1A0E` ersätter ink/svart
- **Datum:** 2026-05-12
- **Status:** Aktiv
- **Beslut:** CSS-variabeln `--ink` ersätts med `#2C1A0E` (varm mörk chokladbrun) i hela appen. Ersätter `#1F1A17` och alla hårdkodade svarta.
- **Motivering:** Ger varmare, brunare ton som harmonierar bättre med cream-bakgrunden och rose-gold-paletten. Ren svart sticker ut kallt mot de jordnära nyanserna.
- **Konsekvens:** Gäller `--ink` globalt. `--ink-soft` och `--line` kan justeras proportionellt om de behöver matchas.
- **Källa:** Cowork-session 2026-05-12, Pias önskan om varmare ton.

## BESLUT-SS-021: Indikator-ikonografi — boll vs triangel, färgsystem
- **Datum:** 2026-05-13
- **Status:** Aktiv
- **Beslut:** Varningssystemet i appen använder två distinkta ikoner med tre färglägen:

  | Ikon | Färg | Semantik |
  |---|---|---|
  | ● Boll | Grön `#5B8F5A` | Ingrediensen är ok |
  | ● Boll | Orange (amber) | Se upp med *hur* du använder — sol-exponering, känslig hud, dålig i vissa kombinationer |
  | ● Boll | Röd `#8E3A26` | Problematisk ingrediens — avråds |
  | ▲ Triangel | Röd text | Kombinationskonflikt — dessa produkter bör inte användas ihop |

- **Motivering:** Ikon-formen berättar *vad* problemet gäller: boll = problem med *denna ingrediens/produkt*, triangel = problem som uppstår *mellan* produkter i rutinen. Ingen amber-triangel — en konflikt är alltid röd. Orange boll täcker "Försiktig"-fallet (tidigare amber traffic-light).
- **Färgvärden (orange/amber):** `#8B6A1F` ikon/text på `#F0E2BC` bakgrund-pill (Forest + Clay amber).
- **Konsekvens:** Ersätter det tidigare traffic-light-systemet med `Check` / `AlertTriangle` / `Ban` (Lucide). `AlertTriangle` reserveras nu exklusivt för kombinationskonflikter. EU Safety Gate-recalls visas som röd boll på produktkortet + rött triangel-banner vid aktiv recall. All varningstext (oavsett ikon) är röd.
- **Källa:** Cowork-session 2026-05-13, Pias beslut.

---

## BESLUT-SS-022: Forest + Clay-palett + Source Serif + Inter
- **Datum:** 2026-05-13
- **Status:** Aktiv — ersätter färgvärdena i BESLUT-SS-015
- **Beslut:** Chimiq byter till Forest + Clay-paletten och Source Serif + Inter som typsnittstack.

  **Färgvärden (ersätter BESLUT-SS-015):**
  ```
  --rose-gold:        #B5705B   Logo, h1/h2-serif-rubriker, varma signatur-element
  --rose-gold-deep:   #8A4F3B   AA-säker text-version (links, headlines, aktiv tab)
  --sage:             #3C5C44   Funktionell primär — ALLA CTA-knappar, aktiva states
  --sage-deep:        #284430   Sage-text på cream (AA), hover, focus-ring
  --gold:             #BC8F3D   ENDAST Premium-accent (badge, paywall-CTA)
  --gold-soft:        #EEDFB8   Premium-bakgrund (subtilt)
  --cream:            #F1EFE8   Huvudbakgrund
  --cream-warm:       #E5E2D8   Sektioner, kort-bakgrund nivå 2
  --ink:              #2C1A0E   All body-text (dark chocolate, BESLUT-SS-020)
  --ink-soft:         #4D5450   Sekundär text, ikoner inaktiv
  --line:             #DDDAD0   Borders, dividers
  --green-soft:       #DCE7DC   Grön pill-bakgrund (trygg-indikator)
  --rose-soft:        #F2DECE   Rosa pill-bakgrund, kort B på Scan
  --amber-deep:       #8B6A1F   Orange varningsboll text/ikon (BESLUT-SS-021)
  --amber-soft:       #F0E2BC   Orange pill-bakgrund
  --red-deep:         #8E3A26   Röd varningsboll + triangel text/ikon
  --red-soft:         #EDD6CF   Röd pill-bakgrund
  ```

  **Typsnitt:**
  ```
  --font-serif: "Source Serif 4", "Iowan Old Style", Georgia, serif;
  --font-sans:  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  ```
  Google Fonts: lägg till `Source Serif 4` (weights 400, 500) och `Inter` (weights 400, 500, 600) i `index.html`.

- **Motivering:** "Intelligent natural, inte spa." Djup skogsgrön primär ger mer auktoritativ känsla än ljusgrönt. Clay/terrakotta är varmare than nuvarande rose-gold. Source Serif + Inter är cross-platform konsekventa (funkar lika bra på Android/Windows).
- **Konsekvens:** `index.css` CSS-variabelblock uppdateras i sin helhet. `remotion-cimiq/src/brand.ts` uppdateras separat. Alla Tailwind-tokens som refererar gamla sage/rose-gold-värden behöver kontrolleras.
- **Källa:** Cowork-session 2026-05-13, Pias godkännande av Design Reference.html Forest + Clay-preset.

---

*Senast uppdaterad: 2026-05-13 av Cowork (UX-redesign-session dag 3).*
