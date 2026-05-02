import { useEffect } from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNative, NATIVE_AUTH_CALLBACK } from "@/lib/native";

/**
 * Listens for Capacitor's appUrlOpen event and routes our deep-link callback
 * back into the SPA. No-op on web.
 *
 * Flow: native sign-in opens the system browser at /api/login, server 302s
 * to skinscreen://auth/callback?..., the OS routes that URL into the app
 * and fires appUrlOpen — we close the in-app browser and refresh the SPA.
 */
export function useNativeAuthDeepLink(onAuthReturn?: () => void) {
  useEffect(() => {
    if (!isNative()) return;

    let cleanup: (() => void) | undefined;

    App.addListener("appUrlOpen", async ({ url }: URLOpenListenerEvent) => {
      if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return;
      Browser.close().catch(() => undefined);

      // Custom-scheme URLs don't parse cleanly via `new URL` — derive the
      // SPA target by stripping the known prefix.
      const remainder = url.slice(NATIVE_AUTH_CALLBACK.length);
      const target = remainder.startsWith("?")
        ? `/app${remainder}`
        : remainder.startsWith("/")
          ? remainder
          : "/app";
      window.history.replaceState({}, "", target);
      window.dispatchEvent(new PopStateEvent("popstate"));
      onAuthReturn?.();
    }).then((handle) => {
      cleanup = () => {
        handle.remove().catch(() => undefined);
      };
    });

    return () => {
      cleanup?.();
    };
  }, [onAuthReturn]);
}
