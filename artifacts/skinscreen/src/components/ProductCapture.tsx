import { useState } from "react";
import { CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { ProductNameCapture } from "@/components/ProductNameCapture";
import { ProductImageCapture } from "@/components/ProductImageCapture";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
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
  /** Anropas när användaren trycker "Spara i min rutin" efter analys. */
  onAnalyzed?: (result: ProductResult) => void;
  className?: string;
}

type AnalysisResult = {
  verdict?: "safe" | "caution" | "danger";
  summary?: string;
  flaggedIngredients?: Array<{ name: string; reason: string; severity: string }>;
  safeIngredients?: string[];
};

function verdictToStatus(verdict?: string): "safe" | "caution" | "high" {
  if (verdict === "danger") return "high";
  if (verdict === "caution") return "caution";
  return "safe";
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isContributing, setIsContributing] = useState(false);
  const [contributed, setContributed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>("skincare");

  const canAnalyze = ingredients.trim().length > 10 && !isAnalyzing;

  const buildProductResult = (analysisData: AnalysisResult): ProductResult => ({
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
    analysis_result_json: analysisData as ProductResult["analysis_result_json"],
    productType,
  });

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analyze-single", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredients.trim(), productType }),
      });
      if (res.ok) {
        const data = (await res.json()) as AnalysisResult;
        setAnalysis(data);
      } else {
        setError(t("product.noAnalysis"));
      }
    } catch {
      setError(t("product.noAnalysis"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToRoutine = () => {
    if (!analysis) return;
    onAnalyzed?.(buildProductResult(analysis));
  };

  const handleContribute = async () => {
    if (isContributing) return;
    setIsContributing(true);
    setError(null);
    try {
      const res = await apiFetch("/api/contribute/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim() || undefined,
          brand: brand.trim() || undefined,
          barcode: barcode.trim() || undefined,
          ingredients: ingredients.trim() || undefined,
          productType,
          imageDataUrl: imageDataUrl ?? undefined,
          source_type: "package",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setContributed(true);
        // SS-074: uppdatera kortet live med serverbekräftad ingredients + imageUrl.
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
            analysis_result_json: null,
            productType,
          });
        }
      } else {
        setError(t("contribute.errSubmitFailed"));
      }
    } catch {
      setError(t("contribute.errSubmissionFailed"));
    } finally {
      setIsContributing(false);
    }
  };

  const statusLabel = (verdict?: string) => {
    if (verdict === "danger") return t("product.danger");
    if (verdict === "caution") return t("product.caution");
    return t("product.safe");
  };

  return (
    <div className={className}>
      {/* Bild-fältet — kamera + förhandsgranskning */}
      <div className="mb-4">
        <ProductImageCapture value={imageDataUrl} onChange={setImageDataUrl} />
      </div>

      {/* Formulärfält */}
      <div className="space-y-3">
        <ProductNameCapture
          productName={productName}
          brand={brand}
          onProductNameChange={setProductName}
          onBrandChange={setBrand}
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

      {/* Analysera-knapp — visas tills analys finns */}
      {!analysis && (
        <button
          type="button"
          disabled={!canAnalyze}
          onClick={() => void handleAnalyze()}
          className="btn-primary mt-4 flex items-center justify-center gap-2"
        >
          {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isAnalyzing ? t("scanner.analysing") : t("product.analyzeNow")}
        </button>
      )}

      {/* Analysresultat + åtgärder */}
      {analysis && !contributed && (
        <div className="mt-4 space-y-3">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--cream-warm)" }}
          >
            <span
              className={`status-badge status-badge--${verdictToStatus(analysis.verdict)}`}
            >
              {statusLabel(analysis.verdict)}
            </span>
            {analysis.summary && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {analysis.summary}
              </p>
            )}
          </div>

          {/* Spara i min rutin — sage (SS-067: "för dig") */}
          {onAnalyzed && (
            <button
              type="button"
              onClick={handleSaveToRoutine}
              className="btn-primary"
            >
              {t("productCapture.saveToRoutine")}
            </button>
          )}

          {/* Bidra till databasen — gold (SS-067: "för Chimiq") */}
          <button
            type="button"
            disabled={isContributing}
            onClick={() => void handleContribute()}
            className="btn-premium flex items-center justify-center gap-2"
          >
            {isContributing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isContributing ? t("common.loading") : t("productCapture.contributeToDb")}
          </button>
        </div>
      )}

      {/* Tack-state efter bidrag */}
      {contributed && (
        <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
          >
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--ink)" }}>
              {t("contribute.received")}
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              {t("contribute.moderationNote")}
            </p>
          </div>
          {onAnalyzed && analysis && (
            <button
              type="button"
              onClick={handleSaveToRoutine}
              className="btn-primary mt-1"
            >
              {t("productCapture.saveToRoutine")}
            </button>
          )}
        </div>
      )}

      {/* FlaskConical-platshållare — visas när varken bild eller analys finns */}
      {!imageDataUrl && !analysis && !contributed && ingredients.trim().length === 0 && (
        <div
          className="mb-4 -mt-4 flex h-32 w-full items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--cream-warm)" }}
        >
          <FlaskConical className="h-10 w-10" style={{ color: "var(--ink-soft)" }} aria-hidden />
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
