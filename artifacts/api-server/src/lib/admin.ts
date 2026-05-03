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
  // Strict, unconditional lock — admin access is only ever granted to
  // the hardcoded super admin email, in every environment. ADMIN_EMAILS
  // env config is intentionally ignored so a misconfigured deploy can
  // never widen the allowlist.
  return [SUPER_ADMIN_EMAIL];
}

export function getRequestEmail(req: { user?: { email?: string | null } }): string | null {
  const e = req.user?.email;
  return e ? e.trim().toLowerCase() : null;
}

export function isRequestAdmin(req: { user?: { email?: string | null } }): boolean {
  const email = getRequestEmail(req);
  return !!email && getAdminEmails().includes(email);
}
