export const COOKIE_CONSENT_VERSION = "1.0";
const STORAGE_KEY = "chimiq.cookie.consent";
const CHANGE_EVENT = "chimiq:cookie-consent-changed";

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface CookieConsentRecord {
  version: string;
  acceptedAt: string;
  categories: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
  };
}

export const DEFAULT_DENIED: CookieConsentRecord["categories"] = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function getStoredCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (
      parsed.version === COOKIE_CONSENT_VERSION &&
      typeof parsed.acceptedAt === "string" &&
      parsed.categories &&
      typeof parsed.categories.analytics === "boolean" &&
      typeof parsed.categories.marketing === "boolean"
    ) {
      return {
        version: parsed.version,
        acceptedAt: parsed.acceptedAt,
        categories: {
          necessary: true,
          analytics: parsed.categories.analytics,
          marketing: parsed.categories.marketing,
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(
  categories: Omit<CookieConsentRecord["categories"], "necessary">,
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    categories: {
      necessary: true,
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
    },
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: record }));
    } catch {
      // storage may be unavailable (private browsing) — proceed regardless
    }
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {}
  }
  return record;
}

const SESSION_DISMISS_KEY = "chimiq.cookie.dismissed";

export function hasMadeCookieChoice(): boolean {
  if (getStoredCookieConsent() !== null) return true;
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(SESSION_DISMISS_KEY)) return true;
    } catch {}
  }
  return false;
}

export function getCategoryConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  const record = getStoredCookieConsent();
  if (!record) return false;
  return !!record.categories[category];
}

export function subscribeCookieConsent(
  listener: (record: CookieConsentRecord | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(getStoredCookieConsent());
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export const REOPEN_COOKIE_BANNER_EVENT = "chimiq:cookie-banner-reopen";

export function reopenCookieBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REOPEN_COOKIE_BANNER_EVENT));
}
