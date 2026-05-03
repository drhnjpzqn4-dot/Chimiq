export type BillingPeriod = "monthly" | "yearly";

const STORAGE_KEY = "skinscreen.billingPreference";

export function getStoredBillingPreference(): BillingPeriod {
  if (typeof window === "undefined") return "monthly";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "monthly" || stored === "yearly") return stored;
  } catch {
    // Ignore storage access errors (e.g. disabled cookies, private mode).
  }
  return "monthly";
}

export function setStoredBillingPreference(value: BillingPeriod): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage write errors.
  }
}
