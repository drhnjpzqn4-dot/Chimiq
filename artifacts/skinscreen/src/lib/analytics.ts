import {
  getCategoryConsent,
  subscribeCookieConsent,
} from "./cookie-consent";

const GA_MEASUREMENT_ID = (import.meta as { env?: { VITE_GA_MEASUREMENT_ID?: string } })
  .env?.VITE_GA_MEASUREMENT_ID;
const META_PIXEL_ID = (import.meta as { env?: { VITE_META_PIXEL_ID?: string } })
  .env?.VITE_META_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
  }
}

let gaLoaded = false;
let metaLoaded = false;

function loadGoogleAnalytics(): void {
  if (gaLoaded || !GA_MEASUREMENT_ID || typeof document === "undefined") return;
  gaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
  });
}

function loadMetaPixel(): void {
  if (metaLoaded || !META_PIXEL_ID || typeof document === "undefined") return;
  metaLoaded = true;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable @typescript-eslint/no-explicit-any */

  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
}

/**
 * Initialize analytics scripts based on current consent. Safe to call multiple
 * times — script loaders are idempotent.
 */
export function applyConsentedAnalytics(): void {
  if (getCategoryConsent("analytics")) loadGoogleAnalytics();
  if (getCategoryConsent("marketing")) loadMetaPixel();
}

/**
 * Wire up consent listener so analytics start the moment the user accepts.
 * Call once at app boot.
 */
export function startAnalyticsLoader(): () => void {
  applyConsentedAnalytics();
  return subscribeCookieConsent(() => applyConsentedAnalytics());
}

/** Track a custom event on whichever analytics platforms have consent. */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (getCategoryConsent("analytics") && window.gtag) {
    window.gtag("event", name, params || {});
  }
  if (getCategoryConsent("marketing") && window.fbq) {
    window.fbq("trackCustom", name, params || {});
  }
}

/** Track a Meta Pixel standard event (e.g. "Purchase", "Lead", "CompleteRegistration"). */
export function trackMetaStandard(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (getCategoryConsent("marketing") && window.fbq) {
    window.fbq("track", name, params || {});
  }
}

export const ANALYTICS_CONFIGURED = {
  ga: !!GA_MEASUREMENT_ID,
  meta: !!META_PIXEL_ID,
};
