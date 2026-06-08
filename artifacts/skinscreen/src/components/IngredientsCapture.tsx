import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { useScanLabel } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";
import { resizeImageFileToBase64 } from "@/lib/imageUtils";

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
  // SS-079 (#2): after a PHOTO OCR we show a soft "verify the whole list came
  // through" notice. Round/curved bottles lose their edges in a flat photo and
  // the old flow said nothing. Non-blocking — the textarea below is editable.
  const [showCompletenessNotice, setShowCompletenessNotice] = useState(false);

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
        setShowCompletenessNotice(true);
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
    resizeImageFileToBase64(file)
      .then((base64) => {
        scanLabel.mutate({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      })
      .catch(() => setOcrError(t("scanner.errReadFile")));
    event.target.value = "";
  };

  return (
    <div className={className}>
      <div className="relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? t("scanEntry.pastePlaceholder")}
          rows={effectiveRows}
          className={`w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--cream)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            cameraVisible ? "pr-12" : ""
          }`}
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
            {/* Liten kameraikon överlagd i textareans övre högra hörn.
                Klick → öppnar kamera/galleri. Pia's UX-princip: kameran
                tillhör fältet den fyller, inte en separat knapp ovan. */}
            <button
              type="button"
              data-touch-target
              onClick={() => fileInputRef.current?.click()}
              disabled={scanLabel.isPending}
              aria-label={t("scanEntry.cameraOpen")}
              title={t("scanEntry.cameraOpen")}
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--sage)", color: "#FFFFFF" }}
            >
              {scanLabel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="h-4 w-4" aria-hidden />
              )}
            </button>
          </>
        )}
      </div>

      {scanLabel.isPending && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          {t("scanEntry.ocrProcessing")}
        </p>
      )}

      {ocrError && (
        <p className="mt-2 text-xs" style={{ color: "var(--rose-gold-deep)" }}>
          {ocrError}
        </p>
      )}

      {showCompletenessNotice && value.trim() && (
        <div
          className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: "var(--amber-soft)", color: "var(--amber-deep)" }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="flex-1 text-xs leading-relaxed">
            Obs: på runda eller böjda flaskor kan kanterna falla bort i fotot.
            Kontrollera att <strong>hela</strong> ingredienslistan kom med — komplettera
            i rutan ovan vid behov.
          </p>
          <button
            type="button"
            onClick={() => setShowCompletenessNotice(false)}
            aria-label="Stäng"
            className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
