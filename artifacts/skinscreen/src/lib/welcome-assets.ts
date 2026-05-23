/** localStorage — bump suffix when onboarding changes materially. */
export const WELCOME_SEEN_STORAGE_KEY = "chimiq.welcome_seen_v2";

/** Resolve a file from `public/` (works in browser, Capacitor WebView, and SSR build). */
export function publicAssetUrl(pathFromPublicRoot: string): string {
  const relative = pathFromPublicRoot.replace(/^\//, "");
  const base = import.meta.env.BASE_URL ?? "/";
  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;

  if (typeof window === "undefined") {
    return `${baseWithSlash}${relative}`;
  }

  return new URL(`${baseWithSlash}${relative}`, window.location.href).href;
}

export const welcomeBgWhiteUrl = () => publicAssetUrl("images/welcome-bg-white.jpg");
export const welcomeBgMarbleUrl = () => publicAssetUrl("images/welcome-bg-marble.jpg");
