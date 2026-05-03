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

/**
 * Best-effort POST to the server so we have an audit trail of acceptance
 * (#101). Fire-and-forget — we don't block the UI on the network call,
 * because we already wrote the local record before this runs. Errors are
 * swallowed so a flaky network never traps the user behind the consent
 * modal after they've accepted.
 */
export async function postServerConsent(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/legal/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ version: TERMS_VERSION }),
    });
  } catch {
    // ignore — local consent already persisted
  }
}

export interface ServerConsentStatus {
  acceptedVersion: string | null;
  currentVersion: string;
  acceptedAt: string | null;
}

/**
 * Read the server's record of consent for the current user. Returns null when
 * unauthenticated or on network failure — the caller should fall back to the
 * device-local check.
 */
export async function fetchServerConsent(): Promise<ServerConsentStatus | null> {
  if (typeof window === "undefined") return null;
  try {
    const r = await fetch("/api/legal/consent", { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as ServerConsentStatus;
  } catch {
    return null;
  }
}
