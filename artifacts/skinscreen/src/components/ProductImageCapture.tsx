import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useScanProductName } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { isNative } from "@/lib/native";
import { resizeImageDataUrlToBase64, resizeImageFileToBase64 } from "@/lib/imageUtils";

/**
 * ProductImageCapture — EN front-of-bottle-bild som blir produktbilden
 * (`image_url` i cached_products).
 *
 * SS-083 (#2): tidigare tog användaren TVÅ framsidesfoton — ett här (bilden) och
 * ett till i ProductNameCapture (för namn/märke-OCR). Det är samma flaska. Nu tar
 * ETT foto både bilden OCH kör namn/märke-OCR på samma bild när `onScanResult` ges.
 * Flödet blir: streckkod → 1 framsidesfoto (bild + namn/märke) → 1 ingrediensfoto.
 *
 * Controlled komponent — föräldern äger `value` (data-URL eller URL-sträng) och
 * `onChange`. Utan `onScanResult` beter den sig som förr (bara bild, ingen OCR).
 *
 * Två states:
 * 1. Tom: klickbar gråtonad ruta med kameraikon + "Lägg till produktbild"-text
 * 2. Med bild: visar bilden + kryss-ikon i hörnet för att ta bort
 */
export interface ProductImageScanResult {
  productName?: string;
  brand?: string;
  confidence?: string;
}

export interface ProductImageCaptureProps {
  /** Aktuell bild som data-URL eller fjärr-URL. Null/undefined = tom state. */
  value: string | null | undefined;
  /** Anropas med data-URL för ny bild, eller null när användaren rensar. */
  onChange: (next: string | null) => void;
  /**
   * SS-083 (#2): om satt körs namn/märke-OCR på SAMMA framsidesfoto och resultatet
   * skickas hit. Lämnas tom där bilden inte ska driva namn/märke (bakåtkompatibelt).
   */
  onScanResult?: (result: ProductImageScanResult) => void;
  /** Tvinga kamera-knappen synlig/dold. Default: auto-detect touch/native. */
  showCamera?: boolean;
  /** Extra Tailwind/utility-klasser på yttre wrappern. */
  className?: string;
}

export function ProductImageCapture({
  value,
  onChange,
  onScanResult,
  showCamera,
  className,
}: ProductImageCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const cameraEnabled = showCamera ?? (isTouchDevice || isNative());

  const scanProductName = useScanProductName({
    mutation: {
      onSuccess: (data) => {
        const nextName = data.productName?.trim() ?? "";
        const nextBrand = data.brand?.trim() ?? "";
        if (!nextName && !nextBrand) {
          // Bilden sparas ändå — bara OCR:n hittade inget läsbart namn/märke.
          setScanSuccess(false);
          setLowConfidence(false);
          return;
        }
        onScanResult?.({ productName: nextName || undefined, brand: nextBrand || undefined, confidence: data.confidence });
        setScanError(null);
        setLowConfidence(data.confidence === "low");
        setScanSuccess(true);
      },
      onError: () => {
        // Bilden behålls; namn/märke kan skrivas in för hand.
        setScanError(t("productNameCapture.errScan"));
        setScanSuccess(false);
        setLowConfidence(false);
      },
    },
  });

  const runScan = (base64: string) => {
    if (!onScanResult) return;
    setScanError(null);
    setScanSuccess(false);
    setLowConfidence(false);
    scanProductName.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    // Kör namn/märke-OCR på samma fil (egen resize-pipeline för OCR-endpointen).
    if (onScanResult) {
      resizeImageFileToBase64(file)
        .then(runScan)
        .catch(() => setScanError(t("scanner.errReadFile")));
    }
    event.target.value = "";
  };

  const openCapture = async () => {
    setScanError(null);
    if (isNative()) {
      try {
        const photo = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (!photo.dataUrl) return;
        onChange(photo.dataUrl);
        if (onScanResult) {
          const base64 = await resizeImageDataUrlToBase64(photo.dataUrl);
          runScan(base64);
        }
      } catch {
        setScanError(t("productNameCapture.errScan"));
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const scanning = scanProductName.isPending;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        // Bara `capture` på touch-enheter — desktop får vanlig fil-väljare
        {...(cameraEnabled ? { capture: "environment" as const } : {})}
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        // Bild laddad — visa preview + kryss för att ta bort
        <div className="relative overflow-hidden rounded-xl border border-[var(--line)]">
          <img
            src={value}
            alt=""
            className="block h-40 w-full object-cover"
          />
          <button
            type="button"
            data-touch-target
            onClick={() => {
              onChange(null);
              setScanSuccess(false);
              setLowConfidence(false);
              setScanError(null);
            }}
            aria-label={t("productImage.remove")}
            title={t("productImage.remove")}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          {scanning && (
            <span
              className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
            >
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              {t("productNameCapture.scanning")}
            </span>
          )}
          {scanSuccess && !scanning && (
            <span
              className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.92)", color: "var(--sage-deep)" }}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {t("productNameCapture.scanFront")}
            </span>
          )}
        </div>
      ) : (
        // Tom state — klickbar yta som öppnar kamera/filväljare
        <button
          type="button"
          data-touch-target
          onClick={() => void openCapture()}
          disabled={scanning}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors hover:bg-[var(--cream)] disabled:opacity-60"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--cream-warm)",
            color: "var(--ink-soft)",
          }}
        >
          {scanning ? (
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--sage)" }} aria-hidden />
          ) : (
            <Camera className="h-6 w-6" style={{ color: "var(--sage)" }} aria-hidden />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {t("productImage.addProductPhoto")}
          </span>
          <span className="text-xs">{t("productImage.tapToPhotograph")}</span>
        </button>
      )}

      {lowConfidence && !scanning && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          {t("productNameCapture.checkResult")}
        </p>
      )}

      {scanError && (
        <p className="mt-2 text-xs" style={{ color: "var(--rose-gold-deep)" }}>
          {scanError}
        </p>
      )}
    </div>
  );
}
