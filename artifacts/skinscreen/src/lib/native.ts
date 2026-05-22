import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

/**
 * Production backend used by the native shell. The Capacitor WebView origin
 * is `capacitor://localhost` (iOS) or `https://localhost` (Android), so any
 * relative `/api/...` fetch would hit the local origin. The fetch
 * interceptor below rewrites them to absolute URLs against this host.
 */
export const NATIVE_API_BASE_URL =
  "https://workspaceapi-server-production-58f9.up.railway.app";

export const MANAGE_SUBSCRIPTION_WEB_URL = `${NATIVE_API_BASE_URL}/pricing`;

export const NATIVE_AUTH_SCHEME = "skinscreen://";
export const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";

/**
 * Open an external URL. On native uses the in-app system browser
 * (SFSafariViewController / Chrome Custom Tabs), required for App Store
 * compliant OAuth and for Stripe Checkout / Billing. On web falls back to
 * window.location.href.
 */
export async function openExternal(
  url: string,
  opts?: { presentation?: "popover" | "fullscreen" },
) {
  if (!isNative()) {
    if (typeof window !== "undefined") window.location.href = url;
    return;
  }
  await Browser.open({
    url,
    presentationStyle: opts?.presentation === "popover" ? "popover" : "fullscreen",
  });
}

/**
 * Resolve the API base URL for the current platform:
 * - Native (Capacitor): always uses NATIVE_API_BASE_URL
 * - Web with VITE_API_URL set: uses that env var (e.g. direct Railway URL)
 * - Web without VITE_API_URL: returns empty string (relative URLs, same origin)
 *
 * Production web (Vercel + rewrite till Railway): lämna VITE_API_URL tom så
 * att session-kakor från /api hamnar på samma host som appen.
 */
export function getApiBaseUrl(): string {
  if (isNative()) return NATIVE_API_BASE_URL;
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  return envUrl ? envUrl.replace(/\/+$/, "") : "";
}

/**
 * Install a global fetch interceptor that rewrites relative `/api/...` requests
 * to absolute URLs against the correct backend. Works for both native (Capacitor)
 * and web (when VITE_API_URL is set). No-op when neither applies. Idempotent.
 */
let nativeFetchInstalled = false;
export function installNativeFetchInterceptor() {
  if (nativeFetchInstalled) return;
  if (typeof window === "undefined") return;

  const apiBase = getApiBaseUrl();
  // Nothing to rewrite — relative fetches will hit the same origin correctly
  if (!apiBase) return;

  nativeFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr: string | undefined;
    if (typeof input === "string") urlStr = input;
    else if (input instanceof URL) urlStr = input.toString();
    else if (input instanceof Request) urlStr = input.url;

    if (urlStr) {
      const isRelativeApi =
        urlStr.startsWith("/api/") ||
        urlStr.startsWith("api/") ||
        urlStr.startsWith("./api/");
      if (isRelativeApi) {
        const path = urlStr.startsWith("/") ? urlStr : `/${urlStr.replace(/^\.\//, "")}`;
        const absolute = `${apiBase}${path}`;
        if (input instanceof Request) {
          return originalFetch(new Request(absolute, input), init);
        }
        return originalFetch(absolute, init);
      }
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}
