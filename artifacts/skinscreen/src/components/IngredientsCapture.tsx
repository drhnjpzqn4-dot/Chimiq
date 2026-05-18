import { useMemo, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useScanLabel } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";

/**
 * IngredientsCapture — delad input för "ta foto / klistra in" av ingredienslista.
 *
 * Används i:
 * - ScanEntry's OCR-rad (på /app/scan)
 * - ContributeModal's ingredients-fält
 *
 * Designprincip (Pias arkitektur-filosofi): EN modul, ändras på ett ställe,
 * beter sig identiskt överallt där användaren ska mata in ingredienser.
 *
 * Controlled komponent — `value` + `onChange` hanteras av föräldern. OCR-pipelinen
 * (foto → resize → base64 → useScanLabel → text) är inbyggd och fyller `value`
 * via `onChange` vid lyckad OCR.
 *
 * Kamera-knappen syns bara på touch-enheter där en `<input type="file"
 * capture="environment">` ger en meningsfull upplevelse (iOS Safari öppnar
 * nativ kamera, Android Chrome ger kamera/galleri-val). På desktop visas bara
 * textarea.
 */
export interface IngredientsCaptureProps {
  /** Aktuell ingredienssträng (kontrollerad av föräldern). */
  value: string;
  /** Anropas både vid manuell paste och vid lyckad OCR. */
  onChange: (next: string) => void;
  /** Placeholder för textarea. */
  placeholder?: string;
  /** Antal rader i textarean. Default: 5 på desktop, 3 på touch. */
  rows?: number;
  /** Tvinga kamera-knappen synlig/dold. Default: auto-detect touch device. */
  showCamera?: boolean;
  /** Extra Tailwind/utility-klasser på yttre wrappern. */
  className?: string;
}

export function IngredientsCapture({
  value,
  onChange,
  placeholder,
  rows,
  showCamera,
  className,
}: IngredientsCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const cameraVisible = showCamera ?? isTouchDevice;
  const effectiveRows = rows ?? (cameraVisible ? 3 : 5);

  const scanLabel = useScanLabel({
    mutation: {
      onSuccess: (data) => {
        onChange(data.ingredients);
        setOcrError(null);
      },
      onError: (err) => {
        const apiError = (err as Error & { response?: { data?: { error?: string } } })?.response
          ?.data?.error;
        setOcrError(apiError ?? t("scanner.errReadLabel"));
      },
    },
  });

  // Mirror av IngredientScanner-pipelinen: läs fil, rita till canvas (max
  // 1500px edge för bandbredd/perf), exportera som base64 JPEG (0.85), POSTa
  // till OCR-endpoint via useScanLabel-hook.
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    event.target.value = "";
  };

  return (
    <div className={className}>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={scanLabel.isPending}
            className="mb-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
          >
            {scanLabel.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-4 w-4" aria-hidden />
            )}
            {scanLabel.isPending ? t("scanEntry.ocrProcessing") : t("scanEntry.cameraOpen")}
          </button>
        </>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t("scanEntry.pastePlaceholder")}
        rows={effectiveRows}
        className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--cream)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {ocrError && (
        <p className="mt-2 text-xs" style={{ color: "var(--rose-gold-deep)" }}>
          {ocrError}
        </p>
      )}
    </div>
  );
}
