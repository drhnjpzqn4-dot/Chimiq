/**
 * Native (Capacitor) adapter with web fallbacks.
 *
 * Capacitor 6 plugins must be statically importable so the bundler can
 * register them. On web, each plugin's web shim takes over (no-ops or
 * uses standard browser APIs). On native iOS/Android, the JS bridge
 * routes calls into the native implementation registered via `cap sync`.
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
 * URL the user should be sent to in order to manage their Premium subscription.
 * On native this is the canonical web URL — the App Store reader-app guidance
 * prohibits in-app purchase flows for digital subscriptions sold elsewhere.
 */
export const MANAGE_SUBSCRIPTION_WEB_URL =
  "https://app.chimiq.app/pricing";

/**
 * Deep-link scheme registered for the native shell. The auth flow opens the
 * system browser at /api/login?returnTo=skinscreen://auth/callback?code=...
 * and the OS routes the response back into the app.
 */
export const NATIVE_AUTH_SCHEME = "skinscreen://";
export const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";
