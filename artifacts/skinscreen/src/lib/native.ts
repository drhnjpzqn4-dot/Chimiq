/**
 * Native (Capacitor) adapter with web fallbacks.
 *
 * The web build must NOT statically import any @capacitor/* package — those
 * packages are only installed in `mobile/capacitor`. We rely on the global
 * `window.Capacitor` object that Capacitor injects at runtime when the app is
 * loaded inside the native shell, plus dynamic imports gated behind that
 * check so Vite tree-shakes them out of the web bundle.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() ?? "web";
}

/**
 * Open an external URL.
 *
 * On native: uses @capacitor/browser → opens an in-app system browser
 * (SFSafariViewController on iOS, Chrome Custom Tabs on Android). This is
 * required for App Store-compliant OAuth and for Stripe Checkout / Billing.
 *
 * On web: falls back to window.open / location.href.
 */
export async function openExternal(url: string, opts?: { presentation?: "popover" | "fullscreen" }) {
  if (!isNative()) {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
    return;
  }
  try {
    // Indirect specifier so TS doesn't try to resolve @capacitor/browser at
    // compile time — the package is only installed in mobile/capacitor.
    const browserSpec = "@capacitor/browser";
    const mod = (await import(/* @vite-ignore */ browserSpec)) as unknown as {
      Browser: { open: (o: { url: string; presentationStyle?: string }) => Promise<void> };
    };
    await mod.Browser.open({
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
  "https://app.skinscreen.chimiq.com/pricing";

/**
 * Deep-link scheme registered for the native shell. The auth flow opens the
 * system browser at /api/login?returnTo=skinscreen://auth/callback?code=...
 * and the OS routes the response back into the app.
 */
export const NATIVE_AUTH_SCHEME = "skinscreen://";
export const NATIVE_AUTH_CALLBACK = "skinscreen://auth/callback";
