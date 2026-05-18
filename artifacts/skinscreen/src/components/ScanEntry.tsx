import { useEffect, useMemo, useState } from "react";
import { Barcode, Camera, ChevronRight, Loader2, Search } from "lucide-react";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { IngredientsCapture } from "@/components/IngredientsCapture";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface ProductResult {
  product_name: string;
  productName?: string;
  brand?: string;
  /** Real EAN/UPC if produkten finns i cached_products. Null/undefined för
   * färska OCR/paste-scans som inte har en DB-post än — ProductDetailSheet
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

  const visibleRows = mode === "all" ? ROWS : ROWS.filter((row) => row === mode);
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const trimmedInput = input.trim();
  const canAnalyze =
    active === "search"
      ? trimmedInput.length >= 2
      : active === "barcode"
        ? Boolean(barcodeResult)
        : active === "ocr"
          ? pasteText.trim().length > 0
          : false;

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
      };
      const name = [data.brand, data.productName].filter(Boolean).join(" ") || suggestion.productName;
      onResult?.({
        product_name: name,
        productName: name,
        brand: data.brand,
        barcode: suggestion.barcode,
        ingredients: data.ingredients,
        image_url: data.imageUrl ?? null,
        imageUrl: data.imageUrl ?? null,
        analysis_result_json: null,
      });
      setInput("");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const rowCopy: Record<RowKind, { label: string; hint: string; icon: typeof Search }> = {
    search: { label: t("scanEntry.searchLabel"), hint: t("scanEntry.searchHint"), icon: Search },
    barcode: { label: t("scanEntry.barcodeLabel"), hint: t("scanEntry.barcodeHint"), icon: Barcode },
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
    // Om input var en EAN (8-14 siffror) så är `fallbackName` faktiskt
    // streckkoden. Propagera den så ProductDetailSheet vet att produkten
    // finns i DB:n (= dölj bidrag-knappen).
    const looksLikeEan = /^\d{8,14}$/.test(fallbackName);
    onResult?.({
      product_name: name || data.productName || fallbackName,
      productName: name || data.productName || fallbackName,
      brand: data.brand,
      barcode: looksLikeEan ? fallbackName : undefined,
      ingredients: data.ingredients,
      image_url: data.imageUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      analysis_result_json: data.analysis ?? null,
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
      onResult?.({
        product_name: t("scanner.scannedProductFallback"),
        productName: t("scanner.scannedProductFallback"),
        ingredients: text,
        image_url: null,
        imageUrl: null,
        analysis_result_json: null,
      });
      return;
    }

    setLoading(true);
    try {
      const data = await lookupProduct(trimmedInput);
      setLookupResult(data);
      emitLookupResult(data, trimmedInput);
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
          "flex min-h-[80px] w-full items-center gap-3 rounded-xl border px-4 py-4 transition-colors hover:bg-white",
          isActive ? "border-l-4 border-l-[var(--sage)] bg-white" : "bg-[var(--cream-warm)]",
        );

        if (kind === "barcode") {
          return (
            <BarcodeScanButton
              key={kind}
              onResult={(ingredients, name, barcode) => {
                setActive("barcode");
                setBarcodeResult({
                  product_name: name,
                  productName: name,
                  barcode: barcode ?? null,
                  ingredients,
                  image_url: null,
                  imageUrl: null,
                  analysis_result_json: null,
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

            {kind === "search" && isActive && (
              <div className="mt-2 rounded-xl border border-[var(--line)] bg-white p-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: "var(--ink-soft)" }}
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      setLookupResult(null);
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
                  <div className="mt-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--cream)]">
                    {suggestions.map((s) => (
                      <button
                        key={s.barcode}
                        type="button"
                        data-touch-target
                        onClick={() => void selectSuggestion(s)}
                        className="flex w-full items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white"
                      >
                        {s.imageUrl ? (
                          <img
                            src={s.imageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 shrink-0 rounded-md"
                            style={{ backgroundColor: "var(--cream-warm)" }}
                          />
                        )}
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
                {lookupResult?.found && lookupResult.ingredients && (
                  <button
                    type="button"
                    onClick={() => emitLookupResult(lookupResult, trimmedInput)}
                    className="mt-3 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left hover:bg-primary/10"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {lookupResult.productName}
                      </span>
                      {lookupResult.brand && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {lookupResult.brand}
                        </span>
                      )}
                    </span>
                  </button>
                )}

                {trimmedInput && lookupResult && !lookupResult.found && !loading &&
                  suggestions.length === 0 && !suggestLoading && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("myShelf.productNotFound")}
                    </p>
                  )}
              </div>
            )}

            {kind === "ocr" && isActive && (
              <IngredientsCapture
                value={pasteText}
                onChange={setPasteText}
                className="mt-2 rounded-xl border border-[var(--line)] bg-white p-3"
              />
            )}
          </div>
        );
      })}

      <button
        type="button"
        data-touch-target
        disabled={!canAnalyze || loading}
        onClick={() => void handleAnalyze()}
        className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity disabled:cursor-not-allowed"
        style={
          canAnalyze
            ? { backgroundColor: "var(--sage)", color: "#FFFFFF" }
            : { backgroundColor: "var(--line)", color: "var(--ink-soft)" }
        }
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {t("scanEntry.analyze")}
      </button>
    </div>
  );
}
