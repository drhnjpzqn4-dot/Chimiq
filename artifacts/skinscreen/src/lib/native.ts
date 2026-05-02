/**
 * Native (Capacitor) adapter with web fallbacks.
 *
 * Capacitor 6 plugins are statically imported so the bundler registers
 * each plugin's JS layer at module evaluation time. On web, each plugin's
 * web shim takes over (no-ops or uses standard browser APIs). On native
 * iOS/Android, the JS bridge routes calls into the native implementation
 * registered via `cap sync`.
 *
 * The `@capacitor/*` packages are listed in BOTH:
 *   - `artifacts/skinscreen/package.json` (so the web bundle can import them)
 *   - `artifacts/skinscreen/mobile/capacitor/package.json` (so `cap sync`
 *     discovers them and registers them on the native side).
 */
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
    return "web";
  } catch {
    return "web";
  }
}

/**
 * Open an external URL.
 *
 * On native: uses @capacitor/browser → opens an in-app system browser
 * (SFSafariViewController on iOS, Chrome Custom Tabs on Android). This is
 * required for App Store-compliant OAuth and for Stripe Checkout / Billing.
 *
 * On web: falls back to window.location.href so the existing redirect flow
 * keeps working unchanged.
 */
export async function openExternal(
  url: string,
  opts?: { presentation?: "popover" | "fullscreen" },
) {
  if (!isNative()) {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
    return;
  }
  try {
    await Browser.open({
      url,
      presentationStyle: opts?.presentation === "popover" ? "popover" : "fullscreen",
    });
  } catch {
    if (typeof window !== "undefined") window.location.href = url;
  }
}

/**
 * Production backend used by the native shell. The Capacitor WebView loads
 * bundled assets from `capacitor://localhost` (iOS) or `https://localhost`
 * (Android), so any relative `/api/...` fetch would hit the local origin and
 * fail. On native we transparently rewrite those to absolute URLs against
 * this host (see installNativeFetchInterceptor).
 */
export const NATIVE_API_BASE_URL = "https://app.chimiq.app";

/**
 * URL the user should be sent to in order to manage their Premium subscription.
 * On native this is the canonical web URL — the App Store reader-app guidance
 * prohibits in-app purchase flows for digital subscriptions sold elsewhere.
 */
export const MANAGE_SUBSCRIPTION_WEB_URL = `${NATIVE_API_BASE_URL}/pricing`;

/**
 * Install a global fetch interceptor that rewrites relative `/api/...` and
 * `api/...` requests to absolute URLs against the production backend when
 * running inside the Capacitor native shell. No-op on web.
 *
 * Call exactly once at app startup (from main.tsx). Idempotent.
 */
let nativeFetchInstalled = false;
export function installNativeFetchInterceptor() {
  if (nativeFetchInstalled) return;
  if (typeof window === "undefined") return;
  if (!isNative()) return;
  nativeFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      let urlStr: string | undefined;
      if (typeof input === "string") urlStr = input;
      else if (input instanceof URL) urlStr = input.toString();
      else if (input instanceof Request) urlStr = input.url;

      if (urlStr) {
        // Match /api/... and ./api/... (the Vite BASE_URL-prefixed form
        // resolves to "/api/..." when BASE_URL === "/"); leave absolute
        // URLs and other paths untouched.
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
    } catch {
      /* fall through to original fetch on any unexpected shape */
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}

/**
 * Deep-link scheme registered for the native shell. The auth flow opens the
 * system browser at /api/login?returnTo=skinscreen://auth/callback?code=...
 * and the OS routes the response back into the app.
 */
export const NATIVE_AUTH_SCHEME = "skinscreen://";
export const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";
