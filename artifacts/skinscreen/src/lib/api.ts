import { supabase } from "./supabase";

/**
 * Alla anrop till Chimiq-backend ska gå via denna wrapper så att Supabase
 * access token alltid bifogas när en session finns.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const merged = new Headers(
    init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined),
  );
  if (token && !merged.has("Authorization") && !merged.has("authorization")) {
    merged.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers: merged });
}
