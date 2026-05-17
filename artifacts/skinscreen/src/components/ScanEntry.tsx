import { useEffect, useState } from "react";
import { Barcode, Camera, ChevronRight, Loader2, Search } from "lucide-react";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface ProductResult {
  product_name: string;
  productName?: string;
  brand?: string;
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

interface ScanEntryProps {
  onResult?: (product: ProductResult) => void;
  onPhoto?: () => void;
  mode?: "all" | "search" | "barcode" | "ocr";
  className?: string;
}

type RowKind = "search" | "barcode" | "ocr";

const ROWS: RowKind[] = ["search", "barcode", "ocr"];

export function ScanEntry({ onResult, onPhoto, mode = "all", className }: ScanEntryProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(mode === "search");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const visibleRows = mode === "all" ? ROWS : ROWS.filter((row) => row === mode);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = input.trim();
      setQuery(trimmed.length >= 2 ? trimmed : "");
      if (trimmed.length < 2) setLookupResult(null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/products/lookup?q=${encodeURIComponent(query)}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return { found: false };
        return (await res.json()) as ProductLookupResult;
      })
      .then((data) => {
        if (!cancelled) setLookupResult(data);
      })
      .catch(() => {
        if (!cancelled) setLookupResult({ found: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const rowCopy: Record<RowKind, { label: string; hint: string; icon: typeof Search }> = {
    search: { label: t("scanEntry.searchLabel"), hint: t("scanEntry.searchHint"), icon: Search },
    barcode: { label: t("scanEntry.barcodeLabel"), hint: t("scanEntry.barcodeHint"), icon: Barcode },
    ocr: { label: t("scanEntry.photoLabel"), hint: t("scanEntry.photoHint"), icon: Camera },
  };

  const rowContent = (kind: RowKind) => {
    const Icon = rowCopy[kind].icon;
    return (
      <>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
          <Icon className="h-6 w-6" style={{ color: "var(--sage)" }} aria-hidden />
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
        const active = kind === "search" && expanded;
        const rowClassName = cn(
          "flex w-full items-center gap-3 rounded-xl border bg-[var(--cream-warm)] px-3 py-3 transition-colors hover:bg-white",
          active ? "border-l-4 border-l-[var(--sage)]" : "",
        );

        if (kind === "barcode") {
          return (
            <BarcodeScanButton
              key={kind}
              onResult={(ingredients, name, barcode) => {
                onResult?.({
                  product_name: name,
                  productName: name,
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
                if (kind === "search") setExpanded((value) => !value);
                if (kind === "ocr") onPhoto?.();
              }}
              className={rowClassName}
              style={{ borderColor: "var(--line)" }}
            >
              {rowContent(kind)}
            </button>

            {kind === "search" && expanded && (
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
                    onChange={(event) => setInput(event.target.value)}
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

                {lookupResult?.found && lookupResult.ingredients && (
                  <button
                    type="button"
                    onClick={() => {
                      const name = [lookupResult.brand, lookupResult.productName].filter(Boolean).join(" ");
                      onResult?.({
                        product_name: name || lookupResult.productName || query,
                        productName: name || lookupResult.productName || query,
                        brand: lookupResult.brand,
                        ingredients: lookupResult.ingredients,
                        image_url: lookupResult.imageUrl ?? null,
                        imageUrl: lookupResult.imageUrl ?? null,
                        analysis_result_json: lookupResult.analysis ?? null,
                      });
                    }}
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

                {query && lookupResult && !lookupResult.found && !loading && (
                  <p className="mt-2 text-xs text-muted-foreground">{t("myShelf.productNotFound")}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
