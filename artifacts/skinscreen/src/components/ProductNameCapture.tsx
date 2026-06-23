import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useScanProductName } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { isNative } from "@/lib/native";
import { resizeImageDataUrlToBase64, resizeImageFileToBase64 } from "@/lib/imageUtils";

/**
 * ProductNameCapture — delad OCR för förpackningens FRAMSIDA (produktnamn + märke).
 *
 * Samma pipeline som IngredientsCapture: foto → resize → base64 → vision-API.
 * Kameraknapp vid produktnamn-fältet (SS-066). Sage-bakgrund (SS-067).
 */
export interface ProductNameCaptureProps {
  productName: string;
  brand: string;
  onProductNameChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  /**
   * SS-083 (#2): tvinga namn/märke-kameran dold. Används i ProductCapture där
   * framsidesfotot redan tas av ProductImageCapture (som även kör namn/märke-OCR),
   * så ett andra framsidesfoto är överflödigt. Default: auto-detect touch/native.
   */
  showCamera?: boolean;
  className?: string;
}

export function ProductNameCapture({
  productName,
  brand,
  onProductNameChange,
  onBrandChange,
  showCamera,
  className,
}: ProductNameCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const cameraVisible = showCamera ?? (isTouchDevice || isNative());

  const scanProductName = useScanProductName({
    mutation: {
      onSuccess: (data) => {
        const nextName = data.productName?.trim() ?? "";
        const nextBrand = data.brand?.trim() ?? "";
        if (!nextName && !nextBrand) {
          setScanError(t("productNameCapture.errScan"));
          setScanSuccess(false);
          setLowConfidence(false);
          return;
        }
        if (nextName) onProductNameChange(nextName);
        if (nextBrand) onBrandChange(nextBrand);
        setScanError(null);
        setLowConfidence(data.confidence === "low");
        setScanSuccess(true);
      },
      onError: (err) => {
        const apiError = (err as Error & { response?: { data?: { error?: string } } })?.response
          ?.data?.error;
        setScanError(apiError ?? t("productNameCapture.errScan"));
        setScanSuccess(false);
        setLowConfidence(false);
      },
    },
  });

  const runScan = async (base64: string) => {
    setScanError(null);
    setScanSuccess(false);
    setLowConfidence(false);
    scanProductName.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    resizeImageFileToBase64(file)
      .then(runScan)
      .catch(() => setScanError(t("scanner.errReadFile")));
    event.target.value = "";
  };

  const openCamera = async () => {
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
        const base64 = await resizeImageDataUrlToBase64(photo.dataUrl);
        await runScan(base64);
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
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={productName}
            onChange={(e) => {
              setScanSuccess(false);
              onProductNameChange(e.target.value);
            }}
            disabled={scanning}
            placeholder={t("contribute.productName")}
            className={`input-base ${cameraVisible ? "pr-12" : ""}`}
          />
          {cameraVisible && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                data-touch-target
                onClick={() => void openCamera()}
                disabled={scanning}
                aria-label={t("productNameCapture.scanFront")}
                title={t("productNameCapture.scanFront")}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : scanSuccess ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden />
                )}
              </button>
            </>
          )}
        </div>

        <input
          type="text"
          value={brand}
          onChange={(e) => {
            setScanSuccess(false);
            onBrandChange(e.target.value);
          }}
          disabled={scanning}
          placeholder={t("contribute.brand")}
          className="input-base"
        />
      </div>

      {scanning && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          {t("productNameCapture.scanning")}
        </p>
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
