/// <reference types="vite-plugin-pwa/client" />

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) {
    return;
  }
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;
        setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );
      },
    });
  });
}
