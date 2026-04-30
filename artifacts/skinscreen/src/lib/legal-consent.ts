export const TERMS_VERSION = "1.0";
const STORAGE_KEY = "skinscreen.legal.consent";

export interface ConsentRecord {
  version: string;
  acceptedAt: string;
}

export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.version === TERMS_VERSION && typeof parsed.acceptedAt === "string") {
      return parsed as ConsentRecord;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(): ConsentRecord {
  const record: ConsentRecord = {
    version: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // storage may be unavailable (private browsing) — proceed regardless
    }
  }
  return record;
}

export function hasAcceptedCurrentTerms(): boolean {
  return getStoredConsent() !== null;
}
