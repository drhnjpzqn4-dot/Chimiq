import { useMemo, useRef } from "react";
import { Camera, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/**
 * ProductImageCapture — delad input för att fota själva produkten/förpackningen.
 *
 * Skiljt från IngredientsCapture: detta är för förpackningsbilden som blir
 * `image_url` i cached_products, inte för OCR-foto av ingredienslistan.
 *
 * Controlled komponent — föräldern äger `value` (data-URL eller URL-sträng)
 * och `onChange`. Komponenten hanterar bara filval + visning.
 *
 * Två states:
 * 1. Tom: klickbar gråtonad ruta med kameraikon + "Lägg till produktbild"-text
 * 2. Med bild: visar bilden + kryss-ikon i hörnet för att ta bort
 *
 * Designprincip (SS-068): EN modul, samma beteende överallt där användaren
 * ska bidra med en produktbild.
 */
export interface ProductImageCaptureProps {
  /** Aktuell bild som data-URL eller fjärr-URL. Null/undefined = tom state. */
  value: string | null | undefined;
  /** Anropas med data-URL för ny bild, eller null när användaren rensar. */
  onChange: (next: string | null) => void;
  /** Tvinga kamera-knappen synlig/dold. Default: auto-detect touch device. */
  showCamera?: boolean;
  /** Extra Tailwind/utility-klasser på yttre wrappern. */
  className?: string;
}

export function ProductImageCapture({
  value,
  onChange,
  showCamera,
  className,
}: ProductImageCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
  const cameraEnabled = showCamera ?? isTouchDevice;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

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
            onClick={() => onChange(null)}
            aria-label={t("productImage.remove")}
            title={t("productImage.remove")}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        // Tom state — klickbar yta som öppnar kamera/filväljare
        <button
          type="button"
          data-touch-target
          onClick={() => fileInputRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors hover:bg-[var(--cream)]"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--cream-warm)",
            color: "var(--ink-soft)",
          }}
        >
          <Camera className="h-6 w-6" style={{ color: "var(--sage)" }} aria-hidden />
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {t("productImage.addProductPhoto")}
          </span>
          <span className="text-xs">{t("productImage.tapToPhotograph")}</span>
        </button>
      )}
    </div>
  );
}
