import { useEffect, useState } from "react";

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
 * Använder Image()-preload i useEffect istället för React:s syntetiska onError,
 * eftersom onError inte är tillförlitligt i WKWebView (Capacitor/iOS).
 *
 * Visar emoji-platshållare om:
 *   - src saknas / är null / undefined
 *   - bilden inte kan laddas (404, nätverksfel, CORS, etc.)
 */
export function ProductImage({
  src,
  imgClassName = "h-10 w-10 rounded-xl object-cover",
  fallbackClassName = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl",
  fallbackEmoji = "🧴",
  alt = "",
}: ProductImageProps) {
  const [status, setStatus] = useState<"loading" | "ok" | "failed">(
    src ? "loading" : "failed",
  );

  useEffect(() => {
    if (!src) {
      setStatus("failed");
      return;
    }
    setStatus("loading");
    const img = new window.Image();
    img.onload = () => setStatus("ok");
    img.onerror = () => setStatus("failed");
    img.src = src;
  }, [src]);

  if (status === "failed") {
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

  // status === "loading" eller "ok" — visa bilden (hidden tills ok för att undvika blink)
  return (
    <img
      src={src ?? ""}
      alt={alt}
      className={imgClassName}
      style={status === "loading" ? { opacity: 0 } : undefined}
      onLoad={() => setStatus("ok")}
      onError={() => setStatus("failed")}
    />
  );
}
