import {
  CHIMIQ_SESSION_STORAGE_KEY,
  getChimiqStoredSessionId,
  setChimiqStoredSessionId,
  clearChimiqStoredSessionId,
} from "@workspace/replit-auth-web";
import { getApiBaseUrl, NATIVE_API_BASE_URL } from "./native";

export {
  CHIMIQ_SESSION_STORAGE_KEY,
  getChimiqStoredSessionId,
  setChimiqStoredSessionId,
  clearChimiqStoredSessionId,
};

/** Origins där vi får skicka Bearer sid (undvik att läcka token till tredjeparts-URL:er). */
function collectTrustedApiOrigins(): Set<string> {
  const origins = new Set<string>();
  if (typeof window !== "undefined") {
    origins.add(window.location.origin);
  }
  const viteBase = getApiBaseUrl();
  if (viteBase) {
    try {
      origins.add(new URL(viteBase).origin);
    } catch {
      // ignore
    }
  }
  try {
    origins.add(new URL(NATIVE_API_BASE_URL).origin);
  } catch {
    // ignore
  }
  return origins;
}

function shouldAttachBearerToRequestUrl(urlStr: string): boolean {
  if (typeof window === "undefined") return false;
  let u: URL;
  try {
    u = new URL(urlStr, window.location.origin);
  } catch {
    return false;
  }
  const path = u.pathname;
  const isApiPath = path === "/api" || path.startsWith("/api/");
  if (!isApiPath) return false;
  return collectTrustedApiOrigins().has(u.origin);
}

let bearerInterceptorInstalled = false;

/**
 * Wrappar `window.fetch` så att `Authorization: Bearer <sid>` läggs på anrop till
 * vår `/api` på betrodda origins när `chimiq_session_id` finns i localStorage.
 * Körs efter `installNativeFetchInterceptor()` i main.tsx.
 */
export function installBearerAuthInterceptor(): void {
  if (typeof window === "undefined" || bearerInterceptorInstalled) return;
  bearerInterceptorInstalled = true;

  const previous = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const token = getChimiqStoredSessionId();
    if (!token) {
      return previous(input, init);
    }

    let urlStr = "";
    if (typeof input === "string") urlStr = input;
    else if (input instanceof URL) urlStr = input.toString();
    else if (input instanceof Request) urlStr = input.url;

    if (!urlStr || !shouldAttachBearerToRequestUrl(urlStr)) {
      return previous(input, init);
    }

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (input instanceof Request) {
      return previous(new Request(input, { ...init, headers }));
    }
    return previous(input, { ...init, headers });
  }) as typeof window.fetch;
}

/**
 * Central API-fetch: samma Bearer-logik som interceptorn, men explicit när du
 * vill undvika global `fetch`-patch (t.ex. i tester).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = getChimiqStoredSessionId();
  if (!token) {
    return window.fetch(input, init);
  }

  let urlStr = "";
  if (typeof input === "string") urlStr = input;
  else if (input instanceof URL) urlStr = input.toString();
  else if (input instanceof Request) urlStr = input.url;

  if (!urlStr || !shouldAttachBearerToRequestUrl(urlStr)) {
    return window.fetch(input, init);
  }

  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (input instanceof Request) {
    return window.fetch(new Request(input, { ...init, headers }));
  }
  return window.fetch(input, { ...init, headers });
}
