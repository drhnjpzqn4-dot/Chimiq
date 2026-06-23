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
- **Datum:** 2026-05-12 (profil-tillägg dokumenterat 2026-05-14)
- **Status:** Aktiv — reviderad 2026-05-14 (profil + mål)
- **Beslut (onboarding, oförändrat innehåll):** Onboarding frågar om ålder i 5 grupper baserade på när huden faktiskt förändras medicinskt:
  - **Under 18** — puberteten, ökad talgproduktion, akne vanligt, känslig för hormoner
  - **18–25** — huden fortfarande oljig/blandhy, akne kan kvarstå, börjar behöva mer fukt
  - **26–35** — huden börjar tappa elasticitet, first fine lines, mer återfuktning
  - **36–45** — kollagenproduktionen minskar märkbart, pigmentfläckar kan dyka upp
  - **46+** — klimakteriet påverkar huden kraftigt (torrhet, tunnare hud)
- **Bakgrund (onboarding):** Tidigare förslag (13-15 / 16-19 / 20-29 / 30+) var inte medicinskt motiverade. Pia ville att förklaringstexterna visas i onboarding så användaren förstår varför vi frågar.
- **Konsekvens (onboarding):** Onboarding-sprinten (V10) implementerar dessa grupper med förklaringstext under varje alternativ. Ingrediensvarningar och råd ska filtreras per åldersgrupp i backend.
- **Tillägg 2026-05-14 — profil (SkinScreen):** Utöver hudtyp (`skinscreen.skinProfile`, oförändrat för skanner-backend) ska **Profil** även samla **åldersgrupp** och **hudvårdsmål (fritext)** så att vi kan testa copy och framtida personalisering utan att röra skannerns localStorage-nyckel.
  - **UI:** `artifacts/skinscreen/src/components/SkinProfileChips.tsx` — sektioner *Ålder* (chip-val) och *Mitt mål* (textarea, max 200 tecken), efter befintliga hudtyp-chips.
  - **Buckets i profilen (Fas 1):** `13-15` | `16-17` | `18-20` | `21+` — tonårsnära uppdelning för målgruppen 13–20 och snabb iteration i UI; **ej** samma indelning som onboarding ovan. I **Fas 2 (Supabase-sync)** ska en gemensam användarprofil-modell slå ihop eller mappa dessa fält mot onboarding-grupperna så vi inte bygger två sanningar långsiktigt.
  - **Lagring (Fas 1):** `localStorage`-nycklar `chimiq.ageGroup` respektive `chimiq.skinGoal` (trimmat; tom värde = nyckeln tas bort). Ingen API-trafik i detta steg.
- **Källa:** Cowork-session 2026-05-12 (onboarding); Cursor-implementering + Pia 2026-05-14 (profil).

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

### SS-070 — 2026-05-18 — Kategoriikoner i produktlistan
I `<ProductListRow>` visas en slot-ikon (Sun/Moon/CalendarDays/Bookmark/Package)
baserat på `routineSlot`-prop. Ikonen ger visuell kontext utan extra text.

### SS-071 — 2026-05-18 — Design system etablerat
Tre-lagers arkitektur: Atomer (CSS `@layer components`) / Molekyler (React-komponenter) / Organismer.
Canonical CSS i `src/index.css`. Canonical typer i `src/types/design-system.ts`.
Nya gemensamma komponenter: `StatusBadge`, `ProductListRow`, `SectionHeader`.
`VerdictPill` i Home.tsx borttagen — ersatt av `<StatusBadge status={toStatusLevel(...)}>`.
`IngredientStatusLevel` är nu ett alias för `StatusLevel` (bakåtkompatibelt).
Regel: duplicera aldrig UI — extrahera till `/components/` och kalla på komponenten.

### SS-072 — 2026-05-18 — Sparad produktanalys på hyllrader
`shelf_products.analysis_result_json JSONB` ska finnas i Supabase och läggs via SQL-editor:
`ALTER TABLE shelf_products ADD COLUMN IF NOT EXISTS analysis_result_json JSONB;`.
Hyll-API:t returnerar fältet som `analysisResultJson` och PATCH `/api/shelf/:id` kan spara ny analys per shelf-rad.

### SS-075 — 2026-06-02 — Ett produktkort: ta bort mellansteget (ProductCapture-analysen)
Forts. på SS-074. `ProductCapture` ska sluta vara ett eget mini-kort med inline-analys ("Säker") +
"Spara i min rutin"/"Bidra till databasen". Den blir ett rent insamlingsformulär som lämnar över ett
komplett `ProductResult` (inkl. bild + produkttyp + varumärke + streckkod) till `ProductDetailSheet`
— det enda produktkortet, där analys, bild och bidrag till databasen sker. Fixar även
`isNotInDb`-logiken i `ProductDetailSheet` (rad ~308) så att skannade-men-okända produkter som HAR
streckkod också får den gyllene "Bidra till databasen"-CTA:n (ny `inCache`-flagga). Upptäckt vid
Pias butikstest av Isadora CC+ Cream (EAN 7333352079039).
Full spec: `docs/cursor-prompts/2026-06-02-SS-075-one-card-no-intermediate.md`.

---

### SS-076 — 2026-06-02 — Forskningsreferenser i PDF + vision "filtrera fram det säkra"
Diskussion med Pia. Två spår:

**A. Forskningsreferenser (nära klart).** Citat-data finns redan end-to-end: `analyze`-API:t
returnerar `citation` + `citationUrl` för både konflikter och flaggade ingredienser; Upptäck →
ingredienslexikon (`DiscoverDetail.tsx`) renderar redan källänkar. ENDA luckan: PDF-rapporten
(`Report.tsx`, browser-print) skriver INTE ut källorna trots att datan finns i analysresultatet.
→ Åtgärd: rendera `citation`/`citationUrl` för konflikter + kombinationer i Report.tsx (yt-ändring,
ingen ny data). Översättning av ingrediens-/säkerhetstext SE finns redan på roadmap (idag engelska ok).
✅ KLART 2026-06-02: `CitationLine`-komponent tillagd i Report.tsx; renderar "Källa: …" med klickbar
DOI/PubMed-länk under varje flaggad ingrediens OCH varje konflikt/kombination. tsc rent. Äldre sparade
analyser utan citat döljer raden tyst (graceful).

**B. Vision: kunskapsdriven filtrering ("välj bara bland det säkra").** Mål: SPF-säkra
alternativ-ingredienser, sök DB på ingrediens-säkerhet, ranka solskydd låg→hög risk, filter
"visa bara säkra produkter". Bygger vidare på befintligt: `suggest-alternatives`-route +
`safe-ingredients.ts` / `risky-ingredients.ts` / `conflict-pairs.ts`. Långsiktigt samma motor
applicerad bredare (skincare → kläder/material → mat). Ej beslutat scope/ordning — väntar på Pias svar.

---

### SS-077 — 2026-06-02 — Nattlig lokal-AI-verifiering + retailer-scraping ("scraping for value")
**Status:** Beslutad — implementeras när Mac mini + Ollama/Qwen-setup är på plats.

**Beslut:** När en produkt inte finns i `cached_products` (okänd streckkod ELLER bara namn-sök),
ska systemet försöka *berika* den automatiskt istället för att lägga hela bördan på användaren:

1. **Synkron berikning vid scan/sök:** OBF (Open Beauty Facts) först → därefter retailer-scraping
   (Apotea, Kicks; senare Lyko/Hudoteket) på EAN eller namn. Hittas ingredienslista/bild →
   förifyll produktkortet, användaren bekräftar bara. Löser bl.a. "runda flaskor går inte att
   fota"-problemet eftersom listan hämtas från källan istället för kameran.
2. **Nattlig batch (lokal AI):** Mac mini med Ollama + Qwen (jfr SS-002 chimiq-social) kör ett
   cron-jobb som för varje overifierad användarinmatning söker OBF + retailers, jämför
   ingredienslistan, och:
   - matchar mot betrodd källa inom tolerans → **auto-godkänn** till `cached_products`
     (uppdatera ingredienser/bild, invalidera analyscache enl. SS-074).
   - kan inte verifieras → skicka till **admin-kö**.
3. **Admin endast för det som INTE kan agent-verifieras.** Bygger på befintlig `autoApprove`-
   heuristik i `contribute.ts` (~rad 87–111). Tidigare gick ALLA tillägg via admin — det togs bort
   (ologiskt för kunden). SS-077 formaliserar: admin = sista utväg, inte default.

**Befintligt att återanvända (INTE bygga om):** Kicks- och Apotea-scrapers skrevs 2026-06-01
(föregående session). De ligger INTE i `chimiq-code`-repot — måste lokaliseras (troligen
`PiasVentures/Cimiq/` eller tidigare Cowork-output) och wire:as in i berikningssteget. OBF-
barcode-lookup finns redan (`barcode-lookup.ts`); INCI-parsing hanterar redan Apotea-formatet
(mellanslags-separerad INCI, `sanitize.ts` rad ~145, commit 5d4bfbe).

**Att tänka på (icke-uppenbart, flaggat för Pia):**
- Vision behövs för att läsa retailer-*sidor*/runda flaskor → text-only Qwen räcker inte; använd
  Qwen2-VL eller behåll on-device-OCR (Apple Vision, SS-008). Text-Qwen räcker för INCI-jämförelse.
- Mac mini hemma = perfekt för nattbatch men single point of failure → den *synkrona* live-
  berikningen vid scan bör vara alltid-på/molnfallback, inte bero på hemmaservern.
- Scraping har ToS/robots-juridik → OBF (öppen data) först, cacha resultat, attributera källa.

**Nästa steg:** (a) lokalisera + länka scrapers, (b) sätt upp Mac mini + Ollama/Qwen,
(c) implementera berikningssteg + nattbatch. Påminnelse satt till 2026-06-06 om ej gjort.

---

### SS-078 — 2026-06-02 — Smart capture (en bild → allt) + ingrediens-fullständighetskoll
Från Pias andra TestFlight-test (2026-06-02). Tre småfixar **gjorda + tsc rent**:
1. **Bullet-INCI gav 400** (L'Oréal Lumi Glotion `AQUA • GLYCERIN • …`). `sanitizeIngredients`
   normaliserar nu `• · ∙ ● ▪ ‣ ・ ･ |` → komma före tokenisering (slash `/` lämnas).
   `artifacts/api-server/src/lib/sanitize.ts`.
2. **Dubbel "Lägg till i rutin"** — tog bort CTA-radens dubblett; kvar är knappen med slot-väljaren
   (morgon/kväll/ibland). `ProductDetailSheet.tsx`.
3. **Streckkods-skanning saknades i "Senaste skanningar"** — `handleScanResult` registrerar nu
   produkten i recents redan när kortet öppnas (inte bara vid cachad analys). `Scan.tsx`.

Större spår (specat, ej byggt) — `docs/cursor-prompts/2026-06-02-SS-078-smart-capture-and-completeness.md`:
- **Smart capture:** max två foton (fram/bak) → AI extraherar namn, varumärke, bild, ingredienser
  OCH EAN-streckkod via ny `/api/extract/label` (återanvänd vision-pipelinen i `contribute.ts`).
  Slut på separat namnfoto och manuell EAN-inknappning. Berikning (SS-077) körs först när streckkod
  finns → runda flaskor slipper baksidesbild. Kräver vision-modell (Qwen2-VL lokalt / Anthropic i
  moln / Apple Vision on-device).
- **Fullständighetskoll:** mjuk bekräftelse före analys om foto-/OCR-listan ser avklippt ut
  (slutar mitt i ord, saknar konserveringsmedel trots många tokens, ovanligt få tokens). Inte
  blockerande — falska positiva ska gå att klicka förbi.

---

### SS-079 — 2026-06-08 — TestFlight-test (ACO Spotless): databas-diagnos + 4 fixar

Pia testade att lägga till två ACO Spotless-produkter i iOS-appen och rapporterade 5 problem.
Diagnos kördes direkt mot `Chimiq-prod` (Supabase `wzzoipnaucqxnasubljk`). **Inget var förlorat** —
scraping landar i Supabase och hennes produkter sparades (med bild).

**Grundorsak (förklarar #3 + #5): två produkttabeller, appen söker bara i en.**
- `cached_products` (2 227 rader) = den live, *sökbara* katalogen. Nyaste rad: 26 maj.
- `scraped_products` (1 266 rader) = staging där veckans Lyko/Kicks-scraping hamnar. 1 262 var
  fortfarande `unmatched` — aldrig promotade till live. Appen kan alltså inte se veckans arbete.
- Tillagda produkter skrevs bara till `shelf_products` (privat hylla), inte till katalogen →
  syns under "Senaste skanningar" men inte i sök.

**Lyko-scrapern var trasig (viktigast).** `harvest_lyko.py` `isInci()` valde det DOM-element med
flest kommatecken + ett ingrediensord — på Lyko fångade den **kundrecensioner och kampanjbanners**
("Inlägget skapades 1 vecka", "Betyg: 5 av 5", "25% på utvalda brands"). 398 av 403 promotbara
Lyko-rader var skräp. Endast 13 rena INCI-listor fanns totalt — alla från Kicks.
→ **Åtgärd:** hårdare validator i `harvest_lyko.py` som REJEKTERAR prosa/kampanj/recensioner och
kräver list-struktur. Hellre tom ingredienslista (kan berikas via OBF/EAN) än fel lista (förgiftar
all analys). **OBS:** om Lyko inte exponerar INCI i DOM:en alls returnerar den nu *ingenting* —
då är Lykos värde EAN+namn+bild för OBF-berikning (SS-077), och Kicks är källan för direkt INCI.

**Gjort denna session:**
1. **DB-promotering:** 13 verifierat rena Kicks-produkter flyttade `scraped_products` → `cached_products`
   (source='retailer'), staging-rader markerade `merged`. Resten INTE promoterade (skräp/saknar INCI).
2. **#4 — analys sparas inte (FIXAT):** `ProductDetailSheet.handleAnalyze` persisterade bara om
   `product.shelfId` var satt — men vid spara-av-skanning hamnar nya id:t i `localShelfId` medan
   `product.shelfId` förblir undefined, så varje nysparad skanning tappade analysen. Bytt till
   `effectiveShelfId`.
3. **#3 — tillagt blir sökbart (FIXAT):** spara-flödet (`handleSaveToShelf`/`handleAddToRoutine`)
   anropar nu `/api/contribute/manual` när produkten har riktig streckkod + ingredienser och saknas
   i katalogen. Den endpointen upsertar redan `cached_products` (source='user') = **auto-godkänn
   om konsekvent** (Pias beslut). Inloggade endast (endpointen kräver auth). Server: `contribute.ts`
   tar nu emot `imageUrl` så katalog-kortet behåller bilden.
4. **#2 — runda flaskor (FIXAT):** `IngredientsCapture` visar en mjuk, stängbar notis efter foto-OCR
   ("kontrollera att HELA listan kom med — runda/böjda flaskor tappar kanterna"). Icke-blockerande,
   textrutan är redigerbar (precis som Pia bekräftade fungerar).
5. **Flag-knapp (FIXAT):** "Rapportera felaktig info" i produktkortet → befintlig
   `POST /api/products/:barcode/report` (`product_reports`-tabellen fanns redan).

**#1 (en bild → namn+märke+bild+ingredienser, SS-078) — EJ byggt.** Större vision-pipeline-feature;
kräver vision-endpoint (Qwen2-VL/Anthropic/Apple Vision). Kvarstår som separat bygge.

**Verifierat:** `tsc --noEmit` rent i både `api-server` och `skinscreen`.

**Ändrade filer:** `harvest_lyko.py`, `artifacts/api-server/src/routes/contribute.ts`,
`artifacts/skinscreen/src/components/ProductDetailSheet.tsx`,
`artifacts/skinscreen/src/components/IngredientsCapture.tsx`.

**Att göra (Pia):** (a) stoppa pågående Lyko-scrape, (b) `scp` nya `harvest_lyko.py` till Stina,
(c) commit + push + deploy api-server (server-delen av #3 kräver deploy), (d) rebuilda iOS i Xcode
för klient-fixarna. Öppen fråga: kan Lyko-INCI extraheras alls, eller ska vi gå helt på OBF-by-EAN?

---

### SS-080 — 2026-06-08 (kväll) — Katalogpåfyllning: Apotea + OBF + The Ordinary

Fortsättning samma dag. Mål: fylla `cached_products` med riktig produktdata inför svensk lansering.

**Resultat:** katalog 2 227 → **2 466 produkter**. Allt promoterat genom strikt INCI-filter
(barcode + validerad INCI, avvisar prosa/kampanj/relaterade-varor/recensioner).

**Skrapor (kör på Stina, ligger i repo-roten):**
- `harvest_apotea.py` — **omskriven till sitemap-baserad URL-discovery** (sitemap-products-1/2)
  + strikt INCI-validator + produktgrind (LD Product/EAN). Tidigare crawlade den kategorisidans
  länkar → fångade landningssidor ("Veckans kampanjer"). Nu: 555 EAN, ~186 rena INCI per körning.
  **Apotea är primärkällan** (CeraVe, La Roche-Posay, Eucerin, Lumene, NIVEA, COSRX m.fl. rena).
- `harvest_lyko.py` — härdad, men **Lyko exponerar inte INCI i DOM** → 642 rader, 0 rena. **Pensionerad.**
- `harvest_obf.py` (NY) — importerar HELA varumärken från Open Beauty Facts per brand-tag (EAN+INCI).
  Använd för märken som saknar EAN i butik. OBF är tunt för The Ordinary (~16 poster).
- `harvest_theordinary.py` (NY) — Playwright mot theordinary.com (SFCC), sitemap-en_SE.xml (~94 prod),
  expanderar "view all ingredients", strikt INCI. Märket saknar EAN på sajten → stagas utan barcode.

**Promoterat:** 13 Kicks (morgon-sessionen), 176 Apotea, 5 OBF The Ordinary (riktig EAN, scanbara),
samt The Ordinary från sajten **search-only med platshållar-barcode** `CHIMIQ_<md5>`. Pias beslut:
spara dem search-only och be användaren komplettera EAN vid uppslag (befintligt isNotInDb-flöde).

**TestFlight-test (Pia, kväll) — kvarstående buggar (NÄSTA SESSION):**
1. **Komplettera-produkt-flödet trasigt för CHIMIQ_-produkter.** I produktkortet: ingen kamera för
   att foto-skanna ingredienser (bara textarea — IngredientsCapture med kamera finns bara i
   ScanEntry/ContributeModal), ingrediensfältet förifyllt med beskrivningstext, och "Spara produkten"
   ger "Inskickning misslyckades". Trolig orsak: `/contribute/manual` avvisar CHIMIQ_-barcode
   (`isValidGtin`-refine → 400); tomt EAN + tom INCI → refine kräver minst ett → 400. Motsägande
   "Tack! Vi sparade din komplettering" visas samtidigt.
2. **Enkelingrediens-produkter** ("The Ordinary 100% ... Oil/Squalane") — skrapan tog beskrivningstext
   istället för den enrads-INCI. 12 sådana raderades ur katalogen denna kväll (fel INCI = fel analys).
   Behöver enkelingrediens-hantering (eller känt INCI-värde).
3. **The Ordinary delar generisk bild** (sajtens og:image var samma default). Bilderna nullades →
   platshållare visas. Behöver produktspecifika bilder.

**Städat denna kväll:** tog bort 16 The Ordinary-set/-collections (ej analyserbara), tog bort 12
beskrivnings-som-INCI-rader, strippade dubbel "The Ordinary"-prefix i namn, nullade generiska bilder.

**Verifierat:** sök i appen returnerar ~80 The Ordinary + breda märken; allt live (cached_products,
ingen deploy krävs för katalog). App-fixarna (SS-079) deployade: Railway live + TestFlight arkiverad.

---

## BESLUT-SS-081: "Komplettera platshållarprodukt"-flödet + The Ordinary-datakvalitet
- **Datum:** 2026-06-09
- **Status:** Aktiv
- **Bakgrund:** Pias TestFlight-test (SS-080) avslöjade att The Ordinary search-only-produkter
  (`CHIMIQ_<hash>`-barcode) inte gick att komplettera i appen. Tre app-buggar + tre datakvalitetsfel.

**App-fixar (kräver `pnpm build:mobile` → Xcode Archive → TestFlight):**
1. **Komplettera-på-plats (kärnbeslut).** Nytt fält `placeholderBarcode` i `POST /contribute/manual`
   (`contribute.ts`). När appen kompletterar en `CHIMIQ_`-produkt skickas den ursprungliga
   platshållar-koden med, och servern **uppdaterar den BEFINTLIGA `cached_products`-raden** (byter till
   riktig EAN om sådan anges, annars lägger bara till INCI/bild) i stället för att skapa en **dublett**
   under den nya EAN:en. Krock med en redan existerande riktig EAN-rad (t.ex. via OBF) hanteras: data
   slås ihop in i den riktiga raden och platshållaren tas bort.
2. **EAN-fältet förifylldes med `CHIMIQ_…`-strängen** → matchade inte siffer-regexen → ingen
   komplettering, och om INCI också tomt: 400 "Inskickning misslyckades". Nu: EAN-fältet **tomt** för
   platshållare; klienten för-validerar (kräver riktig EAN **eller** INCI) och visar snäll inline-text i
   stället för 400 (`complete.needEanOrIngredients`, sv/en/fr/es).
3. **Kamera-OCR i produktkortet.** `IngredientsCapture` (delad modul med `useScanLabel`, foto→OCR→fält +
   runda-flaskan-notis) ersätter den nakna textarean i `ProductDetailSheet.tsx` (#2).
4. **Förifylld prosa-junk** i ingrediensfältet gallras klientsidan (`looksLikeInciJunk`) så marknadsförings-
   text aldrig förifylls — tomt fält + scan-affordans i stället (#3).
5. **Motsägande "Tack!"-toast** visas inte längre samtidigt som fel (`completionDone && !editError`).

**Review-kö:** Fanns redan — `/contribute/manual` skriver till `user_submitted_products`
(`status: needs_admin`) med admin-granskningsrutter + `AUTO_APPROVE_ENABLED`-flagga. **Pias beslut för
testning:** kompletteringar går **live direkt** i `cached_products` (som idag) så buggar är lätta att
hitta. **Inför produktion** bör katalog-skrivningen gates bakom granskning (sätt `AUTO_APPROVE_ENABLED`
och låt admin godkänna) — flaggat som icke-uppenbart, lätt att glömma.

**Datakvalitet (LIVE i `cached_products`, ingen deploy krävs):**
- **45 rader** putsade: ledande `Ingredients`-etikett + avslutande "Our formulations are updated…"-
  disclaimer borttagna (riktig INCI fanns efter prefixet).
- **5 bogus-rader borttagna** ("Shop by Ingredients"-navtext som blev påhittade produktnamn: "Vitality
  Orb", "Energy-Boosting Bar", "Hydrating Vessel", "Cleansing Cylinder", "Vitamin Activator").
- **18 spec-tabell-rader** ("Highlights … water-free Yes …" = INTE INCI) → INCI satt till tomt (kolumnen
  är NOT NULL, så `''` i stället för null) på riktiga produkter → de visar nu komplettera/scan-flödet.
  Undantag: "100% Cold-Pressed Virgin Marula Oil" fick känt enkelingrediens-INCI `Sclerocarya Birrea
  Seed Oil`.
- **2 namn** fixade (#6): "Glycolic Acid 7 → 7% Exfoliating Toner", "Volufiline … 1pct → 1%".
- Katalog: 2 466 → **2 461** produkter (−5 bogus).

**Scraper härdad (`harvest_theordinary.py`, körs på Stina):**
- INCI-validatorn avvisar nu spec-tabell ("Highlights/water-free/ph N") och navtext ("Shop by").
- Putsar `Ingredients`-etikett + disclaimer.
- **Bild:** väljer största riktiga galleribilden i stället för sajtens delade `og:image`-default (#5).
- Enkelingrediens-karta (rena oljor → känt INCI).

**Kvarstår (uppföljning):**
- **#5 bilder:** 63 The Ordinary-platshållare saknar fortfarande produktbild. Kräver **omkörning** av
  den härdade `harvest_theordinary.py` på Stina (Playwright) → uppdaterar `image_url`.
- **OBF-etikettprefix:** ~17 icke-The-Ordinary-rader (OBF) har "INGREDIENTS (INCI):"-prefix + viss
  OCR-brus. Utanför kvällens scope; bör fixas i OBF-importören, inte radvis.
- **Dubblett-namn:** "Glycolic Acid 7% Exfoliating Toner" (nytt namn) finns parallellt med "…7% Toning
  Solution" (gammalt namn) — samma produkt, båda med korrekt data. Lågprioriterad merge.

## BESLUT-SS-081b: Delad analys-persistens + UX-städning (samma session, runda 2)
- **Datum:** 2026-06-09
- **Status:** Aktiv
- **Bakgrund:** Pias fortsatta TestFlight-test. Tre saker till.

1. **DELAD analys — "betala en gång, servera alla" (kärnbeslut, efterfrågat många gånger).**
   Tidigare sparades en analys bara på användarens HYLL-rad (`/api/shelf/:id`); en produkt som
   öppnades från sök/"Senaste skanningar" tappade analysen vid stängning → ny analys + ny kostnad vid
   återöppning. Nu:
   - `/api/analyze-single` tar emot `barcode` och sparar resultatet på **produktraden**
     (`cached_products.analysis_result_json` + `analysis_cache_hash`) när EAN är riktig — alltså DELAT
     mellan alla användare.
   - `GET /products/:barcode` returnerar i första hand den lagrade analysen på raden (robust mot
     ingrediens-hash-skillnader; faller tillbaka på hash-cachen för äldre rader).
   - Produktkortet **auto-laddar** lagrad analys vid öppning (även från "Senaste skanningar" och när en
     ANNAN användare redan analyserat) → visas direkt, ingen "Analysera"-knapp, ingen ny AI-kostnad,
     ingen förbrukad gratis-scan. Första analysen kostar en gång; därefter gratis för alla.
   - OBS: `analyzeSingleIngredients` cachade redan per ingrediens-hash (ingen LLM vid träff), men UX
     visade inte resultatet automatiskt och förbrukade en scan-slot. Detta löser båda.
   - **081c (Pias poäng):** gäller även **CHIMIQ_-platshållare** — platshållaren ÄR ett unikt id, så
     analysen sparas/visas DELAT även för produkter utan registrerad EAN (t.ex. The Ordinary search-only).
     När raden senare kompletteras med riktig EAN följer analysen med (uppdateras på plats). Endast rena
     OCR/klistra-skanningar UTAN katalograd saknar delad analys tills de sparas (får då ett CHIMIQ_-id).
2. **Dubblerat märke i namn** ("ACO ACO Hydrating Booster…"). Orsak: visningsnamnet byggdes som
   `märke + produktnamn`, men produktnamnet i katalogen innehåller redan märket. Ny `joinBrandName()`
   i `ScanEntry.tsx` hoppar över märket när namnet redan börjar med det. Ingen DB-ändring behövs.
3. **Platshållarbild = vektor-flaska (rose-gold), inte emoji.** 🧴-emojin renderades ibland som "?" i
   iOS WKWebView. `ProductImage` använder nu en `FlaskConical`-ikon i `--rose-gold`; produktkortets
   platshållare tonad likadant. (The Ordinary-bilderna är fortfarande nullade → väntar Stina-omkörning.)
4. **Sök-interstitial borttagen:** att trycka på ett sökträff öppnar nu produktkortet DIREKT (öppnar
   även med tom INCI → komplett-flödet). Skan-/OCR-vägen behåller sitt "Produkt hittades"-kort.

**Filer:** `analyze-single.ts`, `products.ts` (backend → Railway); `ProductDetailSheet.tsx`,
`ScanEntry.tsx`, `ProductImage.tsx` (klient → TestFlight).

5. **SÄKERHETSBUGG: falsk "Trygg"-prick.** IDAG/Home visade grön "Trygg" för produkter som INTE
   analyserats (lagrad platshållar-verdict `"safe"`, men ingen analys — t.ex. The Ordinary utan INCI).
   Fix: `Home.tsx` visar färgad `StatusBadge` ENDAST när raden faktiskt har en analys
   (`analysis_result_json`); annars neutral "Ej analyserad"-pill (`home.notAnalyzed`, sv/en/fr/es).
   Aldrig mer falsk grön prick. (Scan-sidans recents visade ingen prick — bara Home var drabbad.)
6. **Återanvändbar ingrediens-not (`IngredientCautionNote`).** Lugn rosa not (`--rose-soft`) som visas
   när en analys VISAS i produktkortet: "Baserat på ingredienslistan som visas. Formuleringar kan ändras
   över tid och variera mellan länder, och foton på runda flaskor kan missa ingredienser — kontrollera
   mot din produkt." Ordalydelsen bor på ETT ställe (`ingredientCaution.note`, sv/en/fr/es). OCR-
   ögonblicket har kvar sin egen starkare runda-flaskan-not i `IngredientsCapture`.
   - **Källa+datum medvetet UTELÄMNAT** (Pias beslut): EU Safety Gate täcker FARLIGA ändringar/återkall
     (som vi bevakar → varnar berörda användare), inte rutinmässiga omformuleringar; ett datum gav mer
     brus än värde. Wording bör regulatoriskt granskas innan bred lansering.

**Filer (runda 2 forts.):** `Home.tsx`, `IngredientCautionNote.tsx` (ny), `ProductDetailSheet.tsx`,
`i18n.tsx` (klient → TestFlight). `contribute.ts` (analys bärs över vid platshållar→EAN-krock, backend).

7. **Rutin-granskning (Pia bad om kodgenomgång av rutin + fler-produkt-analys).**
   - **FALSK "allt klart" i rutinkontrollen (SÄKERHET — fixad).** `/shelf/analyze-routine` skickade ÄVEN
     produkter utan ingredienslista till modellen (tom sträng) → inga konflikter → bidrog till
     "Rutinkontroll: allt klart". En oläsbar produkt redovisades som säker. Fix: hoppa över produkter
     utan användbar INCI, kräv ≥2 läsbara, och returnera `skipped`/`skippedCount` → klienten (MyShelf)
     visar en gul varning med namnen. Caution-noten tillagd i rutinvyn.
   - **ÅTGÄRDAT (Pias beslut: gör a+b+d+info):**
     a) **Cache på parvisa rutin-analyser (FIXAT).** `analyzePairCached` cachar varje par per
        ordningsoberoende compare-hash (`computeCompareHash` på sorterade listor) → upprepade körningar
        och par som delas mellan användare kostar inga nya AI-anrop.
     b) **Scan-kvot/premium-gate (FIXAT).** `/shelf/analyze-routine` räknar nu som EN scan mot gratis-taket
        (samma mönster som `/analyze`), premium obegränsat, slot släpps vid fel.
     c) **>10-tak — info (FIXAT).** Servern returnerar `maxProducts`/`capped`/`analyzedCount`; MyShelf
        visar "Upp till 10 produkter analyseras" (och en starkare rad när äldre produkter föll utanför).
        Högre tier för stora rutiner (makeup m.m.) = senare beslut efter tester.
     d) **AM/PM (FIXAT).** `slotsCanCombine` parar bara produkter som kan användas samtidigt (samma slot
        eller "both"/"occasional"/null som wildcard) → ingen falsk morgon-C-vitamin-mot-kvälls-retinol.

## BESLUT-SS-081d: UX-polish efter TestFlight-test (klient)
- **Datum:** 2026-06-09 — **Status:** Aktiv. Allt KLIENT (bara TestFlight, ingen Railway).
1. **Ingredienslistan klipptes utan "Visa alla".** Boxen klipptes vid 160px men knappen kom bara vid
   >520 tecken → medellånga listor (ACO 270 tecken) doldes utan expandering. Ny tröskel
   `INGREDIENTS_COLLAPSE_AT = 200`: box klipps bara när listan också får en "Visa alla"-knapp.
2. **"Analysen visar"-rubrik** över analyssammanfattningen (`product.analysisHeading`) så man förstår att
   texten ÄR analysresultatet.
3. **Dubblerat märke i namn** ("ACO ACO…", "L'Oréal Paris L'Oréal Paris…") — produkter sparade INNAN
   sök-fixen ligger dubblerade i hylla/recents. `collapseRepeatedBrandPrefix` städar visningen överallt
   (produktkort-titel, IDAG recents + sparade, Rutin-hyllan). Ingen DB-ändring.
4. **"Ej analyserad" fel på IDAG + Rutin för analyserade produkter.**
   - IDAG-pricken läste recents-postens lagrade analys (null vid öppning). Kortet skriver nu tillbaka
     analys+verdict till recents-posten; IDAG läser om vid stängning.
   - Rutin-hyllans rad-status var "unknown" tills RUTIN-konfliktkontrollen kördes → "Ej analyserad" även
     för produkter med egen analys. Nu: rad = produktens EGEN analys (`statusFromAnalysis`) + ev.
     konflikter ovanpå (`worseStatus`).
5. **"+N fler produkter" på IDAG var en passiv span** → nu länk till Rutin-sidan.
6. **Status-prickar omarbetade (Pias beslut, ansvars-/juridik-känsligt — bör granskas av jurist).**
   - **Inget "Trygg/Safe" längre** (affirmativ säkerhetsutfästelse = störst ansvar). Grön = **"Granskad"**
     (sv) / "Reviewed" / "Vérifié" / "Revisado" — säger att vi kollat, inte att produkten är säker.
   - **Nivåer kopplade till produktens EGEN analys** (antal flaggade ingredienser), inte rutin-tid:
     grön = 0 concerns, **orange** = 1–2 cautions, **röd triangel** = 3+ concerns ELLER någon high-risk.
     Kanon i `analysisConcernLevel()` (ProductDetailSheet), används i hyllan, IDAG-recents och kortets
     recents-återskrivning så prickarna matchar överallt. Röd renderas som triangel i `StatusBadge`.
   - Rutin-KONFLIKTstatus läggs fortfarande ovanpå (värsta vinner) när rutinkontrollen körts.
7. **Rutin-konfliktkontroll göms under "Sparat"** (önskelista, inte en rutin) — knapp + panel visas bara
   på morgon/kväll/ibland. (Servern uteslöt redan wishlist från konfliktanalysen.)
8. **"Rapportera felaktighet" → Supabase `product_reports`** (barcode, reported_by, reason; max 3/dygn).

## BESLUT-SS-081e: Positionering — inga "safe/dangerous"-utfästelser + felrapport-admin
- **Datum:** 2026-06-09 — **Status:** Aktiv. **JURIDIK-KÄNSLIGT — bör granskas av jurist före bred lansering.**
1. **Vi definierar ALDRIG en produkt som "safe" eller "dangerous/high risk".** Pias beslut (risk att
   stämmas av stora märken + vill inte ge falsk trygghet):
   - Grön = **"Granskad"** (vi har kollat, ingen säkerhetsutfästelse).
   - Orange = **"Värt att veta"** (Worth knowing) — 1+ flaggade ingredienser.
   - **En ENSKILD produkt blir aldrig röd.** `analysisConcernLevel` cappar på "caution". Kortets
     verdict-banner cappar också (ingen röd "Hög risk"-banner för en produkt). Röd reserveras för
     faktiska KOMBINATIONS-konflikter (rutinkontrollen) → vi dömer aldrig ut ett enskilt märke.
   - Röd (bara konflikter) = **"Granska noga"** (Look closely). "Hög risk"-ordet borttaget överallt.
   - Värdet ligger i att flagga KOMBINATIONS-risker (som The Ordinary gör för egna produkter), inte i
     att betygsätta enskilda produkter.
2. **Felrapport-admin (`product_reports`).** Ny `GET /admin/reports` (admin-gatead) + `ReportsAdmin`-
   sektion överst på chimiq.com/admin (produktnamn, streckkod, orsak, datum). Varje rapport mejlas
   till **hello@chimiq.com** (`notifyReportInbox`) — KRÄVER `RESEND_API_KEY` i backend-miljön; Resend
   ej konfigurerat ännu → mejl hoppas tyst över, raden sparas + syns i admin oavsett.

## BESLUT-SS-083: Färre foton (#2), spara-till-katalog före hylla (#3), Safety Gate live-feed (#4)
- **Datum:** 2026-06-22 — **Status:** Aktiv. #2/#3 = KLIENT (TestFlight-build krävs), #4 = BACKEND (Railway).

1. **#2 — ETT framsidesfoto istället för två (klient).** Uppladdningsflödet bad tidigare om TVÅ
   framsidesfoton: ett för produktbilden (`ProductImageCapture`) och ett till för namn/märke-OCR
   (`ProductNameCapture`s egen kamera) — samma flaska. Nu tar `ProductImageCapture` ETT foto som
   blir BÅDE produktbilden OCH körs genom namn/märke-OCR (`extractProductNameFromImage`) när
   `onScanResult` ges. Nytt flöde: streckkod → 1 framsidesfoto (bild + namn/märke) → 1 ingrediensfoto.
   - `ProductImageCapture`: ny valfri `onScanResult`-prop + inbyggd OCR (samma `useScanProductName`-hook
     som ProductNameCapture) + nativ kamera (Capacitor) på iOS. Utan `onScanResult` = oförändrat beteende.
   - `ProductNameCapture`: ny `showCamera`-prop; i `ProductCapture` sätts `showCamera={false}` så
     namn/märke-fälten är redigerbara men kameran är dold (inget andra foto av samma flaska).
   - Ny i18n: `productImage.frontPhotoHint` (EN/SV/FR/ES).

2. **#3 — "Spara" sparar till KATALOGEN, inte till hyllan (klient).** Tidigare la "Spara"-knappen i
   scan-kortet produkten direkt i användarens rutin/hylla (`addToShelf`, slot `wishlist`) — förvirrande.
   Pias ordning nu: **(1) Spara i katalogen (contribute) → (2) Analysera (upplåst när produkten är i
   katalogen) → (3) Lägg i rutin (separat, uttryckligt steg).**
   - `ProductDetailSheet`: `handleSaveToShelf` ersatt av `handleSaveToCatalog` (POST
     `/api/contribute/manual`, kräver INCI ≥ 20 tecken; EAN valfritt — servern skapar CHIMIQ_-platshållare).
     Spar-knappen rör inte längre hyllan.
   - Analysera-knappen i scan-flödet gatas på `inCatalog` (`!notInCache || addedToCatalog`).
   - "Lägg till i rutin" kvar som separat steg (`canAddToRoutine`-sektionen, slot-väljare).
   - Ny i18n: `product.saveToCatalog` (EN/SV/FR/ES). `product.addedToCatalog` återanvänds som kvitto.
   - Bygger vidare på ss-082 (server-side katalogskrivning) — nu är även KLIENT-knappen katalog-först.

3. **#4 — Safety Gate-pollern pekar på en levande feed (backend).** Gamla RAPEX-URL:en
   (`…/RAPEX_ALERTS_1_3.xml`) returnerar numera HTML (`non_xml_response`) → inga recalls in. EU:s nya
   "Safety Gate"-portal är en JS-SPA med JSON-API utan enkel publik RSS. `DEFAULT_FEED_URL` pekar nu på
   OpenDataSoft-spegeln av samma RAPEX-dataset (`healthref-europe-rapex-en`, RSS-export) som den
   beroendefria regex-parsern kan läsa som den är. Ny `SAFETY_GATE_FEED_URL` env-override (Railway
   Variables) → byt feed utan kod-deploy. Ny admin-gatead `POST /api/recalls/poll` för verifiering på begäran.
   - **Trade-off (för icke-utvecklare):** OpenDataSoft-spegeln byggs om från EU:s Excel-export och kan
     släpa några dagar efter den officiella portalen. OK för veckovis recall-bevakning; behövs samma-dag
     kan `SAFETY_GATE_FEED_URL` pekas om senare.
   - ⚠️ **KVAR att verifiera:** web_fetch timeoutade i Cowork-sessionen → ingen live-poll kördes. Efter
     Railway-deploy: logga in som admin och kör `POST /api/recalls/poll`; om `matched: 0` behöver
     parsern (titel/kategori-filtret) justeras mot OpenDataSoft-RSS:ens faktiska fältformat.

---

*Senast uppdaterad: 2026-06-22 (SS-083: ett framsidesfoto (#2), spara-till-katalog-först + analysera-
gate + separat lägg-i-rutin (#3), Safety Gate OpenDataSoft-feed + env-override + admin-poll-endpoint (#4 —
KVAR: live-poll-verifiering på Railway). Typecheck grön i båda paketen. — tidigare: SS-081 + 081b:
komplettera-platshållare-flödet, kamera-OCR, datastädning (katalog 2 461), scraper härdad; DELAD
analys-persistens (betala en gång), dubbel-märke-fix, rosa flask-platshållare, sök-interstitial borttagen.)*
