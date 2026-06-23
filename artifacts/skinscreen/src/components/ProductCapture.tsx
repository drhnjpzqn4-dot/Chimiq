import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { ProductNameCapture } from "@/components/ProductNameCapture";
import { ProductImageCapture } from "@/components/ProductImageCapture";
import { useTranslation } from "@/lib/i18n";
import type { ProductResult } from "@/components/ScanEntry";
import type { ProductType } from "@/components/ProductTypeBadge";

interface ProductCaptureInitialData {
  productName?: string;
  brand?: string;
  barcode?: string;
  ingredients?: string;
  imageUrl?: string | null;
}

interface ProductCaptureProps {
  initialData?: ProductCaptureInitialData;
  /**
   * SS-075: Anropas när användaren trycker "Öppna produktkort". Lämnar över
   * ALLT som samlats in (bild, namn, varumärke, streckkod, produkttyp,
   * ingredienser) till det enda produktkortet (ProductDetailSheet), där analys
   * och "Bidra till databasen" sker. Detta formulär analyserar INTE själv —
   * det visar inget "Säker"-verdict och har inga spara/bidra-knappar längre.
   */
  onAnalyzed?: (result: ProductResult) => void;
  className?: string;
}

export function ProductCapture({ initialData, onAnalyzed, className }: ProductCaptureProps) {
  const { t } = useTranslation();
  const [productName, setProductName] = useState(initialData?.productName ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [barcode, setBarcode] = useState(initialData?.barcode ?? "");
  const [ingredients, setIngredients] = useState(initialData?.ingredients ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );
  const [productType, setProductType] = useState<ProductType>("skincare");

  // SS-075: produkten är "ny" här (kommer från en skanning/sök som inte fanns i
  // cached_products). Markera inCache: false så produktkortet vet att den ska
  // erbjuda "Bidra till databasen".
  const canOpenCard = ingredients.trim().length > 10;

  const buildProductResult = (): ProductResult => ({
    product_name:
      [brand.trim(), productName.trim()].filter(Boolean).join(" ") ||
      t("contribute.scannedProductFallback"),
    productName:
      [brand.trim(), productName.trim()].filter(Boolean).join(" ") ||
      t("contribute.scannedProductFallback"),
    brand: brand.trim() || undefined,
    barcode: barcode.trim() || null,
    ingredients: ingredients.trim(),
    image_url: imageDataUrl,
    imageUrl: imageDataUrl,
    // SS-075: ingen analys här — produktkortet kör "Analysera nu" själv.
    analysis_result_json: null,
    productType,
    inCache: false,
  });

  const handleOpenCard = () => {
    if (!canOpenCard) return;
    onAnalyzed?.(buildProductResult());
  };

  return (
    <div className={className}>
      {/* SS-083 (#2): ETT framsidesfoto — blir både produktbilden OCH läser
          namn/märke via OCR. Namn/märke-fälten nedan förifylls och är redigerbara. */}
      <div className="mb-1">
        <ProductImageCapture
          value={imageDataUrl}
          onChange={setImageDataUrl}
          onScanResult={(r) => {
            if (r.productName) setProductName(r.productName);
            if (r.brand) setBrand(r.brand);
          }}
        />
      </div>
      <p className="mb-4 text-xs" style={{ color: "var(--ink-soft)" }}>
        {t("productImage.frontPhotoHint")}
      </p>

      {/* Formulärfält — namn/märke kommer från framsidesfotot ovan (kamera dold här
          så användaren inte ombeds fota samma flaska två gånger). */}
      <div className="space-y-3">
        <ProductNameCapture
          productName={productName}
          brand={brand}
          onProductNameChange={setProductName}
          onBrandChange={setBrand}
          showCamera={false}
        />
        <input
          type="text"
          inputMode="numeric"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))}
          placeholder={t("contribute.barcode")}
          className="input-base"
        />
        <div>
          <label className="text-sm font-medium text-[var(--ink)] block mb-1">
            Produkttyp
          </label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as ProductType)}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="skincare">Hudvård</option>
            <option value="cosmetics">Smink</option>
            <option value="other">Övrigt</option>
          </select>
        </div>
        {/* Ingredienser med kamera-OCR (IngredientsCapture = SS-066) */}
        <IngredientsCapture
          value={ingredients}
          onChange={setIngredients}
          rows={6}
        />
      </div>

      {/* FlaskConical-platshållare — visas när varken bild eller ingredienser finns */}
      {!imageDataUrl && ingredients.trim().length === 0 && (
        <div
          className="mt-4 flex h-32 w-full items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--cream-warm)" }}
        >
          <FlaskConical className="h-10 w-10" style={{ color: "var(--ink-soft)" }} aria-hidden />
        </div>
      )}

      {/* SS-075: EN knapp — lämnar över till produktkortet. Ingen inline-analys,
          inget "Säker", inga spara/bidra-knappar här. */}
      <button
        type="button"
        disabled={!canOpenCard}
        onClick={handleOpenCard}
        className="btn-primary mt-4"
      >
        {t("scan.openProductCard")}
      </button>
    </div>
  );
}
