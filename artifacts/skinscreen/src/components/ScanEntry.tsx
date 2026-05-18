import { useMemo, useRef, useState } from "react";
import { Barcode, Camera, ChevronRight, Loader2, Search } from "lucide-react";
import { BarcodeScanButton } from "@/components/BarcodeScanButton";
import { useScanLabel } from "@workspace/api-client-react";
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
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR mutation — when a photo is captured we POST the image to the backend
  // OCR endpoint and the response's `ingredients` text drops into the paste
  // textarea. The user can then tweak it before tapping Analysera.
  const scanLabel = useScanLabel({
    mutation: {
      onSuccess: (data) => {
        setPasteText(data.ingredients);
        setOcrError(null);
      },
      onError: (err) => {
        const apiError = (err as Error & { response?: { data?: { error?: string } } })?.response
          ?.data?.error;
        setOcrError(apiError ?? t("scanner.errReadLabel"));
      },
    },
  });

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

  // Mirror of IngredientScanner's photo-to-OCR pipeline: resize on canvas
  // (max 1500px edge) before sending base64 JPEG to the backend OCR endpoint.
  const handleOcrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError(null);
    const reader = new FileReader();
    reader.onerror = () => setOcrError(t("scanner.errReadFile"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => setOcrError(t("scanner.errDecode"));
      img.onload = () => {
        const MAX_EDGE = 1500;
        let { width, height } = img;
        if (width > MAX_EDGE || height > MAX_EDGE) {
          if (width >= height) {
            height = Math.round((height * MAX_EDGE) / width);
            width = MAX_EDGE;
          } else {
            width = Math.round((width * MAX_EDGE) / height);
            height = MAX_EDGE;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setOcrError(t("scanner.errImgProcessing"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        scanLabel.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
    onResult?.({
      product_name: name || data.productName || fallbackName,
      productName: name || data.productName || fallbackName,
      brand: data.brand,
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

                {trimmedInput && lookupResult && !lookupResult.found && !loading && (
                  <p className="mt-2 text-xs text-muted-foreground">{t("myShelf.productNotFound")}</p>
                )}
              </div>
            )}

            {kind === "ocr" && isActive && (
              <div className="mt-2 space-y-2 rounded-xl border border-[var(--line)] bg-white p-3">
                {isTouchDevice && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleOcrFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      data-touch-target
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanLabel.isPending}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
                    >
                      {scanLabel.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Camera className="h-4 w-4" aria-hidden />
                      )}
                      {scanLabel.isPending
                        ? t("scanEntry.ocrProcessing")
                        : t("scanEntry.cameraOpen")}
                    </button>
                  </>
                )}
                <textarea
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder={t("scanEntry.pastePlaceholder")}
                  rows={isTouchDevice ? 3 : 5}
                  className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--cream)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {ocrError && (
                  <p className="text-xs" style={{ color: "var(--rose-gold-deep)" }}>
                    {ocrError}
                  </p>
                )}
              </div>
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
