export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getRequestEmail(req: { user?: { email?: string | null } }): string | null {
  const e = req.user?.email;
  return e ? e.trim().toLowerCase() : null;
}

export function isRequestAdmin(req: { user?: { email?: string | null } }): boolean {
  const email = getRequestEmail(req);
  return !!email && getAdminEmails().includes(email);
}
