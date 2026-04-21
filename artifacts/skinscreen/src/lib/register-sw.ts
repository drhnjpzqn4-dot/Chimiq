/// <reference types="vite-plugin-pwa/client" />

type Listener = () => void;

let updateAvailable = false;
let triggerUpdate: ((reload: boolean) => Promise<void>) | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      // swallow listener errors so a faulty subscriber can't break SW flow
    }
  }
}

/**
 * Subscribe to "new app version available" events. Returns an unsubscribe fn.
 * Call `isUpdateAvailable()` from the listener to read current state.
 */
export function onSwUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isUpdateAvailable(): boolean {
  return updateAvailable;
}

/**
 * Activate the waiting service worker (if any) and reload the page so the
 * new bundle takes effect. Safe to call when no update is pending — it just
 * resolves with no-op.
 */
export async function applySwUpdate(): Promise<void> {
  if (!triggerUpdate) {
    // Fallback: hard reload — works even when SW lookup hasn't completed.
    window.location.reload();
    return;
  }
  await triggerUpdate(true);
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) {
    return;
  }
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateAvailable = true;
        emit();
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Poll for updates hourly so long-running PWA sessions still see new
        // releases without a manual refresh.
        setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
      },
    });
    triggerUpdate = updateSW;
  });
}
