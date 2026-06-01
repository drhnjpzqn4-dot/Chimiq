import { useEffect, useMemo, useRef, useState } from "react";
import { Barcode, Camera, CheckCircle2, ChevronRight, Loader2, Search } from "lucide-react";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { ProductCapture } from "@/components/ProductCapture";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { ProductType } from "@/components/ProductTypeBadge";
import { ProductImage } from "@/components/ProductImage";

export interface ProductResult {
  product_name: string;
  productName?: string;
  brand?: string;
  productType?: ProductType;
  /** Real EAN/UPC if produkten finns i cached_products. Null/undefined för
   * färska OCR/paste-scans som inte har en DB-post än — Produktdatablad (ProductDetailSheet)
   * använder detta för att avgöra om "Spara denna produkt"-knappen ska
   * visas (bara om barcode saknas). */
  barcode?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  ingredients?: string;
  analysis_result_json?: ProductDetailAnalysis | null;
}

interface ProductDetailAnalysis {
  verdict?: "safe" | "caution" | "danger";
  summary?: string;
  flaggedIngredients?: Array<{
    name: string;
    reason: string;
    severity: "low" | "medium" | "high";
  }>;
  safeIngredients?: string[];
}

interface ProductLookupResult {
  found: boolean;
  productName?: string;
  brand?: string;
  ingredients?: string;
  imageUrl?: string | null;
  analysis?: ProductDetailAnalysis | null;
  barcode?: string;
  productType?: ProductType;
}

interface ProductSuggestion {
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
}

interface ScanEntryProps {
  onResult?: (product: ProductResult) => void;
  mode?: "all" | "search" | "barcode" | "ocr";
  className?: string;
}

type RowKind = "search" | "barcode" | "ocr";

const ROWS: RowKind[] = ["search", "barcode", "ocr"];

export function ScanEntry({ onResult, mode = "all", className }: ScanEntryProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<RowKind | null>(mode === "all" ? null : mode);
  const [input, setInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<ProductResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [productType, setProductType] = useState<ProductType | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const visibleRows = mode === "all" ? ROWS : ROWS.filter((row) => row === mode);
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const trimmedInput = input.trim();
  const hasCapturedResult =
    (active === "barcode" && barcodeResult !== null) ||
    (active === "search" && lookupResult?.found === true && Boolean(lookupResult.ingredients)) ||
    // OCR: visa captured-kortet först när BÅDE text och produkttyp finns —
    // annars försvinner produkttyp-väljaren innan användaren hinner välja, och
    // "Öppna produktkort" blir dödfödd (handleAnalyze kräver productType).
    (active === "ocr" && pasteText.trim().length > 0 && Boolean(productType));
  const canAnalyze =
    active === "search"
      ? hasCapturedResult || trimmedInput.length >= 2
      : active === "barcode"
        ? Boolean(barcodeResult)
        : active === "ocr"
          ? pasteText.trim().length > 0 && Boolean(productType)
          : false;

  const clearCaptured = () => {
    setBarcodeResult(null);
    setLookupResult(null);
    setInput("");
    setPasteText("");
    setSuggestions([]);
    setShowCapture(false);
    setProductType(undefined);
  };

  const capturedDisplayName =
    active === "barcode"
      ? barcodeResult?.product_name ?? barcodeResult?.productName ?? ""
      : active === "search"
        ? [lookupResult?.brand, lookupResult?.productName].filter(Boolean).join(" ") ||
          lookupResult?.productName ||
          ""
        : t("scanner.scannedProductFallback");

  const capturedBrand =
    active === "barcode" ? barcodeResult?.brand : lookupResult?.brand;

  const capturedEan =
    active === "barcode"
      ? barcodeResult?.barcode ?? null
      : lookupResult?.barcode ?? (/^\d{8,14}$/.test(trimmedInput) ? trimmedInput : null);

  // Debounced typeahead against the Chimiq cached_products table. Hits
  // /api/products?q=...&limit=8, which searches product_name, brand AND
  // barcode-prefix (backend update). EAN-prefix typeahead funkar: skriv
  // "1234" → matchande streckkoder dyker upp som förslag. Endast en
  // KOMPLETT EAN (8–14 siffror) skippas — då vill användaren göra
  // exact barcode-lookup via Analysera.
  useEffect(() => {
    if (active !== "search") return;
    const query = input.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    // Full EAN (8-14 siffror) skippas — Analysera-knappen kör exact lookup
    if (/^\d{8,14}$/.test(query)) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    const controller = new AbortController();
    setSuggestLoading(true);
    const timer = window.setTimeout(() => {
      apiFetch(`/api/products?q=${encodeURIComponent(query)}&limit=8`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return { products: [] };
          return (await res.json()) as {
            products?: Array<{
              barcode: string;
              productName: string;
              brand: string;
              imageUrl: string | null;
            }>;
          };
        })
        .then((data) => {
          setSuggestions(
            (data.products ?? []).map((p) => ({
              barcode: p.barcode,
              productName: p.productName,
              brand: p.brand,
              imageUrl: p.imageUrl,
            })),
          );
        })
        .catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            setSuggestions([]);
          }
        })
        .finally(() => setSuggestLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [input, active]);

  // Pull full product (with ingredients) for a tapped suggestion, then emit
  // onResult so the parent runs analyse + opens ProductDetailSheet. We pass
  // the suggestion's barcode straight through so ProductDetailSheet knows
  // this product is already in cached_products and does NOT show the
  // "Spara denna produkt"-bidragsknapp.
  const selectSuggestion = async (suggestion: ProductSuggestion) => {
    setInput("");
    setSuggestions([]);
    setLookupResult(null);
    searchInputRef.current?.blur();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(suggestion.barcode)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        productName?: string;
        brand?: string;
        ingredients?: string;
        imageUrl?: string | null;
        analysisResultJson?: ProductDetailAnalysis | null;
      };
      setLookupResult({
        found: true,
        productName: data.productName ?? suggestion.productName,
        brand: data.brand ?? suggestion.brand,
        ingredients: data.ingredients,
        imageUrl: data.imageUrl ?? null,
        // Use cached analysis so "Öppna" doesn't trigger a fresh AI call
        // for products that have already been analysed.
        analysis: data.analysisResultJson ?? null,
        barcode: suggestion.barcode,
      });
    } finally {
      setLoading(false);
    }
  };

  const rowCopy: Record<RowKind, { label: string; hint: string; icon: typeof Search }> = {
    search: { label: t("scanEntry.searchLabel"), hint: t("scanEntry.searchHint"), icon: Search },
    barcode: { label: t("scanEntry.barcodeLabel"), hint: t("scan.barcodeDistanceHint"), icon: Barcode },
    ocr: { label: t("scanEntry.photoLabel"), hint: t("scanEntry.photoHint"), icon: Camera },
  };

  const lookupProduct = async (query: string): Promise<ProductLookupResult> => {
    const isEan = /^\d{8,14}$/.test(query);
    const endpoint = isEan
      ? `/api/barcode/${encodeURIComponent(query)}`
      : `/api/products/lookup?q=${encodeURIComponent(query)}`;
    const res = await apiFetch(endpoint, { credentials: "include" });
    if (!res.ok) return { found: false };
    return (await res.json()) as ProductLookupResult;
  };

  const emitLookupResult = (data: ProductLookupResult, fallbackName: string) => {
    if (!data.found || !data.ingredients) return false;
    const name = [data.brand, data.productName].filter(Boolean).join(" ");
    const looksLikeEan = /^\d{8,14}$/.test(fallbackName);
    const barcode = data.barcode ?? (looksLikeEan ? fallbackName : undefined);
    onResult?.({
      product_name: name || data.productName || fallbackName,
      productName: name || data.productName || fallbackName,
      brand: data.brand,
      barcode,
      ingredients: data.ingredients,
      image_url: data.imageUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      analysis_result_json: data.analysis ?? null,
      productType: data.productType,
    });
    return true;
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || !active) return;
    if (active === "barcode") {
      if (barcodeResult) onResult?.(barcodeResult);
      return;
    }
    if (active === "ocr") {
      const text = pasteText.trim();
      if (!text) return;
      if (!productType) return;
      onResult?.({
        product_name: t("scanner.scannedProductFallback"),
        productName: t("scanner.scannedProductFallback"),
        ingredients: text,
        image_url: null,
        imageUrl: null,
        analysis_result_json: null,
        productType,
      });
      return;
    }

    if (lookupResult?.found && lookupResult.ingredients) {
      emitLookupResult(lookupResult, lookupResult.barcode ?? trimmedInput);
      return;
    }

    setLoading(true);
    try {
      const data = await lookupProduct(trimmedInput);
      const enriched: ProductLookupResult =
        data.found && /^\d{8,14}$/.test(trimmedInput)
          ? { ...data, barcode: trimmedInput }
          : data;
      setLookupResult(enriched);
    } finally {
      setLoading(false);
    }
  };

  const rowContent = (kind: RowKind) => {
    const Icon = rowCopy[kind].icon;
    const isActive = active === kind;
    return (
      <>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
          <Icon className="h-[22px] w-[22px]" style={{ color: isActive ? "var(--sage-deep)" : "var(--sage)" }} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[15px] font-medium" style={{ color: "var(--ink)" }}>
            {rowCopy[kind].label}
          </span>
          <span className="mt-0.5 block text-sm" style={{ color: "var(--ink-soft)" }}>
            {rowCopy[kind].hint}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--ink-soft)" }} aria-hidden />
      </>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {visibleRows.map((kind) => {
        const isActive = active === kind;
        const rowClassName = cn(
          "flex min-h-[80px] w-full items-center gap-3 rounded-2xl border px-4 py-4 transition-colors hover:bg-white",
          isActive ? "border-l-4 border-l-[var(--sage)] bg-white" : "bg-[var(--cream-warm)]",
        );

        if (kind === "barcode") {
          return (
            <BarcodeScanButton
              key={kind}
              onResult={(ingredients, name, barcode, scannedProductType) => {
                setActive("barcode");
                setBarcodeResult({
                  product_name: name,
                  productName: name,
                  barcode: barcode ?? null,
                  ingredients,
                  image_url: null,
                  imageUrl: null,
                  analysis_result_json: null,
                  productType: scannedProductType as ProductType | undefined,
                });
                if (barcode) {
                  try {
                    sessionStorage.setItem("skinscreen.lastBarcode", barcode);
                  } catch {
                    // ignore storage errors
                  }
                }
              }}
              triggerClassName={rowClassName}
              triggerContent={rowContent(kind)}
            />
          );
        }

        return (
          <div key={kind}>
            <button
              type="button"
              data-touch-target
              onClick={() => {
                setActive(kind);
              }}
              className={rowClassName}
              style={{ borderColor: "var(--line)" }}
            >
              {rowContent(kind)}
            </button>

            {kind === "search" && isActive && !hasCapturedResult && (
              <div className="mt-2 rounded-2xl border border-[var(--line)] bg-white p-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: "var(--ink-soft)" }}
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      setLookupResult(null);
                      setShowCapture(false);
                    }}
                    onKeyDown={(event) => {
                      // Enter söker i DB (namn ELLER EAN) via lookupProduct.
                      // Ersätter den borttagna nedersta "Analysera"-knappen
                      // (SCAN-FLOW-SPEC punkt 5: Enter ska göra något).
                      if (event.key === "Enter" && canAnalyze && !loading) {
                        event.preventDefault();
                        void handleAnalyze();
                      }
                    }}
                    placeholder={t("scan.searchPlaceholder")}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--cream)] pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {loading && (
                    <Loader2
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
                      style={{ color: "var(--ink-soft)" }}
                      aria-hidden
                    />
                  )}
                </div>

                {/* Typeahead-suggestions från Chimiqs DB. Visas medan
                    användaren skriver, klick → fetch full + emit onResult. */}
                {suggestions.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--cream)]">
                    {suggestions.map((s) => (
                      <button
                        key={s.barcode}
                        type="button"
                        data-touch-target
                        onClick={() => void selectSuggestion(s)}
                        className="flex w-full items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white"
                      >
                        <ProductImage
                          src={s.imageUrl}
                          imgClassName="h-10 w-10 shrink-0 rounded-md object-cover"
                          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-medium"
                            style={{ color: "var(--ink)" }}
                          >
                            {s.productName}
                          </span>
                          {s.brand && (
                            <span
                              className="mt-0.5 block truncate text-xs"
                              style={{ color: "var(--ink-soft)" }}
                            >
                              {s.brand}
                            </span>
                          )}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0"
                          style={{ color: "var(--ink-soft)" }}
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                )}

                {suggestLoading && suggestions.length === 0 && trimmedInput.length >= 2 && (
                  <p
                    className="mt-2 text-xs"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {t("common.loading")}
                  </p>
                )}

                {/* Tidigare "Analysera-trigger"-träff från lookupProduct.
                    Behålls för EAN-flödet (när användaren matar in 8-14 siffror
                    direkt och trycker Analysera). */}
                {trimmedInput && lookupResult && !lookupResult.found && !loading &&
                  suggestions.length === 0 && !suggestLoading && (
                    showCapture ? (
                      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-4">
                        <ProductCapture
                          initialData={{
                            barcode: /^\d{8,14}$/.test(trimmedInput) ? trimmedInput : undefined,
                          }}
                          onAnalyzed={(result) => {
                            onResult?.(result);
                            setShowCapture(false);
                            setInput("");
                            setSuggestions([]);
                            setLookupResult(null);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                          {t("myShelf.productNotFound")}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCapture(true)}
                          className="text-xs font-semibold"
                          style={{ color: "var(--premium-gold)" }}
                        >
                          {t("productCapture.addManually")}
                        </button>
                      </div>
                    )
                  )}
              </div>
            )}

            {kind === "ocr" && isActive && !hasCapturedResult && (
              <>
                <IngredientsCapture
                  value={pasteText}
                  onChange={setPasteText}
                  className="mt-2 rounded-2xl border border-[var(--line)] bg-white p-3"
                />
                {pasteText.trim().length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-[var(--ink-muted)] mb-2">
                      Vilken typ av produkt är det?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(["skincare", "cosmetics", "other"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setProductType(type)}
                          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                            productType === type
                              ? "border-[var(--sage)] bg-[var(--sage)]/10 text-[var(--sage)] font-medium"
                              : "border-[var(--border)] text-[var(--ink-muted)]"
                          }`}
                        >
                          {type === "skincare"
                            ? "Hudvård"
                            : type === "cosmetics"
                              ? "Smink"
                              : "Övrigt"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {hasCapturedResult && active && (
        <div
          className="mt-3 rounded-xl border bg-white p-4"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
              aria-hidden
            >
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--sage-deep)" }}>
                {t("scan.productFound")}
              </p>
              <p className="mt-1 text-[15px] font-medium leading-snug" style={{ color: "var(--ink)" }}>
                {capturedDisplayName}
              </p>
              {capturedBrand && (
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                  {capturedBrand}
                </p>
              )}
              {capturedEan && !String(capturedEan).startsWith("CHIMIQ_") && (
                <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--ink-soft)" }}>
                  {t("scan.capturedEan")} {capturedEan}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            data-touch-target
            disabled={loading || !canAnalyze}
            onClick={() => void handleAnalyze()}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("scan.openProductCard")}
          </button>
          <button
            type="button"
            className="mt-3 w-full text-center text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--sage-deep)" }}
            onClick={clearCaptured}
          >
            {t("scan.scanAnother")}
          </button>
        </div>
      )}

      {/* SCAN-FLOW-SPEC punkt 3: den nedersta "Analysera"-knappen borttagen.
          Analys sker ALLTID inne i produktkortet (+ på Rutin-sidan), aldrig
          direkt från Skanna-fliken. Sök triggas via typeahead + Enter; OCR och
          streckkod öppnar kortet via "Öppna produktkort" i captured-kortet. */}
    </div>
  );
}
