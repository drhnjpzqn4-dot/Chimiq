import { useState } from "react";

interface ProductImageProps {
  src: string | null | undefined;
  /** className på <img>-elementet, t.ex. "h-10 w-10 rounded-xl object-cover" */
  imgClassName?: string;
  /** className på emoji-wrapper-spann */
  fallbackClassName?: string;
  /** Emoji att visa när bild saknas eller felar. Default: 🧴 */
  fallbackEmoji?: string;
  /** Alt-text på bilden. Default: "" (dekorativ) */
  alt?: string;
}

/**
 * Enhetlig produktbild med automatisk emoji-fallback.
 *
 * Visar emoji-platshållare om:
 *   - src saknas / är null / undefined
 *   - bilden inte kan laddas (onError)
 *
 * Följer SS-designsystemet: cream-warm bakgrund på fallback.
 */
export function ProductImage({
  src,
  imgClassName = "h-10 w-10 rounded-xl object-cover",
  fallbackClassName = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl",
  fallbackEmoji = "🧴",
  alt = "",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={fallbackClassName}
        style={{ backgroundColor: "var(--cream-warm)" }}
        aria-hidden
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      onError={() => setFailed(true)}
    />
  );
}
