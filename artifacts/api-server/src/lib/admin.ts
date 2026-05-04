/**
 * Single source of truth for "is this request the super admin?".
 *
 * Admin access is locked to one human: pia@chimiq.com. Configuration
 * lives in the `ADMIN_EMAILS` env var (comma-separated, normalized to
 * lowercase) but is **strictly validated** against the hardcoded super
 * admin baseline:
 *
 *   - If ADMIN_EMAILS is unset/empty → admin = [SUPER_ADMIN_EMAIL].
 *   - If every entry in ADMIN_EMAILS normalizes to SUPER_ADMIN_EMAIL →
 *     admin = [SUPER_ADMIN_EMAIL].
 *   - Otherwise (any other email present) → admin = [] AND we log a
 *     warning. We fail closed: the misconfiguration cannot widen
 *     access; it just locks Pia out until it's fixed, which is a
 *     loud, observable failure mode (admin pages 403) rather than a
 *     silent privilege escalation.
 */
const SUPER_ADMIN_EMAIL = "pia@chimiq.com";

let warnedOnce = false;

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const entries = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) {
    return [SUPER_ADMIN_EMAIL];
  }
  const everythingMatches = entries.every((e) => e === SUPER_ADMIN_EMAIL);
  if (everythingMatches) {
    return [SUPER_ADMIN_EMAIL];
  }
  if (!warnedOnce) {
    warnedOnce = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[admin] ADMIN_EMAILS contains entries other than ${SUPER_ADMIN_EMAIL}; ignoring and denying admin access until fixed.`,
    );
  }
  return [];
}

export function getRequestEmail(req: { user?: { email?: string | null } }): string | null {
  const e = req.user?.email;
  return e ? e.trim().toLowerCase() : null;
}

export function isRequestAdmin(req: { user?: { email?: string | null } }): boolean {
  const email = getRequestEmail(req);
  return !!email && getAdminEmails().includes(email);
}
