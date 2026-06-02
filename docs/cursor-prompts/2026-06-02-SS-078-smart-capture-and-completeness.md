# SS-078 — Smart capture (en bild → allt) + ingrediens-fullständighetskoll

**Datum:** 2026-06-02
**Prioritet:** 🟠 Hög — UX-friktion som stoppar riktiga användare i butik
**Bygger på:** SS-075 (ett produktkort), SS-077 (berikning/scraping/vision)

---

## Bakgrund — Pias TestFlight-test 2026-06-02

Sex observationer. Tre är redan fixade (se "Klart nedan"); tre kräver kamera/AI-arbete och
specas här.

### ✅ Klart 2026-06-02 (små fixar, redan i koden)
1. **Bullet-separerade ingredienser gav 400.** L'Oréal Lumi Glotion listade INCI med punkter
   (`AQUA/WATER • GLYCERIN • DIMETHICONE • …`). Tokeniseraren delade bara på komma/radbrytning/
   semikolon → hela listan blev EN token → avvisad. Fix: `sanitizeIngredients` normaliserar nu
   `• · ∙ ● ▪ ‣ ・ ･ |` till komma INNAN tokenisering (snedstreck `/` lämnas — del av namn som
   "AQUA/WATER"). Verifierat: 10 rena tokens, 0 misstänkta.
   Fil: `artifacts/api-server/src/lib/sanitize.ts`.
2. **Dubbel "Lägg till i rutin".** Två knappar renderades (guidad CTA-rad + kropps-sektion); bara
   den andra visade slot-väljaren (morgon/kväll/ibland), så det såg ut som att appen inte frågade
   VAR. Fix: tog bort CTA-radens dubblett; kvar är knappen med slot-väljaren.
   Fil: `artifacts/skinscreen/src/components/ProductDetailSheet.tsx`.
3. **Streckkods-skanningar dök inte upp i "Senaste skanningar".** Recents registrerades bara i
   den gren som hade en cachad analys; streckkods-/OCR-/bidrags-öppningar (analys körs INNE i
   kortet) registrerades aldrig. Fix: `handleScanResult` registrerar nu produkten i recents redan
   när kortet öppnas. Fil: `artifacts/skinscreen/src/pages/app/Scan.tsx`.

---

## 🎯 Detta spec: smart capture + fullständighetskoll

### Problem (Pias ord, sammanfattat)
- "Varför två bilder — en för namn och en för produktbild? Ta EN frontbild och låt AI:n läsa
  namnet (och varumärket) från den."
- "Ingredienserna sitter ofta bredvid streckkoden. Kan vi få ut mer ur samma bild?"
- "Skannar jag ingredienser kan jag inte lägga till streckkoden utan att knappa in varje siffra —
  ingen orkar. De vill bara fota fram- och baksidan och låta AI:n ta namn, varumärke, bild,
  ingredienser OCH streckkod."
- "Jag fick bara med halva ingredienslistan. Appen analyserar ändå. Lägg in en popup/text som ber
  användaren bekräfta att HELA listan kom med."

### Designmål
**En produkt = max två foton (fram + bak), allt annat extraheras av AI.** Användaren ska aldrig
behöva fota namnet separat eller knappa in streckkoden för hand.

---

## Del A — "Smart capture": en frontbild + en baksidesbild → allt

**Nuläge:** `ProductCapture` (SS-075) + `ProductImageCapture`/`ProductNameCapture` tar separata
bilder/fält. OCR-vägen (`IngredientsCapture`) tar en egen bild för ingredienser. Streckkod måste
knappas in om man inte skannat den först.

**Mål-flöde:**
1. **Frontbild** → vision-extraktion: `productName`, `brand`, och bilden sparas som produktbild.
2. **Baksidesbild** → vision-extraktion: `ingredients` (INCI) + `barcode` (EAN, ofta bredvid
   listan). En bild ger alltså BÅDE ingredienser och streckkod.
3. Användaren ser ett förifyllt produktkort (SS-075) och bekräftar.

**Implementation (förslag):**
- Ny endpoint `POST /api/extract/label` (api-server) som tar `frontImageBase64?` och
  `backImageBase64?` och returnerar `{ productName?, brand?, ingredients?, barcode?, confidence }`.
  - Återanvänd den vision-pipeline som redan finns för bild-OCR i `contribute.ts` (Anthropic vision,
    `source: { type: "base64", media_type, data }`, rad ~187) — bygg INTE nytt från scratch.
  - Prompt: "Extrahera produktnamn, varumärke, fullständig INCI-ingredienslista och EAN-streckkod
    (8–13 siffror) ur dessa etikettbilder. Returnera JSON. Lämna fält tomt om osäker."
  - **Lokal-AI-spår (SS-077):** när Mac mini + Qwen2-VL är på plats kan extraktionen köras lokalt;
    annars Anthropic vision i molnet. Endpointen abstraherar modellvalet.
- Frontend: ersätt de separata bild-/namn-/ingrediens-stegen i `ProductCapture` med ett
  "Fota fram → Fota bak"-flöde som anropar `/api/extract/label` och förifyller kortet. Behåll
  manuell redigering (användaren kan rätta extraherade fält).
- **Berikning först (SS-077):** har produkten en streckkod (skannad eller extraherad) → slå mot
  OBF + Apotea/Kicks INNAN vi ber om baksidesbild. Hittas listan där behövs ingen baksidesbild
  alls (löser "runda flaskor").

**Icke-uppenbart att flagga för Pia:**
- Text-Qwen kan INTE läsa bilder → kräver Qwen2-VL eller Apple Vision OCR on-device (SS-008).
  Tills dess: Anthropic vision i molnet (kostar per anrop men funkar idag).
- EAN ur foto behöver kontrollsiffre-validering (finns redan: `isValidEanCheckDigit` i
  `ProductDetailSheet.tsx`) — kör den på extraherad streckkod innan vi litar på den.

---

## Del B — Fullständighetskoll: "Är alla ingredienser med?"

**Problem:** halv ingredienslista → appen analyserar ändå → falsk trygghet (jfr SS-074:s falska
"Säker").

**Mål:** innan analys på en foto-/OCR-infångad lista, varna mjukt om listan ser ofullständig ut och
be användaren bekräfta.

**Heuristik (frontend, billig, körs före "Analysera nu"):**
Flagga som "möjligen ofullständig" om NÅGOT av:
- texten slutar mitt i ett ord / utan vanlig avslutning (sista token saknar `)` -balans, eller
  slutar på bindestreck/komma),
- listan saknar ett konserveringsmedel/vanlig slut-markör (phenoxyethanol, sodium benzoate,
  potassium sorbate, parfum/fragrance, tocopherol, CI-nummer) trots > ~8 ingredienser,
- ovanligt få tokens för produkttypen (t.ex. < 5 för en solkräm/serum).

Vid flagga: visa en lugn bekräftelse-dialog innan analys:
> "Ser ut som att listan kan vara avklippt. Kontrollera att HELA ingredienslistan kom med innan vi
> analyserar." → [Lägg till mer] / [Analysera ändå]

**Viktigt:** mjuk varning, inte blockering. Falska positiva ska gå att klicka förbi. Lägg
i18n-nycklar (en/sv/fr/es) — inte hårdkodad text.

---

## Filer (uppskattning)
```
artifacts/api-server/src/routes/extract-label.ts      ← NY endpoint (vision-extraktion)
artifacts/api-server/src/index.ts / router            ← registrera route
artifacts/skinscreen/src/components/ProductCapture.tsx ← fram/bak-flöde + förifyllning
artifacts/skinscreen/src/components/IngredientsCapture.tsx ← ev. återanvänd kamera
artifacts/skinscreen/src/components/ProductDetailSheet.tsx ← fullständighets-bekräftelse före analys
artifacts/skinscreen/src/lib/i18n.tsx                 ← nya nycklar (en/sv/fr/es)
```

## Testplan
1. **L'Oréal Lumi Glotion (EAN 3600524150587):** klistra bullet-INCI → analys funkar (✅ redan fixat).
2. **REVUELE Aloe Daily Sun Barrier (5060565109025):** fota fram+bak → namn, märke, bild,
   ingredienser, streckkod förifyllda; ingen manuell EAN-inknappning.
3. **Rund flaska (Beauty of Joseon):** streckkod finns → berikning hämtar listan, ingen
   baksidesbild krävs.
4. **Avklippt lista:** fota bara halva → bekräftelse-dialogen dyker upp före analys.
5. Streckkods-skanning syns i "Senaste skanningar" (✅ redan fixat).

## BESLUT att logga
- **SS-078** (2026-06-02): (a) tre småfixar klara (bullets, dubbel rutin-knapp, recents);
  (b) smart capture: max två foton (fram/bak) → AI extraherar namn/märke/bild/ingredienser/EAN via
  `/api/extract/label`, berikning (SS-077) först när streckkod finns; (c) mjuk
  fullständighetskoll före analys av foto-/OCR-listor.
