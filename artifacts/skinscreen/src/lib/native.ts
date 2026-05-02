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
export const NATIVE_API_BASE_URL = "https://app.chimiq.app";

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
 * Install a global fetch interceptor that rewrites relative `/api/...` requests
 * to absolute URLs against the production backend when running inside the
 * Capacitor native shell. No-op on web. Idempotent — call once at startup.
 */
let nativeFetchInstalled = false;
export function installNativeFetchInterceptor() {
  if (nativeFetchInstalled) return;
  if (typeof window === "undefined") return;
  if (!isNative()) return;
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
        const absolute = `${NATIVE_API_BASE_URL}${path}`;
        if (input instanceof Request) {
          return originalFetch(new Request(absolute, input), init);
        }
        return originalFetch(absolute, init);
      }
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}
