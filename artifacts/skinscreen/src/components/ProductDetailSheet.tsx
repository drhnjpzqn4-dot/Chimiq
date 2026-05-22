import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, FlaskConical, Plus } from "lucide-react";
import { getGetShelfQueryKey } from "@workspace/api-client-react";
import type { RoutineConflict, ShelfResponse } from "@workspace/api-client-react";
import { ShelfConflictBanner, type IngredientStatusLevel } from "@/components/IngredientStatusDot";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

type ProductVerdict = "safe" | "caution" | "danger";

type ProductAnalysis = {
  verdict?: ProductVerdict;
  overallSafe?: boolean;
  summary?: string;
  verdictSummary?: string;
  flaggedIngredients?: Array<{
    name?: string;
    ingredient?: string;
    reason?: string;
    explanation?: string;
    severity?: "low" | "medium" | "high" | string;
  }>;
  flags?: Array<{
    name?: string;
    ingredient?: string;
    reason?: string;
    explanation?: string;
    severity?: string;
  }>;
  safeIngredients?: string[];
};

export interface ProductDetailProduct {
  shelfId?: number;
  barcode?: string | null;
  product_name?: string;
  productName?: string;
  brand?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  ingredients?: string | null;
  analysis_result_json?: ProductAnalysis | null;
  analysisResultJson?: ProductAnalysis | null;
}

interface ProductDetailSheetProps {
  product: ProductDetailProduct;
  status?: IngredientStatusLevel;
  conflicts?: RoutineConflict[];
  onClose: () => void;
  /**
   * Optional callback invoked when the user wants to contribute / save this
   * product to the public DB. Triggered when the product has no real barcode
   * (i.e. it came from a fresh OCR/paste scan and is not in cached_products
   * yet). Receives the prefill that should be passed to ContributeModal.
   */
  onContribute?: (prefill: {
    productName?: string;
    brand?: string;
    ingredients?: string;
  }) => void;
  initialEditMode?: boolean;
}

function verdictFromProduct(product: ProductDetailProduct, status?: IngredientStatusLevel): ProductVerdict | null {
  const analysis = product.analysis_result_json ?? product.analysisResultJson ?? null;
  if (!analysis) return null;
  if (analysis?.verdict) return analysis.verdict;
  if (analysis?.overallSafe === true) return "safe";
  const flags = analysis?.flaggedIngredients ?? analysis?.flags ?? [];
  if (flags.some((flag) => String(flag.severity ?? "").toLowerCase().includes("high"))) return "danger";
  if (flags.length > 0) return "caution";
  if (status === "high") return "danger";
  if (status === "caution") return "caution";
  if (status === "safe") return "safe";
  return null;
}

function normalizeFlags(product: ProductDetailProduct) {
  const analysis = product.analysis_result_json ?? product.analysisResultJson ?? null;
  return (analysis?.flaggedIngredients ?? analysis?.flags ?? [])
    .map((flag) => ({
      name: flag.name ?? flag.ingredient ?? "",
      reason: flag.reason ?? flag.explanation ?? "",
      severity: String(flag.severity ?? "").toLowerCase(),
    }))
    .filter((flag) => flag.name);
}

export function ProductDetailSheet({
  product,
  status,
  conflicts = [],
  onClose,
  initialEditMode,
}: ProductDetailSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [completionValue, setCompletionValue] = useState("");
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionDone, setCompletionDone] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<ProductAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialImageUrl = product.image_url ?? product.imageUrl ?? null;
  const initialBarcode = product.barcode ?? null;
  const rawNameSource = (product.product_name ?? product.productName ?? "").trim();
  const placeholderProductNames = new Set([
    t("scanner.scannedProductFallback"),
    t("shelf.unknownProduct"),
  ]);
  const hasRealProductName =
    rawNameSource.length > 0 && !placeholderProductNames.has(rawNameSource);
  const initialProductName = hasRealProductName ? rawNameSource : "";
  const needsNameInput = !hasRealProductName;
  const initialIngredients = product.ingredients?.trim() ?? "";
  const [localProductName, setLocalProductName] = useState(initialProductName);
  const [localBrand, setLocalBrand] = useState(product.brand ?? "");
  const [localBarcode, setLocalBarcode] = useState(initialBarcode ?? "");
  const [localIngredients, setLocalIngredients] = useState(initialIngredients);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(initialImageUrl);
  const [editMode, setEditMode] = useState(initialEditMode ?? false);
  const [editName, setEditName] = useState(initialProductName);
  const [editBrand, setEditBrand] = useState(product.brand ?? "");
  const [editBarcode, setEditBarcode] = useState(initialBarcode ?? "");
  const [editIngredients, setEditIngredients] = useState(initialIngredients);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [, setEditDone] = useState(false);
  const imageUrl = localImageUrl;
  const barcode = localBarcode || null;
  const productName = localProductName;
  const analysis = localAnalysis ?? product.analysis_result_json ?? product.analysisResultJson ?? null;
  const productForAnalysis = { ...product, analysis_result_json: analysis };
  const verdict = verdictFromProduct(productForAnalysis, status);
  const flaggedIngredients = normalizeFlags(productForAnalysis);
  const summary = analysis?.summary ?? analysis?.verdictSummary ?? null;
  const substantiveConflicts = conflicts.filter((conflict) => conflict.severity !== "SAFE");
  const rawIngredients = localIngredients.trim();
  const editedIngredients = editIngredients.trim();
  const showAnalyzeButton =
    (!verdict && rawIngredients.length > 10) ||
    (editMode && editedIngredients.length > 10 && editedIngredients !== rawIngredients);
  const showVerdictBadge = Boolean(verdict);
  const showNoAnalysisHint = !verdict && rawIngredients.length <= 10;
  const ingredientPreview = expanded || rawIngredients.length <= 520
    ? rawIngredients
    : `${rawIngredients.slice(0, 520).trim()}...`;
  const verdictCopy =
    verdict === "danger"
      ? t("product.danger")
      : verdict === "caution"
        ? t("product.caution")
        : t("product.safe");
  const verdictStyle =
    verdict === "danger"
      ? { backgroundColor: "#C94F4F", color: "#FFFFFF" }
      : verdict === "caution"
        ? { backgroundColor: "var(--premium-gold)", color: "var(--ink)" }
        : { backgroundColor: "var(--sage)", color: "#FFFFFF" };
  // Products without a real barcode cannot be patched in cached_products.
  // Offer a contribution flow instead so OCR/paste scans can be saved.
  const isNotInDb = !barcode || barcode.startsWith("CHIMIQ_");
  const missingField =
    isNotInDb
      ? null
      : !imageUrl
        ? "image"
          : !localBrand
          ? "brand"
          : null;

  const saveCompletion = async (field: "brand", value: string) => {
    if (!barcode || !value.trim()) return;
    setCompletionSaving(true);
    setCompletionError(null);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCompletionDone(true);
    } catch {
      setCompletionError(t("complete.saveError"));
    } finally {
      setCompletionSaving(false);
    }
  };

  const saveImageCompletion = async (file: File) => {
    setCompletionSaving(true);
    setCompletionError(null);
    try {
      const imageBase64 = await fileToBase64(file);
      setLocalImageUrl(`data:${file.type || "image/jpeg"};base64,${imageBase64}`);
      if (!barcode) return;
      const res = await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCompletionDone(true);
    } catch {
      setCompletionError(t("complete.saveError"));
    } finally {
      setCompletionSaving(false);
    }
  };

  const handleSaveEdits = async () => {
    if (editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const nextName = editName.trim() || productName;
      const nextBrand = editBrand.trim();
      const nextBarcode = editBarcode.trim();
      const nextIngredients = editIngredients.trim();

      if (isNotInDb) {
        const body: Record<string, string> = {};
        if (nextName && nextName !== t("shelf.unknownProduct")) body["productName"] = nextName;
        if (nextBrand) body.brand = nextBrand;
        if (/^[0-9]{8,14}$/.test(nextBarcode)) body.barcode = nextBarcode;
        if (nextIngredients) body.ingredients = nextIngredients;

        const res = await apiFetch("/api/contribute/manual", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, source_type: "package" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setCompletionDone(true);
      } else if (barcode) {
        const body: Record<string, string> = {};
        if (nextBarcode && nextBarcode !== barcode) body.barcode = nextBarcode;
        if (nextBrand !== localBrand) body.brand = nextBrand;
        if (nextIngredients !== rawIngredients) body.ingredients = nextIngredients;
        if (Object.keys(body).length > 0) {
          await apiFetch(`/api/products/${encodeURIComponent(barcode)}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }

      setLocalProductName(nextName);
      setLocalBrand(nextBrand);
      setLocalBarcode(nextBarcode);
      setLocalIngredients(nextIngredients);
      setEditMode(false);
      setEditDone(true);
    } catch {
      setEditError(t("contribute.errSubmissionFailed"));
    } finally {
      setEditSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const ingredientsToAnalyze = editMode ? editedIngredients : rawIngredients;
    if (!ingredientsToAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await apiFetch("/api/analyze-single", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientsToAnalyze }),
      });
      if (res.ok) {
        const data = await res.json() as ProductAnalysis;
        setLocalAnalysis(data);
        if (product.shelfId && ingredientsToAnalyze === rawIngredients) {
          queryClient.setQueryData<ShelfResponse>(getGetShelfQueryKey(), (current) => {
            if (!current) return current;
            return {
              ...current,
              products: current.products.map((shelfProduct) =>
                shelfProduct.id === product.shelfId
                  ? { ...shelfProduct, analysisResultJson: data }
                  : shelfProduct,
              ),
            };
          });
          void apiFetch(`/api/shelf/${product.shelfId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisResultJson: data }),
          });
        }
      }
    } catch {
      // silent fail — user sees "ingen analys" och kan försöka igen
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/20" />
        <div className="px-5 pt-5">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt=""
                className="h-[200px] max-h-[200px] w-full rounded-2xl object-cover"
              />
              {editMode && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" aria-hidden />
                      {t("product.changeImage")}
                    </span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              className="relative flex h-[200px] max-h-[200px] w-full items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--cream-warm)" }}
            >
              <FlaskConical className="h-12 w-12" style={{ color: "var(--ink-soft)" }} aria-hidden />
              {editMode && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <Camera className="h-8 w-8" style={{ color: "var(--sage)" }} aria-hidden />
                    <span className="text-xs font-semibold">{t("product.addImage")}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <SheetHeader className="px-5 pb-2 pt-4 text-left">
          {editMode || needsNameInput ? (
            <input
              type="text"
              value={editName}
              onChange={(event) => {
                setEditName(event.target.value);
                if (needsNameInput) setLocalProductName(event.target.value);
              }}
              placeholder={needsNameInput ? t("product.tapToAddName") : undefined}
              className="input-base font-serif text-xl"
              style={{ color: "var(--ink)" }}
            />
          ) : (
            <SheetTitle className="font-serif text-2xl font-medium leading-tight" style={{ color: "var(--ink)" }}>
              {productName}
            </SheetTitle>
          )}
          <div className="mt-1 flex items-center justify-between gap-2">
            {editMode ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  type="text"
                  value={editBrand}
                  onChange={(event) => setEditBrand(event.target.value)}
                  className="input-base text-sm"
                  placeholder={t("contribute.brand")}
                />
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(event) => setEditBarcode(event.target.value)}
                  className="input-base text-sm"
                  placeholder={t("contribute.barcode")}
                />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                {localBrand && (
                  <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                    {localBrand}
                  </p>
                )}
                {barcode && !barcode.startsWith("CHIMIQ_") && (
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    EAN: {barcode}
                  </p>
                )}
              </div>
            )}
            {!editMode && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: "var(--cream-warm)", color: "var(--ink-soft)" }}
              >
                {t("product.edit")}
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-8 pt-3">
          <div className="space-y-3">
            {showVerdictBadge && (
              <span
                className="inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                style={verdictStyle}
              >
                {verdictCopy}
              </span>
            )}
            {showNoAnalysisHint && (
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                {t("product.noAnalysis")}
              </p>
            )}
            {showAnalyzeButton && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="btn-primary w-full sm:w-auto"
                style={{ fontSize: 13, padding: "10px 16px" }}
              >
                {isAnalyzing ? t("scanner.analysing") : t("product.analyzeNow")}
              </button>
            )}
          </div>

          {summary && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              {summary}
            </p>
          )}

          {substantiveConflicts.length > 0 && (
            <div className="space-y-2">
              {substantiveConflicts.map((conflict) => (
                <ShelfConflictBanner key={`${conflict.product1Name}-${conflict.product2Name}-${conflict.pair}`}>
                  <span className="block font-medium">{conflict.pair}</span>
                  <span className="mt-1 block font-normal leading-snug">{conflict.explanation}</span>
                </ShelfConflictBanner>
              ))}
            </div>
          )}

          {flaggedIngredients.length > 0 && (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--rose-gold)" }}>
                {t("product.flaggedIngredients")}
              </h3>
              <div className="mt-3 space-y-3">
                {flaggedIngredients.map((flag) => (
                  <div key={`${flag.name}-${flag.severity}`}>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: "var(--rose-soft)", color: "var(--rose-gold-deep)" }}
                    >
                      {flag.name}
                    </span>
                    {flag.reason && (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                        {flag.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--rose-gold)" }}>
              {t("product.ingredients")}
            </h3>
            {rawIngredients ? (
              <>
                {editMode ? (
                  <textarea
                    value={editIngredients}
                    onChange={(event) => setEditIngredients(event.target.value)}
                    rows={6}
                    className="textarea-base mt-2 font-mono text-xs"
                  />
                ) : (
                  <p
                    className="mt-2 max-h-40 overflow-hidden whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--cream-warm)] p-3 font-mono text-xs leading-relaxed"
                    style={{ color: "var(--ink-soft)", maxHeight: expanded ? "none" : 160 }}
                  >
                    {ingredientPreview}
                  </p>
                )}
                {!editMode && rawIngredients.length > 520 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-2 text-sm font-semibold"
                    style={{ color: "var(--rose-gold-deep)" }}
                  >
                    {expanded ? t("product.showLess") : t("product.showAll")}
                  </button>
                )}
              </>
            ) : editMode ? (
              <textarea
                value={editIngredients}
                onChange={(event) => setEditIngredients(event.target.value)}
                rows={6}
                className="textarea-base mt-2 font-mono text-xs"
                placeholder={t("contribute.ingredients")}
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("product.ingredientsMissing")}
              </p>
            )}
          </section>

          {editMode && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={() => void handleSaveEdits()}
                disabled={editSaving}
                className="btn-primary flex-1"
                style={{ height: 40, fontSize: 13 }}
              >
                {editSaving
                  ? t("common.loading")
                  : isNotInDb
                    ? t("complete.contributeProductCta")
                    : t("product.saveEdits")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setEditName(productName);
                  setEditBrand(localBrand);
                  setEditBarcode(barcode ?? "");
                  setEditIngredients(rawIngredients);
                }}
                className="btn-secondary"
                style={{ height: 40, fontSize: 13, flex: "0 0 80px" }}
              >
                {t("common.cancel")}
              </button>
              {editError && <p className="basis-full text-xs text-red-500">{editError}</p>}
            </div>
          )}

          {missingField && !completionDone && (
            <section className="border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {missingField === "image"
                    ? t("complete.imagePrompt")
                    : t("complete.brandPrompt")}
              </h3>
              {missingField === "image" ? (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void saveImageCompletion(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={completionSaving}
                    onClick={() => imageInputRef.current?.click()}
                    className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "var(--premium-gold)" }}
                  >
                    {completionSaving ? t("common.loading") : t("complete.photoCta")}
                  </button>
                </>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    inputMode="text"
                    value={completionValue}
                    onChange={(event) => setCompletionValue(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={completionSaving || !completionValue.trim()}
                    onClick={() => void saveCompletion(missingField, completionValue)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "var(--premium-gold)" }}
                  >
                    {t("complete.save")}
                  </button>
                </div>
              )}
              {/* Poäng-text borttagen per SS-059 (bidrag är inte en spel-mekanik) */}
              {completionError && <p className="mt-2 text-xs text-red-500">{completionError}</p>}
            </section>
          )}

          {/* Bidrags-CTA: produkten saknar real barcode = inte i cached_products.
              Öppnar editMode direkt så bidraget sker i samma produktkort. */}
          {isNotInDb && !editMode && !completionDone && (
            <section className="border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {t("complete.contributeProductPrompt")}
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                {t("complete.contributeProductHint")}
              </p>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="btn-contribute mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--premium-gold)" }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("complete.contributeProductCta")}
              </button>
              {/* Poäng-text borttagen per SS-059 */}
            </section>
          )}

          {completionDone && (
            <p className="border-t border-[var(--line)] pt-5 text-sm font-medium" style={{ color: "var(--sage-deep)" }}>
              {t("complete.thanks")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
    };
    reader.readAsDataURL(file);
  });
}
