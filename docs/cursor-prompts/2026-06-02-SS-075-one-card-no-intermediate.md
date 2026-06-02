# SS-075 — Ett produktkort: ta bort mellansteget (ProductCapture-analysen)

**Datum:** 2026-06-02
**Prioritet:** 🔴 Kritisk — fixa innan betatest
**Bygger vidare på:** SS-074 (One Product Card)

---

## Bakgrund (Pias test i butik, 2026-06-02)

Testprodukt: **Isadora "The CC+ Cream Hydrating & SPF 30", EAN 7333352079039.**
Skannad via streckkod. Produkten fanns inte i databasen.

Vad som hände, steg för steg:

1. Streckkod skannas → "Produkten finns inte, lägg till" → bra.
2. Ett **produktkort-formulär** öppnas (`ProductCapture` inuti `ContributeModal`): namn, varumärke,
   streckkod (ligger kvar från skanningen), Produkttyp (Hudvård förvald), foto, ingredienser.
   **Enda knappen är "Analysera ingredienser"** — inte spara först som väntat.
3. Nästa vy visar en platt **"Säker"** under ingredienserna — **ingen riktig analys, inga
   flaggade ingredienser, inga förklaringar.** Sedan dyker "Spara i min rutin" + "Bidra till
   databasen" upp (i den ordningen).
4. Klick på "Bidra till databasen" → tillbaka till skanningsvyn, produkten ligger där. Klick på
   den → det **riktiga** produktkortet (`ProductDetailSheet`) öppnas — **men utan bild** (gick inte
   att få med i förra steget) och **varumärket har tappats bort.** Användaren får lägga in bild +
   varumärke igen, spara, och klicka "Analysera ingredienser" → **nu** kommer den riktiga analysen
   med varningar, förklaringar och "läs mer"-länkar.
5. Söker man på produkten i **Sök** kommer allt rätt fram (den finns nu i DB).
6. Men **"PRODUKT HITTADES → Öppna produktkort"** leder fortfarande till mellanstegs-kortet
   (det vi inte vill ha), trots att all data finns i DB.

### Pias beslut (ordagrant)
> "Det är BARA detta sista kortet [`ProductDetailSheet`] som alltid ska visas. Det där första
> steget som fortfarande visar Säker ska bort. Input-info ska skickas till det här sista kortet
> och där analyseras."

---

## Designbeslut SS-075

`ProductCapture` ska **sluta vara ett eget mini-produktkort.** Den ska bara **samla in** (bild,
namn, varumärke, streckkod, produkttyp, ingredienser) och sedan **lämna över hela paketet** till
det enda produktkortet `ProductDetailSheet`. **All** analys, **all** "Bidra till databasen", **all**
bildhantering sker i `ProductDetailSheet`. Mellanstegets inline-analys ("Säker") och dess två
knappar tas bort helt.

Detta är en fortsättning på SS-074: ETT kort = single source of truth. SS-074 fixade backend
(bild + cache + upsert). SS-075 tar bort själva mellansteget i frontend.

---

## ⚠️ Icke-uppenbar fälla (måste fixas, annars går "Bidra till databasen" förlorad)

I `ProductDetailSheet.tsx`:
```ts
const hasRealBarcode = Boolean(barcode && !barcode.startsWith("CHIMIQ_"));
const isNotInDb = !hasRealBarcode && !product.shelfId;   // ← rad ~308
```
`isNotInDb` är **bara sant när det helt saknas streckkod.** En produkt som skannats via streckkod
men inte finns i `cached_products` HAR en streckkod → `isNotInDb` blir **falskt** → den gyllene
"Bidra till databasen"-CTA:n (rad ~1187) visas **inte.**

Konsekvens om vi inte fixar detta: när vi skickar en skannad-men-okänd produkt rakt in i
`ProductDetailSheet` kan användaren analysera, men det finns **ingen knapp för att spara den i den
delade databasen** → produkten hamnar aldrig i `cached_products`. Det vore en regression mot dagens
flöde.

**Fix:** skilj på "har streckkod" och "finns i cached_products". Skicka med en explicit flagga
`inCache` (eller `isNew`) från sök/skann-uppslaget, och basera CTA:n på den.

---

## Filer att ändra

```
artifacts/skinscreen/src/components/ProductCapture.tsx        ← ta bort inline-analys + två knappar
artifacts/skinscreen/src/components/ContributeModal.tsx       ← skicka HELA ProductResult vidare
artifacts/skinscreen/src/components/BarcodeScanButton.tsx     ← tråda hela resultatet (bild+typ) upp
artifacts/skinscreen/src/components/ScanEntry.tsx             ← contribute-vägen → onResult(full)
artifacts/skinscreen/src/components/ProductDetailSheet.tsx    ← inCache-flagga → rätt "Bidra"-CTA
artifacts/skinscreen/src/pages/app/Scan.tsx                   ← (verifiera) handleScanResult oförändrad
```

---

## Fix 1 — `ProductCapture.tsx`: bli ett rent insamlingsformulär

Ta bort: `handleAnalyze`, `analysis`-state, verdict-badgen ("Säker"), `handleContribute`,
`contributed`-state, samt knapparna "Spara i min rutin" och "Bidra till databasen".

Behåll: alla fält (bild, namn/varumärke, streckkod, **Produkttyp**, ingredienser).

Ersätt hela knapp-/resultat-sektionen med **en** primärknapp som lämnar över allt:

```tsx
{/* Ett kort: lämna över insamlad data till ProductDetailSheet — ingen analys här. */}
<button
  type="button"
  disabled={ingredients.trim().length <= 10}
  onClick={() => onAnalyzed?.(buildProductResult(null))}
  className="btn-primary mt-4"
>
  {t("scan.openProductCard")}   {/* "Öppna produktkort" */}
</button>
```

Uppdatera `buildProductResult` så att den tar `analysis_result_json` som argument (här: `null`) och
**alltid** inkluderar `image_url`/`imageUrl` (base64-dataURL), `productType`, `barcode`, `brand`,
`productName`, `ingredients`. (Den bygger redan nästan hela objektet — säkerställ bara att bilden
och produkttypen följer med.)

> Resultat: `onAnalyzed` får ett **komplett, förlustfritt** `ProductResult`. Inget "Säker",
> inga två knappar, ingen dubbel-analys.

---

## Fix 2 — `ContributeModal.tsx`: skicka hela resultatet, inte bara (ings, name, imageUrl)

Idag plockar `handleAnalyzed` isär resultatet och anropar `onSuccess(ing, name, imageUrl)` —
**barcode, varumärke och produkttyp tappas här.**

Lägg till en ny prop som lämnar över hela objektet, och behåll `onSuccess` enbart för
stats-refresh:

```ts
interface ContributeModalProps {
  // ...befintligt...
  onSuccess?: (ingredients: string, productName: string, imageUrl?: string | null) => void;
  /** SS-075: hela det insamlade produktresultatet, för att öppna ETT produktkort. */
  onProductReady?: (result: ProductResult) => void;
}
```
```ts
const handleAnalyzed = (result: ProductResult) => {
  onProductReady?.(result);                 // ← öppnar ProductDetailSheet med ALLT
  onSuccess?.(                               // ← bakåtkompatibelt (stats)
    result.ingredients ?? initialIngredients,
    result.productName ?? result.product_name ?? t("contribute.scannedProductFallback"),
    result.imageUrl ?? result.image_url ?? null,
  );
  onClose();
};
```

---

## Fix 3 — `BarcodeScanButton.tsx`: tråda hela resultatet upp (bild + typ bevaras)

Idag: `onResult(ings, name, scannedBarcode)` i `ContributeModal`-callbacken → bild och produkttyp
försvinner. Lägg till en ny prop på knappen och koppla den till `onProductReady`:

```ts
interface BarcodeScanButtonProps {
  onResult: (ingredients: string, productName: string, barcode?: string, productType?: string) => void;
  /** SS-075: helt ProductResult från contribute-formuläret (med bild). */
  onContributedProduct?: (result: ProductResult) => void;
  // ...
}
```
```tsx
{showContribute && (
  <ContributeModal
    barcode={scannedBarcode ?? undefined}
    initialProductName={prefillName}
    initialBrand={prefillBrand}
    onProductReady={(result) => {
      setShowContribute(false);
      close();
      onContributedProduct?.({ ...result, barcode: result.barcode ?? scannedBarcode ?? null });
    }}
    onSuccess={() => { /* ev. stats */ }}
    onClose={() => { setShowContribute(false); close(); }}
  />
)}
```

---

## Fix 4 — `ScanEntry.tsx`: contribute-vägen går rakt till onResult(full)

`ScanEntry.onResult` tar redan ett helt `ProductResult`. Koppla den nya knapp-proppen:

```tsx
<BarcodeScanButton
  // ...befintligt...
  onContributedProduct={(result) => onResult?.(result)}   // SS-075
/>
```

`ScanEntry`s egen `<ProductCapture ... onAnalyzed={(result) => onResult?.(result)} />` (sök-manuell
tillägg, rad ~478) är redan förlustfri — verifiera bara att den fortsatt skickar hela objektet och
att `showCapture`-blocket inte längre förväntar sig inline-analys.

---

## Fix 5 — `ProductDetailSheet.tsx`: rätt "Bidra till databasen"-CTA för skannad-men-okänd produkt

Skilj "finns i cache" från "har streckkod". Lägg till ett valfritt fält på `ProductDetailProduct`:

```ts
/** SS-075: produkten kommer från en skanning/sök men finns inte i cached_products än. */
inCache?: boolean;   // default: antas true om analys finns, annars okänt
```

Ändra rad ~308:
```ts
const hasRealBarcode = Boolean(barcode && !barcode.startsWith("CHIMIQ_"));
// SS-075: en skannad produkt med streckkod men inte i cache ska också kunna bidras.
const notInCache = product.inCache === false;
const isNotInDb = (!hasRealBarcode || notInCache) && !product.shelfId;
```

Sätt `inCache: false` i scan-/contribute-vägarna (där vi vet att produkten är ny):
- `Scan.tsx > handleScanResult`: när `analysis_result_json` saknas och produkten kommer från
  contribute/OCR, sätt `inCache: false` på `detail`-objektet.
- Sök-/streckkods-uppslag som returnerar `found: true` från `cached_products` → `inCache: true`.

Då visas den gyllene "Bidra till databasen"-CTA:n (öppnar editMode i samma kort) även för en
skannad produkt som ännu inte finns i DB — och hela bidraget sker i ETT kort.

---

## Fix 6 — "Öppna produktkort"-länkarna ska alltid öppna ProductDetailSheet

- **Streckkods-captured-kortet** ("PRODUKT HITTADES") i `ScanEntry`: `handleAnalyze` → `onResult`
  → `Scan.handleScanResult` → `ProductDetailSheet`. ✅ redan rätt efter Fix 3–4.
- **Sök-captured-kortet**: `emitLookupResult` skickar redan cachad analys → `ProductDetailSheet`.
  ✅ verifiera att den bär `inCache: true` när träffen kom från `cached_products`.

Det får INTE finnas någon väg kvar som öppnar `ProductCapture`/`ContributeModal` som ett
"produktkort". `ContributeModal` är hädanefter enbart ett insamlingsformulär som lämnar över till
`ProductDetailSheet`.

---

## Testplan (TestFlight, iOS)

1. **Skanna Isadora CC+ Cream (EAN 7333352079039)** — produkten är (initialt) okänd.
   - Formuläret ska INTE visa "Säker" och INTE ha två knappar. Bara fält + **"Öppna produktkort"**.
2. **Fyll i + ta foto + ingredienser → "Öppna produktkort"** — `ProductDetailSheet` öppnas med
   **bild, varumärke, streckkod och produkttyp på plats**. Ingen data tappas.
3. I kortet: **"Analysera nu"** → riktig analys (Octinoxate/nano-TiO₂/talk-varningar, "läs mer").
4. I kortet: **"Bidra till databasen"** finns och fungerar → `cached_products` uppdateras (bild +
   ingredienser), analyscache invalideras (SS-074-backenden).
5. **Skanna samma produkt igen** → öppnar kortet direkt med rätt analys, inget mellansteg.
6. **Sök på produkten** → "PRODUKT HITTADES → Öppna produktkort" öppnar **samma** kort, inte
   formuläret.
7. **Skanna en helt ny okänd produkt** → samma rena flöde.

---

## BESLUT att logga
- **SS-075** (2026-06-02): Ta bort mellanstegs-analysen i `ProductCapture`. Insamlingsformuläret
  lämnar över ett komplett `ProductResult` (inkl. bild + produkttyp) till `ProductDetailSheet`, som
  är det enda produktkortet där analys, bild och "Bidra till databasen" sker. Fixar även
  `isNotInDb`-logiken så skannade-men-okända produkter (med streckkod) får bidrags-CTA:n.
