/** Synkad med skinscreen `apiFetch` — lagrar server-session id (sid) när cookies saknas (t.ex. Vercel rewrite). */
export const CHIMIQ_SESSION_STORAGE_KEY = "chimiq_session_id";

export function getChimiqStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CHIMIQ_SESSION_STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setChimiqStoredSessionId(sid: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHIMIQ_SESSION_STORAGE_KEY, sid);
  } catch {
    // t.ex. privat läge / fullt lagringsutrymme
  }
}

export function clearChimiqStoredSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHIMIQ_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
