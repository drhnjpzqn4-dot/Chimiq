import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { ProductImageCapture } from "@/components/ProductImageCapture";
import { useTranslation } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

interface ContributeModalProps {
  barcode?: string;
  initialProductName?: string;
  initialBrand?: string;
  initialIngredients?: string;
  onSuccess?: (ingredients: string, productName: string) => void;
  onClose: () => void;
}

type SourceType = "package" | "manufacturer_site" | "other" | "";

interface SubmitResult {
  extractedIngredients?: string | null;
  status?: string;
  message?: string;
  premiumUnlocked?: boolean;
  premiumUntil?: string | null;
}

export function ContributeModal({
  barcode,
  initialProductName = "",
  initialBrand = "",
  initialIngredients = "",
  onSuccess,
  onClose,
}: ContributeModalProps) {
  const { t } = useTranslation();
  const [productName, setProductName] = useState(initialProductName);
  const [brand, setBrand] = useState(initialBrand);
  const [barcodeInput, setBarcodeInput] = useState(() => (barcode ?? "").replace(/\D/g, ""));
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [ingredientsText, setIngredientsText] = useState(initialIngredients);
  const [sourceType, setSourceType] = useState<SourceType>("");
  const [sourceOther, setSourceOther] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [brandSuggestLoading, setBrandSuggestLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    const query = brand.trim();
    if (query.length < 2) {
      setBrandSuggestions([]);
      setBrandSuggestLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBrandSuggestLoading(true);
      apiFetch(`/api/products/brands?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return { brands: [] };
          return (await res.json()) as { brands?: string[] };
        })
        .then((data) => setBrandSuggestions((data.brands ?? []).slice(0, 5)))
        .catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            setBrandSuggestions([]);
          }
        })
        .finally(() => setBrandSuggestLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [brand]);

  const handleSubmit = useCallback(async () => {
    const trimmedText = ingredientsText.trim();
    const trimmedBarcode = barcodeInput.trim();
    const hasText = trimmedText.length > 0;
    if (!hasText && !trimmedBarcode) {
      setError(t("contribute.errIngredientsOrBarcode"));
      return;
    }
    if (hasText && trimmedText.length > 5) {
      const looksLikeCode = /<[a-z!\/][^>]*>|javascript:|on\w+\s*=|;\s*--|\bdrop\s+table\b|\bselect\s+.+\bfrom\b/i.test(trimmedText);
      if (looksLikeCode) {
        setError(t("contribute.errInvalidIngredients"));
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch("/api/contribute/manual", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim() || undefined,
          brand: brand.trim() || undefined,
          barcode: trimmedBarcode || undefined,
          ingredients: trimmedText || undefined,
          // Förpackningsbild som data-URL (image/* base64). Backend lägger
          // den i Supabase storage och uppdaterar cached_products.image_url
          // efter att bidraget godkänts. Om backend-stöd saknas just nu
          // ignoreras fältet — gör inte submit oanvändbar.
          imageDataUrl: imageDataUrl ?? undefined,
          source_type: sourceType || undefined,
          source_note: sourceType === "other" ? sourceOther.trim() || undefined : undefined,
        }),
      });

      const data = (await res.json()) as SubmitResult & { error?: string; issues?: { message: string }[] };
      if (!res.ok) {
        const firstIssue = data.issues?.[0]?.message;
        throw new Error(firstIssue ?? data.error ?? t("contribute.errSubmitFailed"));
      }

      setResult(data);

      if (trimmedText && onSuccess) {
        const name = [brand.trim(), productName.trim()].filter(Boolean).join(" ") || t("contribute.scannedProductFallback");
        onSuccess(trimmedText, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("contribute.errSubmissionFailed"));
    } finally {
      setSubmitting(false);
    }
  }, [barcodeInput, ingredientsText, sourceType, sourceOther, onSuccess, brand, productName]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/40 bg-white px-5 pb-3 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("contribute.helpUsAddProduct")}
            </p>
            <h2 className="mt-0.5 font-serif text-lg font-medium leading-tight text-foreground">
              {t("contribute.oneStepTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("contribute.close")}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {result ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{t("contribute.received")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.message ?? t("contribute.savedThanks")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t("contribute.done")}
              </button>
            </div>
          ) : (
            <>
              <Field label={t("contribute.productName")}>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-border/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>

              <Field label={t("contribute.brand")}>
                <div className="relative">
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full rounded-xl border border-border/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {(brandSuggestions.length > 0 || brandSuggestLoading) && (
                    <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-border/60 bg-white shadow-lg">
                      {brandSuggestLoading && brandSuggestions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">{t("common.loading")}</p>
                      ) : (
                        brandSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setBrand(suggestion);
                              setBrandSuggestions([]);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary/5"
                          >
                            {suggestion}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Field>

              <Field label={t("contribute.barcode")}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
                  className="w-full rounded-xl border border-border/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>

              {/* Förpackningsbild — separat från ingrediens-OCR. Blir
                  image_url i cached_products efter moderation. */}
              <Field label={t("contribute.productImage")}>
                <ProductImageCapture
                  value={imageDataUrl}
                  onChange={setImageDataUrl}
                />
              </Field>

              <Field label={t("contribute.ingredients")}>
                {/* Delad input — kameraikon i textareans hörn + inbyggd OCR
                    via samma pipeline som ScanEntry's OCR-rad. EN modul,
                    samma beteende överallt (BESLUT-SS-066). */}
                <IngredientsCapture
                  value={ingredientsText}
                  onChange={setIngredientsText}
                  rows={7}
                />
              </Field>

              <Field label={t("contribute.sourceLabel")}>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as SourceType)}
                  className="w-full rounded-xl border border-border/60 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{t("contribute.sourceOptional")}</option>
                  <option value="package">{t("contribute.sourcePackage")}</option>
                  <option value="manufacturer_site">{t("contribute.sourceManufacturer")}</option>
                  <option value="other">{t("contribute.sourceOther")}</option>
                </select>
                {sourceType === "other" && (
                  <input
                    type="text"
                    value={sourceOther}
                    onChange={(e) => setSourceOther(e.target.value)}
                    placeholder={t("contribute.sourceOtherPlaceholder")}
                    className="mt-2 w-full rounded-xl border border-border/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
              </Field>

              {error && <p className="text-center text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("contribute.save")}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
