import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNative, NATIVE_AUTH_CALLBACK } from "@/lib/native";

/**
 * Listens for the appUrlOpen Capacitor event and routes the deep-link path
 * back into the SPA. No-op on web.
 *
 * Flow:
 *   1. User taps "Sign in" inside the native shell.
 *   2. We open the system browser at `/api/login?returnTo=<callback>`.
 *   3. Replit Auth completes, server 302s to `skinscreen://auth/callback?...`.
 *   4. iOS / Android route that URL into the app and fire `appUrlOpen`.
 *   5. We close the in-app browser, replace history, and refresh the session.
 *
 * The actual session-cookie-vs-token reconciliation between the system browser
 * and the in-app webview is handled server-side via /api/auth/native/exchange
 * (see future task #66 — for v1 we rely on shared cookies via Custom Tabs on
 * Android and ASWebAuthenticationSession on iOS, which both share Safari's
 * cookie jar with the embedded webview when configured correctly).
 */
export function useNativeAuthDeepLink(onAuthReturn?: () => void) {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const handle = await App.addListener(
          "appUrlOpen",
          async ({ url }: URLOpenListenerEvent) => {
            if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return;
            try {
              await Browser.close();
            } catch {
              /* browser may already be closed */
            }
            // Strip the known scheme prefix and use any remainder as the SPA
            // target. Custom-scheme URLs don't parse cleanly with `new URL` —
            // hostname becomes the first path segment ("auth") and pathname
            // becomes "/callback", so we derive the route by prefix instead.
            try {
              const remainder = url.slice(NATIVE_AUTH_CALLBACK.length);
              let target = "/app";
              if (remainder.startsWith("?")) {
                target = `/app${remainder}`;
              } else if (remainder.startsWith("/")) {
                target = remainder;
              }
              window.history.replaceState({}, "", target);
              window.dispatchEvent(new PopStateEvent("popstate"));
            } catch {
              window.location.href = "/app";
            }
            onAuthReturn?.();
          },
        );

        cleanup = () => {
          handle.remove().catch(() => undefined);
        };
      } catch {
        /* not running on native or plugins not available — safe no-op */
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [onAuthReturn]);
}
