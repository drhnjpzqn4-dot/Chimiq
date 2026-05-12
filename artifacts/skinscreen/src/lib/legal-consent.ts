export const TERMS_VERSION = "1.0";
/** Versioned consent key for the in-app medical disclaimer step (V6). */
export const MEDICAL_DISCLAIMER_VERSION = "medical_disclaimer_v1";

const STORAGE_KEY = "skinscreen.legal.consent";

export interface ConsentRecord {
  version: string;
  acceptedAt: string;
  medicalDisclaimerVersion?: string;
  medicalAcceptedAt?: string;
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

export function hasAcceptedTermsOnly(): boolean {
  const r = getStoredConsent();
  return r !== null && r.version === TERMS_VERSION;
}

export function hasAcceptedMedicalDisclaimer(): boolean {
  const r = getStoredConsent();
  return (
    r !== null &&
    r.medicalDisclaimerVersion === MEDICAL_DISCLAIMER_VERSION
  );
}

/** True when both current terms and the medical disclaimer have been accepted locally. */
export function hasAcceptedCurrentTerms(): boolean {
  return hasAcceptedTermsOnly() && hasAcceptedMedicalDisclaimer();
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

export function saveMedicalDisclaimerConsent(): ConsentRecord {
  const prev = getStoredConsent();
  if (!prev || prev.version !== TERMS_VERSION) {
    throw new Error("Cannot record medical consent before terms consent.");
  }
  const record: ConsentRecord = {
    ...prev,
    medicalDisclaimerVersion: MEDICAL_DISCLAIMER_VERSION,
    medicalAcceptedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // ignore
    }
  }
  return record;
}

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

export async function postMedicalDisclaimerServerConsent(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/legal/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ version: MEDICAL_DISCLAIMER_VERSION }),
    });
  } catch {
    // ignore
  }
}

export interface ServerConsentStatus {
  acceptedVersion: string | null;
  currentVersion: string;
  acceptedAt: string | null;
  acceptedMedicalDisclaimerVersion: string | null;
  acceptedMedicalDisclaimerAt: string | null;
  currentMedicalDisclaimerVersion: string;
}

/** Mirror server-side consent into localStorage when the user is signed in. */
export function applyServerConsentToLocalStorage(status: ServerConsentStatus): void {
  if (typeof window === "undefined") return;
  if (status.acceptedVersion !== TERMS_VERSION) return;

  const record: ConsentRecord = {
    version: TERMS_VERSION,
    acceptedAt:
      status.acceptedAt ?? new Date().toISOString(),
  };
  if (status.acceptedMedicalDisclaimerVersion === MEDICAL_DISCLAIMER_VERSION) {
    record.medicalDisclaimerVersion = MEDICAL_DISCLAIMER_VERSION;
    record.medicalAcceptedAt =
      status.acceptedMedicalDisclaimerAt ?? new Date().toISOString();
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

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
