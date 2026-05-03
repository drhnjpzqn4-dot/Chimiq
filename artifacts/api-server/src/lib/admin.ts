/**
 * Single source of truth for "is this request the super admin?".
 *
 * Today the only super admin is `pia@seafari.se`. We hardcode her address
 * as the canonical baseline so a misconfigured or empty `ADMIN_EMAILS`
 * env var can never accidentally lock her out (and, conversely, an
 * over-broad env var can never silently grant admin to someone else
 * unless we explicitly add them).
 *
 * `ADMIN_EMAILS` (comma-separated) still works as an additive override —
 * useful for local dev and tests — but production should leave it unset
 * or set to exactly the super admin's email.
 */
const SUPER_ADMIN_EMAIL = "pia@seafari.se";

export function getAdminEmails(): string[] {
  // In production, admin is strictly locked to the super admin — env config
  // cannot widen the allowlist. Outside production (NODE_ENV !== "production")
  // ADMIN_EMAILS is additive so local dev and the existing recipes test suite
  // (which sets ADMIN_EMAILS="admin@skinscreen.test") keep working.
  if (process.env.NODE_ENV === "production") {
    return [SUPER_ADMIN_EMAIL];
  }
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set<string>([SUPER_ADMIN_EMAIL, ...fromEnv]);
  return Array.from(set);
}

export function getRequestEmail(req: { user?: { email?: string | null } }): string | null {
  const e = req.user?.email;
  return e ? e.trim().toLowerCase() : null;
}

export function isRequestAdmin(req: { user?: { email?: string | null } }): boolean {
  const email = getRequestEmail(req);
  return !!email && getAdminEmails().includes(email);
}
