# SS-074 — One Product Card: fix three critical bugs
**Datum:** 2026-05-28  
**Prioritet:** 🔴 Kritisk — fixa innan betatest

---

## Bakgrund och kontext

Pia testade appen i butiken (TestFlight, iOS) med NIVEA Q10 Anti-Wrinkle (EAN 4006000089812).  
Flödet var brutet på tre ställen:

1. **Falskt "SÄKER"** — appen visade "Säker" direkt efter barcode-skanning, trots att produkten innehåller endocrine disruptors. Orsak: OBF-importerade produkter har ofta tomma ingredienslistor, AI analyserar tom lista → `overallSafe: true` → "Säker".
2. **Bild sparades inte** — `imageDataUrl` skickas från frontend men är inte med i `ManualContributionBody`-schemat, så bilden tappas bort på servern.
3. **Bidrag uppdaterar aldrig `cached_products`** — `/contribute/manual`-routen gör `upsert` med `ignoreDuplicates: true`, dvs. om produkten REDAN finns i `cached_products` uppdateras varken ingredienser eller bild. Den gamla (tomma) ingredienslistan lever kvar.

Kombinationseffekten: scan → tom ingredienslista → "Säker". Bidra → sparas inte i DB → nästa scan: fortfarande "Säker".

**Designbeslut SS-074:** ETT produktkort är alltid single source of truth. All data (ingredienser, bild, analys) lever på produktkortet. Bidrag uppdaterar kortet direkt. Analysen sparas och cachar sig på kortet.

---

## Filer att ändra

```
artifacts/api-server/src/routes/contribute.ts       ← Bug 2 + 3 + cache-invalidering
artifacts/skinscreen/src/components/ProductDetailSheet.tsx  ← Bug 1
artifacts/skinscreen/src/components/ProductCapture.tsx      ← Bug 2 (verifiera fältnamn)
```

---

## Fix 1 — Visa INTE säker-verdict när ingredienslistan är tom

**Fil:** `artifacts/skinscreen/src/components/ProductDetailSheet.tsx`

Hitta funktionen `verdictFromProduct` (rad ~88). Lägg till ett early-return överst:

```typescript
function verdictFromProduct(product: ProductDetailProduct, status?: IngredientStatusLevel): ProductVerdict | null {
  // SS-074: Om ingredienserna saknas eller är väldigt korta kan vi inte ge ett säkert utlåtande.
  // Visa inget verdict alls istället för falskt "Säker".
  const rawIngredients = product.ingredients ?? product.ingredient_list ?? "";
  if (!rawIngredients.trim() || rawIngredients.trim().length < 30) return null;

  const analysis = product.analysis_result_json ?? product.analysisResultJson ?? null;
  // ... resten av funktionen oförändrad
```

Detta gör att produkter utan ingredienser visar "Analysera"-knappen istället för en falsk trygghetsindikator.

---

## Fix 2 — Lägg till `imageDataUrl` i `ManualContributionBody`-schemat

**Fil:** `artifacts/api-server/src/routes/contribute.ts`

Hitta `ManualContributionBody` (rad ~127) och lägg till image-fältet:

```typescript
const ManualContributionBody = z.object({
  productName: z.string().trim().max(500).optional(),
  brand: z.string().trim().max(200).optional(),
  barcode: z.string().trim().regex(/^[0-9]{8,14}$/).optional(),
  ingredients: z.string().trim().max(10000).optional(),
  productType: ProductTypeSchema.optional(),
  source_type: z.enum(["package", "manufacturer_site", "other"]).optional(),
  source_note: z.string().trim().max(500).optional(),
  // SS-074: base64-bilddata från frontendens ProductCapture
  imageDataUrl: z.string().max(5_000_000).optional(),   // ~3.75 MB dekodad
}).refine(...)
```

---

## Fix 3 — Uppdatera `cached_products` och invalidera analyscache vid bidrag

**Fil:** `artifacts/api-server/src/routes/contribute.ts`  
**Route:** `router.post("/contribute/manual", ...)` (rad ~417)

### 3a — Extrahera `imageDataUrl` ur body

Hitta raden som destructurar body (rad ~425):
```typescript
const { barcode, productName, brand, ingredients, productType } = parseResult.data;
```
Ändra till:
```typescript
const { barcode, productName, brand, ingredients, productType, imageDataUrl } = parseResult.data;
```

### 3b — Ladda upp bild till Supabase Storage (om imageDataUrl finns)

Lägg till följande block DIREKT EFTER `safeIngredients`-sanitering och INNAN `user_submitted_products`-inserten:

```typescript
// SS-074: Ladda upp produktbild till Supabase Storage om den skickats med
let uploadedImageUrl: string | null = null;
if (imageDataUrl && barcode) {
  try {
    const supabase = supabaseAdmin;
    // Strippa data-URI-prefix om den finns: "data:image/jpeg;base64,..."
    const base64 = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
    const buffer = Buffer.from(base64, "base64");
    const filePath = `products/${barcode}/front-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("chimiq-uploads")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from("chimiq-uploads")
        .getPublicUrl(filePath);
      uploadedImageUrl = publicUrlData.publicUrl;
    } else {
      req.log.warn({ err: uploadError }, "Image upload failed (non-fatal)");
    }
  } catch (err) {
    req.log.warn({ err }, "Image upload threw (non-fatal)");
  }
}
```

### 3c — Ändra `upsert` så att befintliga produkter faktiskt uppdateras

Hitta det nuvarande upsert-blocket (rad ~458) med `ignoreDuplicates: true`. Ersätt hela blocket:

```typescript
// SS-074: Använd ignoreDuplicates: false + uppdatera bara fält som faktiskt skickats med.
// Gamla data bevaras om fältet är null/undefined i detta bidrag.
if (barcode && !barcode.startsWith("CHIMIQ_")) {
  const patch: Record<string, unknown> = {
    barcode,
    product_name: safeName ?? "Unknown product",
    brand: safeBrand ?? "",
    source: "user",
    product_type: productType ?? "skincare",
  };
  if (safeIngredients?.trim()) patch.ingredients = safeIngredients;
  if (uploadedImageUrl) patch.image_url = uploadedImageUrl;

  const { error: cacheError } = await supabaseAdmin
    .from("cached_products")
    .upsert(patch, { onConflict: "barcode", ignoreDuplicates: false });

  if (cacheError) {
    req.log.warn({ err: cacheError }, "Auto-cache upsert failed (non-fatal)");
  } else if (safeIngredients?.trim()) {
    // SS-074: Invalidera eventuell gammal analyscache för detta barcode
    // så att nästa analys körs mot de nya ingredienserna.
    // Vi tar bort ALLA analysis_cache-rader vars hash matchar den GAMLA ingredienslistan.
    // Enklast: ta bort alla rader med scan_type="single" kopplade till detta barcode
    // via products-tabellen. Alternativt: ta bort via product_barcode om kolumnen finns.
    // Säker fallback: ta bort via product_barcode-kolumn om den existerar, annars skip.
    const { error: cacheDelErr } = await supabaseAdmin
      .from("analysis_cache")
      .delete()
      .eq("product_barcode", barcode)   // Finns kolumnen? Om inte, kommentera bort denna rad
      .eq("scan_type", "single");
    if (cacheDelErr) {
      req.log.info({ barcode }, "analysis_cache invalidation skipped (column may not exist — non-fatal)");
    } else {
      req.log.info({ barcode }, "analysis_cache invalidated after ingredient update");
    }
  }
}
```

> **OBS:** Om kolumnen `product_barcode` inte finns i `analysis_cache` — kolla med:
> ```sql
> SELECT column_name FROM information_schema.columns 
> WHERE table_name = 'analysis_cache';
> ```
> Om den inte finns, skippa `.delete()`-blocket för nu och ta upp en migration som lägger till den.

### 3d — Uppdatera svaret från `/contribute/manual` med `imageUrl`

Lägg till `imageUrl` i `res.json(...)` i slutet av routen:
```typescript
res.json({
  submissionId: data.id,
  status: "needs_admin",
  extractedIngredients: safeIngredients,
  imageUrl: uploadedImageUrl,   // SS-074: returnera faktisk URL så frontend kan uppdatera kortet
  message: "Thank you! Your submission is under review — we'll add it soon.",
});
```

---

## Fix 4 — Produktkortet uppdateras live efter bidrag (frontend)

**Fil:** `artifacts/skinscreen/src/components/ProductCapture.tsx`

Hitta `handleContribute` och dess `onSuccess`-callback. Idag skickas bara `(ingredients, productName)` vidare. Uppdatera så att `imageUrl` från svaret också skickas:

```typescript
if (res.ok) {
  const json = await res.json();
  setContributed(true);
  // SS-074: skicka med imageUrl från servern om den returnerades
  const confirmedIngredients = json.extractedIngredients ?? ingredients.trim();
  const confirmedImageUrl = json.imageUrl ?? null;
  if (confirmedIngredients && onAnalyzed) {
    onAnalyzed({
      product_name: productName,
      productName,
      brand,
      barcode,
      ingredients: confirmedIngredients,
      image_url: confirmedImageUrl,
      imageUrl: confirmedImageUrl,
      analysis_result_json: null, // triggar re-analys på ProductDetailSheet
    });
  }
}
```

**Och uppdatera `ContributeModal.tsx`** — `onSuccess`-signaturen tar idag bara `(ingredients, name)`. Lägg till `imageUrl`:
```typescript
onSuccess?: (ingredients: string, productName: string, imageUrl?: string | null) => void;
```

---

## Bonus — verifiera att `analysis_cache` har `product_barcode`-kolumn

Kör i Supabase SQL Editor:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'analysis_cache' 
ORDER BY ordinal_position;
```

Om `product_barcode` saknas — skapa migration `0038_analysis_cache_barcode.sql`:
```sql
ALTER TABLE analysis_cache ADD COLUMN IF NOT EXISTS product_barcode TEXT;
CREATE INDEX IF NOT EXISTS idx_analysis_cache_barcode ON analysis_cache(product_barcode) WHERE product_barcode IS NOT NULL;
```

Och i `analyze-single.ts`, när en analys sparas i cachen, lägg till `product_barcode` om den skickas med i request body.

---

## Testplan efter fix

1. **Skanna NIVEA Q10 (EAN 4006000089812)** — ska visa "Inga ingredienser" / "Analysera"-knapp, INTE "Säker"
2. **Bidra med ingredienser + ta foto** — ska:
   - Spara bild i Supabase Storage → `chimiq-uploads/products/4006000089812/front-xxx.jpg`
   - Uppdatera `cached_products.ingredients` och `image_url`
   - Ta bort gammal `analysis_cache`-rad
3. **Skanna samma produkt igen** — ska nu köra ny analys mot riktiga ingredienser → "Hög risk"
4. **Skanna en ny produkt som aldrig funnits** — ska fungera som vanligt

---

## BESLUT loggat
- **SS-074** (2026-05-28): One Product Card — bidrag uppdaterar alltid `cached_products` direkt, bild sparas i Storage, analyscachen invalideras vid ingrediensuppdatering.
