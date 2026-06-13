# Chimiq granskning 2026-06-10 — varför skanningen inte sparades + UX-förenkling + skalrisker

Granskning utförd av Claude (Fable) på Pias begäran. Läst: DECISIONS.md t.o.m. SS-081e,
handoff 2026-06-10, koden i `artifacts/skinscreen` + `artifacts/api-server`, samt live-datan
i Supabase Chimiq-prod (`wzzoipnaucqxnasubljk`).

---

## 1. DIAGNOS: NIVEA-skanningen igår (barcode 4006000089874)

**Vad databasen visar (bevis):**

| Tid (UTC) | Vad | Var |
|---|---|---|
| 09:39:12 | Tom "okänd streckkod"-stubbe (inget namn, ingen INCI) | `user_submitted_products`, status `pending` |
| 09:40:24 | Hyllrad MED full ingredienslista (691 tecken) + streckkod, slot `wishlist` | `shelf_products` id 27 |
| — | **INGENTING** | `cached_products` (katalogen) |

Alltså: appen hade ALL data (namn, märke, EAN, hela INCI-listan) och hyll-sparningen
lyckades — men produkten skrevs aldrig in i katalogen. Därför är den fortfarande
osökbar/oskanbar för dig och alla andra.

**Railway och Supabase är INTE problemet.** Båda anropen kl 09:39 och 09:40 gick hela vägen
till servern och databasen. `main` är pushad t.o.m. SS-081e, så Railway kör rätt backend-kod
(förutsatt att auto-deployen gick igenom — kolla Railway-dashboarden att senaste deploy är
från 9 juni, commit `9887e1a`).

**Grundorsaken är arkitektur, inte en driftstörning.** Katalog-skrivningen är idag en *dold
bieffekt* på klienten med tre hål:

1. **`inCache`-flaggan tappas via "Senaste skanningar".** Produktkortet bidrar bara till
   katalogen när `product.inCache === false` (`ProductDetailSheet.tsx` rad 386, 565).
   Men recents-listan (`pages/app/Scan.tsx`, `RECENT_SCANS_KEY` i localStorage) sparar
   ALDRIG `inCache`-fältet. Öppnar man kortet igen från "Senaste skanningar" är `inCache`
   `undefined` → `notInCache` blir `false` → `contributeToCatalog()` avbryter tyst på
   första raden. Spara-till-hyllan funkar ändå → exakt det mönster vi ser i databasen.
   **Detta är den troligaste förklaringen till gårdagens försvunna produkt.**
2. **Fire-and-forget utan feedback.** `contributeToCatalog()` är `void apiFetch(...).catch(() => {})`
   — om anropet misslyckas (eller appen läggs i bakgrunden innan det hinner iväg, vilket iOS
   gärna gör direkt efter att man tryckt Spara) försvinner det spårlöst. Användaren får
   "Sparat!" ändå.
3. **Alla spara-vägar bidrar inte.** Tre ytor skriver till hyllan, bara EN bidrar till katalogen:
   - `ProductDetailSheet` (kortet): bidrar ✅ (när flaggan stämmer)
   - `IngredientScanner` → `ScannerRoutineShelfBlock`: bidrar ❌ och skickar inte ens barcode
   - `MyShelf` → `AddProductForm`: bidrar ❌ och tappar både barcode och bild

**Bonusfynd (säkerhetsklass, samma familj som 081b §5):** `Scan.tsx` sätter
`verdict: detail.verdict ?? "safe"` när recents-posten skapas — en oanalyserad produkt kan
alltså fortfarande få "safe" lagrat i recents på Scan-sidan. Home är fixad, Scan-recents inte.

## 2. REKOMMENDERAD FIX — gör sparandet till EN sak som inte kan missas

**A (viktigast, backend): flytta katalog-skrivningen till servern.**
`POST /api/shelf` (shelf.ts rad 88) har redan namn + INCI + barcode + bild. Låt servern,
i samma transaktion som hyllraden skapas: om `barcode` är riktig EAN, INCI ≥ 20 tecken och
raden saknas/saknar INCI i `cached_products` → upsert (source `user`), samt skapa
`user_submitted_products`-raden för granskningskön. Då kan klienten aldrig "glömma" det,
oavsett vilken yta användaren sparar ifrån, och `inCache`-flaggan slutar vara en felkälla.
Klientens `contributeToCatalog()` kan sedan tas bort.

**B (klient): synligt kvitto i kortet.** "Sparad i din hylla ✓ · Tillagd i Chimiq-katalogen ✓"
(eller felmeddelande + retry-knapp). Aldrig tyst.

**C (klient): småfixar.**
- Spara `inCache` i recents-posten (tills A är gjort).
- `verdict ?? "safe"` i Scan.tsx → ingen default-safe.
- `ScannerRoutineShelfBlock` och `MyShelf/AddProductForm`: skicka med barcode + bild.

**D (verifiering på din mobil):** öppna NIVEA-produkten från hyllan, tryck Spara/komplettera
igen efter fix — eller säg till så promotar jag hyllrad 27 in i `cached_products` manuellt
(datan finns ju redan komplett i databasen).

## 3. "ETT produktkort" — status

Beslutet SS-075 är till största delen genomfört: `ProductDetailSheet` ÄR kortet, och sök,
skanning, ContributeModal och recents öppnar det. Det som återstår av "många kort"-problemet
är de två sido-vägarna ovan (IngredientScanner-blocket och MyShelfs formulär) som sparar utan
att gå via kortet. Rekommendation: låt även dem alltid landa i `ProductDetailSheet` →
en enda Spara-knapp, ett enda beteende. Då är "ONE card" klart på riktigt.

## 4. UX-FÖRENKLING — "sparade produkter" vs "skannade produkter"

Idag finns FYRA produktbegrepp som användaren möter: Senaste skanningar (localStorage,
per enhet!), Sparat/wishlist, Rutin (morgon/kväll/ibland) och katalogen. Det är därför det
känns som "för många saker på för många ställen".

Förslag — två begrepp utåt:

1. **"Mina produkter"** = allt du skannat eller sparat, automatiskt. En lista, nyast överst,
   med statuspricken. Skanning = autospar här (en skanning ÄR ett intresse — ingen separat
   "spara"-handling behövs). Ersätter både "Senaste skanningar" och "Sparat".
2. **"Min rutin"** = morgon/kväll/ibland — det enda stället med en aktiv handling
   ("Lägg till i rutin") och hemmet för konfliktanalysen (appens unika värde).

Tekniskt: flytta recents från localStorage till servern (de försvinner idag vid
ominstallation/byte av telefon och syns inte på webben). Enklast: hyllrad med
slot `history`, eller återanvänd `scan_events` + barcode.

Kortets knapprad blir då: **Analysera** (om ej analyserad) · **Lägg till i rutin** ·
(automatiskt: redan i Mina produkter). En handling färre, noll förvirring.

## 5. RUTIN-FLÖDET (kombinationsanalysen)

Genomgånget — i gott skick efter SS-081b §7: wishlist exkluderas, produkter utan läsbar INCI
hoppas över MED gul varning (ingen falsk "allt klart"), max 10 med info, AM/PM-paras korrekt
(`slotsCanCombine`), parvisa analyser cachas ordningsoberoende, räknas som 1 scan mot kvoten.

Feed-forward-förslag (nästa nivå på unikiteten):
- När en produkt läggs i en rutin-slot som redan har ≥1 produkt: kör konfliktkontrollen
  **automatiskt** mot bara den slotten och visa resultatet direkt i kortet ("Funkar med din
  morgonrutin ✓" / "1 sak värd att veta ihop med X"). Parcachen gör detta nästan gratis.
- Visa senaste rutinkontrollens datum på Rutin-sidan + en knuff när rutinen ändrats sedan dess.

## 6. RISKER VID SKALNING

1. **Direkt-live-skrivningar i katalogen** (Pias testläge): med fler användare = klotter och
   fel-INCI live för alla. Redan flaggat i SS-081 — sätt `AUTO_APPROVE_ENABLED`-gaten + 
   AI-rimlighetskontroll (namn/märke känt + INCI ser ut som INCI = auto-godkänn, annars kö).
   Det matchar din "auto-confirm med AI"-idé och håller kvalitén när volymen växer.
2. **Recents i localStorage**: data försvinner vid telefonbyte; supportärenden ("mina
   produkter är borta"). Lös via §4.
3. **OBF-beroendet**: 5s-timeout per okänd streckkod är ok nu, men varje "miss" kostar en
   väntan. Vid volym: kö:a okända EAN och slå upp i bakgrunden i stället.
4. **Delad analys per produktrad** är rätt kostnadsmodell (betala en gång). Bevaka att
   INCI-ändring alltid invaliderar (`analysis_cache`-rensningen finns) och att en vandal-INCI
   inte ersätter en bra analys — ännu ett skäl för granskningsgaten (punkt 1).
5. **Datakvalitet i katalogen**: dubblerade märkesnamn ("NIVEA NIVEA…") ligger kvar i
   DATAN (display-fixen döljer det bara). Kör en engångs-städning i `cached_products` +
   `shelf_products` innan katalogen växer; dubblett-paret Glycolic Acid 7% kvarstår också.
6. **En Railway-instans + Anthropic-nyckeln**: rate limits finns på foto-endpoints, men
   analyze-endpoints bör få per-användare-tak innan publik lansering (kvoten finns för free,
   kolla att premium har ett rimligt abuse-tak).
7. **Juridiskt** (redan beslutat i 081e): wording-granskning av jurist före bred lansering.

## 8. ÖPPNA PUNKTER FRÅN TIDIGARE (oförändrade)

- 63 The Ordinary-platshållare utan bild → omkörning av `harvest_theordinary.py` på Stina.
- OBF-prefixstädning (~17 rader) i importören.
- Verifiera i Railway-dashboarden att senaste deploy = commit `9887e1a` (SS-081e), och att
  en NY TestFlight-archive byggts EFTER `pnpm build:mobile` 9 juni (bundlen i repot är från
  ~kl 00:09 den 9:e och innehåller SS-081-koden — men telefonen kör bara det som archiverats).

---
*Loggat 2026-06-10. Beslut som fattas utifrån detta förs in i docs/DECISIONS.md (förslagsvis SS-082).*
